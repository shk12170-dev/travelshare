import "server-only";
import { BlobNotFoundError, del, head } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

// Vercel Blob 연동 (결제 수단 없이 쓸 수 있는 Vercel 자체 파일 저장소)
// 환경 변수: BLOB_READ_WRITE_TOKEN — Vercel 대시보드에서 Blob 저장소를 프로젝트에 연결하면 자동으로 설정됨
// 저장소는 "Public"으로 만들어야 브라우저가 파일 주소로 바로 볼 수 있음

// 업로드한 파일을 CDN에 캐시하는 시간. 짧게 두어 삭제한 파일이 오래 남지 않게 함
const CACHE_SECONDS = 3600;

export function isBlobConfigured(env = process.env) {
  return Boolean(env.BLOB_READ_WRITE_TOKEN);
}

// 공개 파일 주소: https://<저장소ID>.public.blob.vercel-storage.com/<경로>
// (토큰 형식 vercel_blob_rw_<저장소ID>_<비밀값> 에서 저장소 ID를 꺼냄 — @vercel/blob 내부 방식과 동일)
export function blobPublicUrl(pathname, env = process.env) {
  const storeId = env.BLOB_READ_WRITE_TOKEN.split("_")[3];
  return `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com/${pathname}`;
}

// 브라우저가 이 경로 한 곳에, 이 형식·크기 이하로만 올릴 수 있는 일회용 토큰 (15분 유효)
export async function createClientToken(pathname, { contentType, maxBytes }, now = Date.now()) {
  return generateClientTokenFromReadWriteToken({
    token: process.env.BLOB_READ_WRITE_TOKEN,
    pathname,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: maxBytes,
    validUntil: now + 15 * 60_000,
    addRandomSuffix: false,
    allowOverwrite: false,
    cacheControlMaxAge: CACHE_SECONDS,
  });
}

// 파일 정보. 없으면 null
export async function headBlob(pathname) {
  try {
    const info = await head(pathname);
    return { size: info.size, contentType: info.contentType, url: info.url };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

// 파일 앞부분 n바이트 (형식 확인용)
export async function readBlobHead(url, bytes = 12) {
  const res = await fetch(url, { headers: { Range: `bytes=0-${bytes - 1}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Blob GET ${res.status}`);
  return Buffer.from(await res.arrayBuffer()).subarray(0, bytes);
}

export async function deleteBlob(pathname) {
  await del(pathname);
}
