import "server-only";
import { AwsClient } from "aws4fetch";

// Cloudflare R2 (S3 호환) 연동. 환경 변수:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// 객체 키 규칙: pending/<파일명>(업로드 직후, 1일 뒤 자동 삭제 규칙 권장), media/<파일명>(검증 완료)

export function isR2Configured(env = process.env) {
  return Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET);
}

let client;

function config() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  client ??= new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  return { client, base: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}` };
}

// 키의 각 부분을 주소용으로 인코딩 (슬래시는 유지)
function objectUrl(key) {
  const { base } = config();
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

const toDatetime = (ms) => new Date(ms).toISOString().replace(/[:-]|\.\d{3}/g, "");

// 브라우저가 직접 파일을 올릴 수 있는 서명된 주소(PUT).
// Content-Type과 Content-Length를 서명에 포함하므로, 허가받은 형식·크기와 다르게 보내면 R2가 거부함
export async function presignPut(key, { contentType, size, expiresSec = 900 }) {
  const { client } = config();
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  const signed = await client.sign(
    new Request(url, { method: "PUT", headers: { "Content-Type": contentType, "Content-Length": String(size) } }),
    { aws: { signQuery: true, allHeaders: true } },
  );
  return { url: signed.url, headers: { "Content-Type": contentType } };
}

// 보기용 서명된 주소(GET). 같은 시간대(1시간 단위)에는 같은 주소가 나오도록 서명 시각을 내림 →
// 브라우저가 이미지를 다시 받지 않고 캐시를 재사용할 수 있음. 유효 시간은 최소 1시간
export async function presignGet(key, now = Date.now()) {
  const { client } = config();
  const HOUR = 3_600_000;
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(2 * 3600));
  const signed = await client.sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true, datetime: toDatetime(Math.floor(now / HOUR) * HOUR) },
  });
  return signed.url;
}

async function call(method, key, { headers, signal } = {}) {
  const { client } = config();
  return client.fetch(objectUrl(key), { method, headers, signal });
}

// 객체 정보. 없으면 null
export async function headObject(key) {
  const res = await call("HEAD", key);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 HEAD ${res.status}`);
  return { size: Number(res.headers.get("content-length")), contentType: res.headers.get("content-type") };
}

// 앞부분 n바이트 (형식 확인용)
export async function readHead(key, bytes = 12) {
  const res = await call("GET", key, { headers: { Range: `bytes=0-${bytes - 1}` } });
  if (!res.ok) throw new Error(`R2 GET ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function copyObject(fromKey, toKey) {
  const { base } = config();
  const bucketPath = new URL(base).pathname; // /<bucket>
  const source = `${bucketPath}/${fromKey.split("/").map(encodeURIComponent).join("/")}`;
  const res = await call("PUT", toKey, { headers: { "x-amz-copy-source": source } });
  if (!res.ok) throw new Error(`R2 COPY ${res.status}`);
}

export async function deleteObject(key) {
  const res = await call("DELETE", key);
  // 이미 없는 경우(404)도 성공으로 취급
  if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${res.status}`);
}
