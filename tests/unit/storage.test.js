import { describe, expect, it } from "vitest";
import { matchesSignature, resolveUpload } from "@/lib/storage";

const bytes = (...values) => Buffer.from(values);
const ascii = (text) => Buffer.from(text, "latin1");

describe("matchesSignature", () => {
  it("실제 파일 시그니처를 인식", () => {
    expect(matchesSignature(bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg")).toBe(true);
    expect(matchesSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png")).toBe(true);
    expect(matchesSignature(ascii("GIF89a"), "image/gif")).toBe(true);
    expect(matchesSignature(ascii("RIFF\0\0\0\0WEBP"), "image/webp")).toBe(true);
    expect(matchesSignature(ascii("\0\0\0\x18ftypmp42"), "video/mp4")).toBe(true);
    expect(matchesSignature(bytes(0x1a, 0x45, 0xdf, 0xa3), "video/webm")).toBe(true);
  });

  it("형식을 속인 파일은 거부", () => {
    expect(matchesSignature(ascii("<script>alert(1)</script>"), "image/png")).toBe(false);
    expect(matchesSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/jpeg")).toBe(false);
    expect(matchesSignature(ascii("GIF89a"), "text/html")).toBe(false);
  });
});

describe("resolveUpload", () => {
  it("서버가 만든 이름만 허용", () => {
    expect(resolveUpload("123e4567-e89b-12d3-a456-426614174000.png")).toMatch(/uploads[\\/]123e4567/);
  });

  it.each(["../../.env", "..\\..\\prisma\\dev.db", "a.png", "123e4567-e89b-12d3-a456-426614174000.png/../x"])(
    "경로 조작 시도 %s 는 거부",
    (name) => {
      expect(() => resolveUpload(name)).toThrow();
    },
  );
});
