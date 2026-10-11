import "server-only";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";

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

export class UploadError extends Error {
  // code: TOO_LARGE | BAD_SIGNATURE | EMPTY
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// 업로드 본문(스트림)을 메모리에 모으지 않고 받는 즉시 파일로 씀. 메모리 사용량이 파일 크기와 무관하게 일정
// - 파일 앞부분이 들어오자마자 실제 형식(시그니처)을 확인
// - maxBytes를 넘으면 저장을 멈추고 쓰던 파일을 지움
// - 거부한 뒤에도 남은 본문은 끝까지 받아서 버림. 다 받은 요청을 중간에 끊으면 Next 내부에서
//   처리되지 않은 오류(ReadableStream is already closed)가 나서 서버가 멈출 수 있음.
//   단, 버리는 양이 maxBytes를 넘으면(크기를 속인 계속되는 전송) 그때는 끊음
export async function saveUploadStream(webStream, { extension, mimeType, maxBytes }) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  const out = createWriteStream(resolveUpload(fileName), { flags: "wx" });
  out.on("error", () => {}); // 쓰기 오류는 아래 write/end에서 처리
  const reader = webStream.getReader();

  let size = 0;
  let head = Buffer.alloc(0);
  let checked = false;
  let failure = null;
  let discarded = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value.buffer, value.byteOffset, value.byteLength);

      if (failure) {
        discarded += chunk.length;
        if (discarded > maxBytes) {
          await reader.cancel().catch(() => {});
          break;
        }
        continue;
      }

      size += chunk.length;
      if (size > maxBytes) {
        failure = new UploadError("TOO_LARGE");
        out.destroy();
        continue;
      }
      if (!checked) {
        head = Buffer.concat([head, chunk]);
        if (head.length >= 12) {
          if (!matchesSignature(head, mimeType)) {
            failure = new UploadError("BAD_SIGNATURE");
            out.destroy();
            continue;
          }
          checked = true;
        }
      }
      // 디스크가 따라오지 못하면 잠시 기다림 (메모리에 쌓이지 않도록)
      if (!out.write(chunk)) await once(out, "drain");
    }

    if (!failure && size === 0) failure = new UploadError("EMPTY");
    if (!failure && !checked && !matchesSignature(head, mimeType)) failure = new UploadError("BAD_SIGNATURE");
    if (failure) throw failure;

    await new Promise((resolve, reject) => out.end((error) => (error ? reject(error) : resolve())));
    return { fileName, size };
  } catch (error) {
    // 파일 열기는 비동기라, 완전히 닫힌 뒤에 지워야 삭제 후 다시 생기는 일이 없음
    out.destroy();
    if (!out.closed) await once(out, "close").catch(() => {});
    await removeUpload(fileName);
    throw error;
  }
}

export async function removeUpload(fileName) {
  // Windows에서 파일이 막 닫히는 중이면 삭제가 잠시 실패할 수 있어 몇 번 재시도
  await rm(resolveUpload(fileName), { force: true, maxRetries: 5, retryDelay: 50 }).catch(() => {});
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
