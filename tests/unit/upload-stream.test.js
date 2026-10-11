import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
let dir;
let storage;

// 조각(chunk)으로 나눠 들어오는 업로드 본문을 흉내 냄
function streamOf(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(new Uint8Array(c));
      controller.close();
    },
  });
}

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "ts-upload-"));
  // UPLOAD_DIR은 프로젝트 기준 상대 경로이므로 임시 폴더까지의 상대 경로로 지정
  vi.stubEnv("UPLOAD_DIR", path.relative(process.cwd(), dir));
  vi.resetModules();
  storage = await import("@/lib/storage");
});

afterAll(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

describe("saveUploadStream", () => {
  const options = { extension: "png", mimeType: "image/png", maxBytes: 1024 };

  it("정상 파일은 저장", async () => {
    const { fileName, size } = await storage.saveUploadStream(streamOf([PNG_HEAD, [1, 2, 3, 4, 5]]), options);
    expect(size).toBe(13);
    expect(existsSync(path.join(dir, fileName))).toBe(true);
  });

  it("받는 도중 한도를 넘으면 중단하고 파일을 남기지 않음", async () => {
    const before = readdirSync(dir).length;
    const chunks = [PNG_HEAD, ...Array.from({ length: 10 }, () => new Array(200).fill(0))];
    await expect(storage.saveUploadStream(streamOf(chunks), options)).rejects.toMatchObject({ code: "TOO_LARGE" });
    expect(readdirSync(dir).length).toBe(before);
  });

  it("형식을 속인 파일은 첫 부분에서 거부", async () => {
    const before = readdirSync(dir).length;
    const fake = Array.from(Buffer.from("<script>alert(1)</script>"));
    await expect(storage.saveUploadStream(streamOf([fake]), options)).rejects.toMatchObject({ code: "BAD_SIGNATURE" });
    expect(readdirSync(dir).length).toBe(before);
  });

  it("시그니처가 여러 조각에 나뉘어 와도 인식", async () => {
    const { size } = await storage.saveUploadStream(streamOf([PNG_HEAD.slice(0, 3), PNG_HEAD.slice(3), [0, 0, 0, 0]]), options);
    expect(size).toBe(12);
  });

  it("빈 파일은 거부", async () => {
    await expect(storage.saveUploadStream(streamOf([]), options)).rejects.toMatchObject({ code: "EMPTY" });
  });
});
