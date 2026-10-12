import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Vercel Blob SDK를 가짜로 바꿔 서버 판단 로직만 검증 (실제 Blob에는 접속하지 않음)
const store = new Map();
const deleted = [];
vi.mock("@vercel/blob", () => {
  class BlobNotFoundError extends Error {}
  return {
    BlobNotFoundError,
    head: vi.fn(async (pathname) => {
      const item = store.get(pathname);
      if (!item) throw new BlobNotFoundError("not found");
      return { size: item.size, contentType: item.contentType, url: `https://fake.blob/${pathname}` };
    }),
    del: vi.fn(async (pathname) => {
      deleted.push(pathname);
      store.delete(pathname);
    }),
  };
});

const TOKEN = "vercel_blob_rw_AbCdStore123_secretpart";
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
let mediaStorage;
let blob;

beforeEach(async () => {
  vi.stubEnv("USE_CLOUD", "1"); // 클라우드 방식으로 실행
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", TOKEN);
  for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) vi.stubEnv(k, "");
  store.clear();
  deleted.length = 0;
  vi.resetModules();
  mediaStorage = await import("@/lib/mediaStorage");
  blob = await import("@/lib/blob");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// 파일 앞부분을 돌려주는 가짜 fetch (형식 확인용 Range 요청)
function serveBytes(bytes) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(Buffer.from(bytes), { status: 206 })));
}

describe("Vercel Blob 방식", () => {
  it("BLOB_READ_WRITE_TOKEN이 있으면 Blob 방식 (R2가 없을 때)", () => {
    expect(mediaStorage.driver()).toBe("blob");
  });

  it("허가: 이 경로·형식·크기로만 올릴 수 있는 일회용 토큰 발급", async () => {
    const { getPayloadFromClientToken } = await import("@vercel/blob/client");
    const { fileName, upload } = await mediaStorage.createUpload({ mimeType: "image/jpeg", size: 1234 });
    expect(upload.method).toBe("blob");
    expect(upload.pathname).toBe(`media/${fileName}`);
    expect(upload.token).not.toContain("secretpart"); // 서버 비밀 토큰은 내보내지 않음

    const payload = getPayloadFromClientToken(upload.token);
    expect(payload.pathname).toBe(`media/${fileName}`);
    expect(payload.allowedContentTypes).toEqual(["image/jpeg"]);
    expect(payload.maximumSizeInBytes).toBe(1234);
    expect(payload.addRandomSuffix).toBe(false);
    expect(payload.allowOverwrite).toBe(false);
    expect(payload.validUntil).toBeGreaterThan(Date.now());
  });

  it("공개 주소는 저장소 ID로 만들어짐", () => {
    expect(blob.blobPublicUrl("media/a.png")).toBe("https://abcdstore123.public.blob.vercel-storage.com/media/a.png");
  });

  const file = { fileName: "123e4567-e89b-12d3-a456-426614174000.png", mimeType: "image/png" };
  const path = `media/${file.fileName}`;

  it("확인: 정상 파일은 그대로 게시", async () => {
    store.set(path, { size: 100, contentType: "image/png" });
    serveBytes(PNG_HEAD);
    expect(await mediaStorage.finalizeUpload(file)).toEqual({ size: 100 });
    expect(deleted).toEqual([]);
  });

  it("확인: 올라오지 않았으면 404", async () => {
    await expect(mediaStorage.finalizeUpload(file)).rejects.toMatchObject({ status: 404 });
  });

  it("확인: 한도보다 크면 거부하고 삭제", async () => {
    store.set(path, { size: 11 * 1024 * 1024, contentType: "image/png" });
    await expect(mediaStorage.finalizeUpload(file)).rejects.toMatchObject({ status: 413 });
    expect(deleted).toEqual([path]);
  });

  it("확인: 형식이 다르게 올라왔으면 거부하고 삭제", async () => {
    store.set(path, { size: 100, contentType: "text/html" });
    await expect(mediaStorage.finalizeUpload(file)).rejects.toMatchObject({ status: 415 });
    expect(deleted).toEqual([path]);
  });

  it("확인: 내용이 형식과 다르면(위조) 거부하고 삭제", async () => {
    store.set(path, { size: 100, contentType: "image/png" });
    serveBytes(Array.from(Buffer.from("<script>alert(1)</script>")));
    await expect(mediaStorage.finalizeUpload(file)).rejects.toMatchObject({ status: 400 });
    expect(deleted).toEqual([path]);
  });

  it("삭제와 보기 주소", async () => {
    await mediaStorage.deleteMedia(file.fileName);
    expect(deleted).toEqual([path]);
    expect(await mediaStorage.viewUrl(file.fileName)).toBe(`https://abcdstore123.public.blob.vercel-storage.com/${path}`);
  });
});
