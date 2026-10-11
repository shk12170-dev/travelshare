import "server-only";
import { randomUUID } from "node:crypto";
import * as r2 from "./r2";
import { matchesSignature, removeUpload, statUpload } from "./storage";
import { allowedMimeTypes, maxUploadBytes } from "./validation";

// 업로드 파일 보관 방식. R2 환경 변수가 있으면 R2(배포), 없으면 로컬 폴더(개발·테스트)
//
// 업로드 흐름 (두 방식 모두 같은 단계):
//   1) createUpload   서버가 검사하고 허가증과 올릴 주소를 발급
//   2) 브라우저가 그 주소로 파일을 직접 올림 (R2는 서버를 거치지 않음)
//   3) finalizeUpload 서버가 올라온 파일의 크기·형식을 확인하고 정식 위치로 옮김
export const driver = () => (r2.isR2Configured() ? "r2" : "local");

export class MediaError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// 허가증에 넣을 내용과 올릴 주소 만들기. file: { mimeType, size }
export async function createUpload({ mimeType, size }) {
  const extension = allowedMimeTypes[mimeType];
  if (!extension) throw new MediaError("JPG, PNG, WEBP, GIF 사진 또는 MP4, WEBM, MOV 영상만 올릴 수 있습니다.", 415);
  const max = maxUploadBytes(mimeType);
  if (!Number.isInteger(size) || size <= 0) throw new MediaError("빈 파일입니다.");
  if (size > max) {
    throw new MediaError(`${mimeType.startsWith("image/") ? "사진" : "영상"}은 ${max / 1024 / 1024}MB 이하만 가능합니다.`, 413);
  }

  const fileName = `${randomUUID()}.${extension}`;
  if (driver() === "r2") {
    const put = await r2.presignPut(`pending/${fileName}`, { contentType: mimeType, size });
    return { fileName, upload: { method: "PUT", url: put.url, headers: put.headers } };
  }
  // 로컬: 우리 서버의 업로드 주소 (주소는 허가증을 받은 뒤에 클라이언트가 붙임)
  return { fileName, upload: { method: "PUT", url: null, headers: { "Content-Type": mimeType } } };
}

// 업로드가 끝난 파일 확인. 문제가 있으면 파일을 지우고 MediaError. 성공하면 { size }
export async function finalizeUpload({ fileName, mimeType }) {
  const max = maxUploadBytes(mimeType);

  if (driver() === "r2") {
    const pendingKey = `pending/${fileName}`;
    const info = await r2.headObject(pendingKey);
    if (!info) throw new MediaError("업로드된 파일을 찾을 수 없습니다. 다시 올려 주세요.", 404);
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

  const info = await statUpload(fileName);
  if (!info) throw new MediaError("업로드된 파일을 찾을 수 없습니다. 다시 올려 주세요.", 404);
  return { size: info.size };
}

export async function deleteMedia(fileName) {
  if (!fileName) return;
  if (driver() === "r2") {
    await r2.deleteObject(`media/${fileName}`).catch((error) => console.error("R2 삭제 실패", fileName, error));
    return;
  }
  await removeUpload(fileName);
}

// 보기용 주소. R2는 서명된 주소로 이동, 로컬은 null(서버가 직접 파일을 보냄)
export async function viewUrl(fileName) {
  return driver() === "r2" ? r2.presignGet(`media/${fileName}`) : null;
}
