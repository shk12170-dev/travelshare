import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// 업로드 허가증. 서버가 "이 사용자가 이 이름의 파일을 이 내용으로 올려도 됨"을 서명해서 발급하고,
// 업로드가 끝나면 같은 허가증으로 등록을 요청합니다. 브라우저가 내용(설명·지역·파일 이름 등)을 바꿀 수 없습니다.

const TTL_MS = 30 * 60_000;

function secret() {
  const value = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET이 설정되지 않았습니다.");
  return "dev-only-upload-secret";
}

function sign(payload) {
  return createHmac("sha256", `upload-token:${secret()}`).update(payload).digest("base64url");
}

// payload: { key, uid, mime, type, caption, region, size }
export function createUploadToken(payload, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: now + TTL_MS })).toString("base64url");
  return `${body}.${sign(body)}`;
}

// 올바른 허가증이면 payload, 아니면 null
export function verifyUploadToken(token, now = Date.now()) {
  if (typeof token !== "string") return null;
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
