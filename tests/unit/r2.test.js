import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env = {
  R2_ACCOUNT_ID: "acct123",
  R2_ACCESS_KEY_ID: "AKIATESTKEY",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
  R2_BUCKET: "travelshare-media",
};

let r2;
let mediaStorage;
const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

beforeEach(async () => {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  r2 = await import("@/lib/r2");
  mediaStorage = await import("@/lib/mediaStorage");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("R2 서명 주소", () => {
  it("업로드 주소: 버킷·키·만료·형식·크기가 서명에 포함됨", async () => {
    const { url, headers } = await r2.presignPut("pending/a b.png", { contentType: "image/png", size: 12345 });
    const u = new URL(url);
    expect(u.origin).toBe("https://acct123.r2.cloudflarestorage.com");
    expect(u.pathname).toBe("/travelshare-media/pending/a%20b.png");
    expect(u.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(u.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(u.searchParams.get("X-Amz-Credential")).toMatch(/^AKIATESTKEY\/\d{8}\/auto\/s3\/aws4_request$/);
    expect(u.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    // 서명 대상 헤더에 형식과 크기가 있어야 R2가 다른 값을 거부함
    const signed = u.searchParams.get("X-Amz-SignedHeaders").split(";");
    expect(signed).toEqual(expect.arrayContaining(["content-length", "content-type", "host"]));
    expect(headers).toEqual({ "Content-Type": "image/png" });
    // 비밀키는 주소에 드러나면 안 됨
    expect(url).not.toContain("test-secret-key");
  });

  it("크기가 다르면 서명도 달라짐", async () => {
    const a = await r2.presignPut("pending/x.png", { contentType: "image/png", size: 100 });
    const b = await r2.presignPut("pending/x.png", { contentType: "image/png", size: 101 });
    expect(new URL(a.url).searchParams.get("X-Amz-Signature")).not.toBe(new URL(b.url).searchParams.get("X-Amz-Signature"));
  });

  it("보기 주소는 같은 시간대에 같은 주소, 시간대가 바뀌면 새 주소", async () => {
    const hour = 3_600_000;
    const t = Date.UTC(2026, 9, 11, 3, 10, 0);
    const a = await r2.presignGet("media/x.png", t);
    const b = await r2.presignGet("media/x.png", t + 40 * 60_000);
    const c = await r2.presignGet("media/x.png", t + hour);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    const u = new URL(a);
    expect(u.searchParams.get("X-Amz-Date")).toBe("20261011T030000Z");
    expect(u.searchParams.get("X-Amz-Expires")).toBe("7200");
  });
});

describe("업로드 허가", () => {
  it("R2 설정이 있으면 R2 방식, 형식·크기 검사", async () => {
    expect(mediaStorage.driver()).toBe("r2");
    const ok = await mediaStorage.createUpload({ mimeType: "image/jpeg", size: 1000 });
    expect(ok.fileName).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(ok.upload.url).toContain("/pending/");

    await expect(mediaStorage.createUpload({ mimeType: "image/svg+xml", size: 10 })).rejects.toMatchObject({ status: 415 });
    await expect(mediaStorage.createUpload({ mimeType: "image/png", size: 11 * 1024 * 1024 })).rejects.toMatchObject({ status: 413 });
    await expect(mediaStorage.createUpload({ mimeType: "video/mp4", size: 51 * 1024 * 1024 })).rejects.toMatchObject({ status: 413 });
    await expect(mediaStorage.createUpload({ mimeType: "image/png", size: 0 })).rejects.toMatchObject({ status: 400 });
  });
});

describe("게시 확인 (R2)", () => {
  // 가짜 R2: 요청을 기록하고 미리 정한 응답을 돌려줌
  function fakeR2({ head = { status: 200, length: 100 }, bytes = PNG_HEAD } = {}) {
    const calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        const method = request.method;
        const path = new URL(request.url).pathname;
        calls.push(`${method} ${path}`);
        if (method === "HEAD") {
          if (head.status === 404) return new Response(null, { status: 404 });
          return new Response(null, { status: 200, headers: { "content-length": String(head.length), "content-type": "image/png" } });
        }
        if (method === "GET") return new Response(bytes, { status: 206 });
        return new Response(null, { status: 200 });
      }),
    );
    return calls;
  }

  const file = { fileName: "123e4567-e89b-12d3-a456-426614174000.png", mimeType: "image/png" };

  it("정상 파일: 정식 위치로 복사하고 임시 파일 삭제", async () => {
    const calls = fakeR2();
    const result = await mediaStorage.finalizeUpload(file);
    expect(result.size).toBe(100);
    expect(calls).toEqual([
      `HEAD /travelshare-media/pending/${file.fileName}`,
      `GET /travelshare-media/pending/${file.fileName}`,
      `PUT /travelshare-media/media/${file.fileName}`,
      `DELETE /travelshare-media/pending/${file.fileName}`,
    ]);
  });

  it("올라오지 않았으면 404", async () => {
    fakeR2({ head: { status: 404 } });
    await expect(mediaStorage.finalizeUpload(file)).rejects.toMatchObject({ status: 404 });
  });

  it("허가받은 한도보다 크게 올렸으면 거부하고 삭제", async () => {
    const calls = fakeR2({ head: { status: 200, length: 11 * 1024 * 1024 } });
    await expect(mediaStorage.finalizeUpload(file)).rejects.toMatchObject({ status: 413 });
    expect(calls).toContain(`DELETE /travelshare-media/pending/${file.fileName}`);
    expect(calls.some((c) => c.startsWith("PUT"))).toBe(false);
  });

  it("형식을 속인 파일은 거부하고 삭제 (정식 위치로 복사되지 않음)", async () => {
    const calls = fakeR2({ bytes: Buffer.from("<script>alert(1)</script>") });
    await expect(mediaStorage.finalizeUpload(file)).rejects.toMatchObject({ status: 400 });
    expect(calls).toContain(`DELETE /travelshare-media/pending/${file.fileName}`);
    expect(calls.some((c) => c.startsWith("PUT"))).toBe(false);
  });
});
