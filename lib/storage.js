import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// 업로드 파일 저장 위치 (Git에서 제외). UPLOAD_DIR 환경 변수로 바꿀 수 있음(E2E 테스트 등)
// 운영 환경에서는 클라우드 스토리지로 교체 예정
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? process.cwd() + path.sep + path.normalize(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "storage", "uploads");

// 서버가 만든 이름만 허용해 경로 조작(../ 등)을 막음
const SAFE_NAME = /^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

export function resolveUpload(fileName) {
  if (!SAFE_NAME.test(fileName)) throw new Error("잘못된 파일 이름");
  // path.join 대신 문자열로 합침: 빌드 도구가 프로젝트 전체를 서버 파일에 포함하지 않도록 (이름은 위에서 검증됨)
  return UPLOAD_DIR + path.sep + fileName;
}

export async function saveUpload(buffer, extension) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  await writeFile(resolveUpload(fileName), buffer);
  return fileName;
}

export async function removeUpload(fileName) {
  await unlink(resolveUpload(fileName)).catch(() => {});
}

// 파일 앞부분으로 실제 형식을 확인 (확장자·MIME 위조 방지)
export function matchesSignature(buffer, mimeType) {
  const hex = buffer.subarray(0, 12).toString("hex");
  const ascii = buffer.subarray(0, 12).toString("latin1");
  switch (mimeType) {
    case "image/jpeg":
      return hex.startsWith("ffd8ff");
    case "image/png":
      return hex.startsWith("89504e470d0a1a0a");
    case "image/gif":
      return ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a");
    case "image/webp":
      return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
    case "video/mp4":
    case "video/quicktime":
      return ascii.slice(4, 8) === "ftyp";
    case "video/webm":
      return hex.startsWith("1a45dfa3");
    default:
      return false;
  }
}
