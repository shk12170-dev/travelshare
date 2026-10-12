import "server-only";
import { randomUUID } from "node:crypto";
import * as blob from "./blob";
import * as r2 from "./r2";
import { matchesSignature, removeUpload, statUpload } from "./storage";
import { allowedMimeTypes, maxUploadBytes } from "./validation";
import { isCloudMode } from "@/prisma/cloud.mjs";

// 업로드 파일 보관 방식 (자동 선택)
// - 클라우드 사용 시(Vercel에서 실행, 또는 USE_CLOUD=1):
//   "r2" Cloudflare R2 (R2_* 4개 설정 시) → 없으면 "blob" Vercel Blob (BLOB_READ_WRITE_TOKEN 설정 시)
// - 그 밖(PC에서 개발·테스트): "local" PC 폴더 — .env에 키가 있어도 실제 저장소를 건드리지 않음
//
// 업로드 흐름 (세 방식 모두 같은 단계):
//   1) createUpload   서버가 검사하고 허가증과 올릴 곳을 발급
//   2) 브라우저가 그곳에 파일을 직접 올림 (R2·Blob은 우리 서버를 거치지 않음)
//   3) finalizeUpload 서버가 올라온 파일의 크기·형식을 확인 (문제가 있으면 삭제)
export const driver = () => {
  if (!isCloudMode()) return "local";
  if (r2.isR2Configured()) return "r2";
  if (blob.isBlobConfigured()) return "blob";
  return "none";
};

export class MediaError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const NOT_FOUND = "업로드된 파일을 찾을 수 없습니다. 다시 올려 주세요.";
const NO_STORAGE = "사진·영상 올리기는 저장소 연결을 준비 중입니다.";

// 허가증에 넣을 내용과 올릴 곳 만들기. file: { mimeType, size }
export async function createUpload({ mimeType, size }) {
  const extension = allowedMimeTypes[mimeType];
  if (!extension) throw new MediaError("JPG, PNG, WEBP, GIF 사진 또는 MP4, WEBM, MOV 영상만 올릴 수 있습니다.", 415);
  const max = maxUploadBytes(mimeType);
  if (!Number.isInteger(size) || size <= 0) throw new MediaError("빈 파일입니다.");
  if (size > max) {
    throw new MediaError(`${mimeType.startsWith("image/") ? "사진" : "영상"}은 ${max / 1024 / 1024}MB 이하만 가능합니다.`, 413);
  }

  const fileName = `${randomUUID()}.${extension}`;
  switch (driver()) {
    case "none":
      throw new MediaError(NO_STORAGE, 503);
    case "r2": {
      const put = await r2.presignPut(`pending/${fileName}`, { contentType: mimeType, size });
      return { fileName, upload: { method: "PUT", url: put.url, headers: put.headers } };
    }
    case "blob": {
      // 이 경로·형식·크기(허가받은 크기 이하)로만 올릴 수 있는 일회용 토큰
      const pathname = `media/${fileName}`;
      const token = await blob.createClientToken(pathname, { contentType: mimeType, maxBytes: size });
      return { fileName, upload: { method: "blob", pathname, token, contentType: mimeType } };
    }
    default:
      // 로컬: 우리 서버의 업로드 주소 (주소는 허가증을 받은 뒤에 붙임)
      return { fileName, upload: { method: "PUT", url: null, headers: { "Content-Type": mimeType } } };
  }
}

// 업로드가 끝난 파일 확인. 문제가 있으면 파일을 지우고 MediaError. 성공하면 { size }
export async function finalizeUpload({ fileName, mimeType }) {
  const max = maxUploadBytes(mimeType);

  switch (driver()) {
    case "none":
      throw new MediaError(NO_STORAGE, 503);
    case "r2": {
      const pendingKey = `pending/${fileName}`;
      const info = await r2.headObject(pendingKey);
      if (!info) throw new MediaError(NOT_FOUND, 404);
      const reject = async (message, status = 400) => {
        await r2.deleteObject(pendingKey).catch(() => {});
        throw new MediaError(message, status);
      };
      if (info.size === 0) await reject("빈 파일입니다.");
      if (info.size > max) await reject("파일이 너무 큽니다.", 413);
      // 서명에 형식을 넣었지만 파일 내용 자체도 확인 (확장자·형식 위조 방지)
      const head = await r2.readHead(pendingKey, 12);
      if (!matchesSignature(head, mimeType)) await reject("파일 내용이 형식과 맞지 않습니다.");

      await r2.copyObject(pendingKey, `media/${fileName}`);
      await r2.deleteObject(pendingKey).catch(() => {});
      return { size: info.size };
    }
    case "blob": {
      const pathname = `media/${fileName}`;
      const info = await blob.headBlob(pathname);
      if (!info) throw new MediaError(NOT_FOUND, 404);
      const reject = async (message, status = 400) => {
        await blob.deleteBlob(pathname).catch(() => {});
        throw new MediaError(message, status);
      };
      if (info.size === 0) await reject("빈 파일입니다.");
      if (info.size > max) await reject("파일이 너무 큽니다.", 413);
      if (info.contentType !== mimeType) await reject("허가받은 파일 형식과 다릅니다.", 415);
      // 토큰으로 형식을 제한했지만 파일 내용 자체도 확인 (확장자·형식 위조 방지)
      const head = await blob.readBlobHead(info.url, 12);
      if (!matchesSignature(head, mimeType)) await reject("파일 내용이 형식과 맞지 않습니다.");
      return { size: info.size };
    }
    default: {
      const info = await statUpload(fileName);
      if (!info) throw new MediaError(NOT_FOUND, 404);
      return { size: info.size };
    }
  }
}

export async function deleteMedia(fileName) {
  if (!fileName) return;
  switch (driver()) {
    case "r2":
      await r2.deleteObject(`media/${fileName}`).catch((error) => console.error("R2 삭제 실패", fileName, error));
      return;
    case "blob":
      await blob.deleteBlob(`media/${fileName}`).catch((error) => console.error("Blob 삭제 실패", fileName, error));
      return;
    case "none":
      console.error("저장소가 설정되지 않아 파일을 지우지 못했습니다", fileName);
      return;
    default:
      await removeUpload(fileName);
  }
}

// 보기용 주소. R2는 서명된 주소, Blob은 공개 주소로 이동. 로컬은 null(서버가 직접 파일을 보냄)
export async function viewUrl(fileName) {
  switch (driver()) {
    case "r2":
      return r2.presignGet(`media/${fileName}`);
    case "blob":
      return blob.blobPublicUrl(`media/${fileName}`);
    default:
      return null; // 로컬은 서버가 직접 전송, 저장소 미설정이면 파일 없음(404)
  }
}
