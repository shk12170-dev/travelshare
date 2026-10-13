import { describe, expect, it, vi } from "vitest";

// DB 연결을 만들지 않도록 가짜로 대체하고, 목록 정리 규칙만 확인
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/mediaStorage", () => ({ deleteMedia: async () => {} }));
import { MAX_LOG_PHOTOS } from "@/lib/logPhotoLimits";


const { parseMediaIds } = await import("@/lib/logPhotos");

describe("parseMediaIds", () => {
  it("문자열 ID 목록을 그대로 받음", () => {
    expect(parseMediaIds('["a","b"]')).toEqual(["a", "b"]);
  });

  it("중복을 제거하고 최대 개수로 제한", () => {
    const many = JSON.stringify(Array.from({ length: 12 }, (_, i) => `id${i % 8}`));
    const ids = parseMediaIds(many);
    expect(ids.length).toBeLessThanOrEqual(MAX_LOG_PHOTOS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("배열이 아니거나 깨진 값, 이상한 항목은 무시", () => {
    expect(parseMediaIds("not json")).toEqual([]);
    expect(parseMediaIds('{"a":1}')).toEqual([]);
    expect(parseMediaIds("")).toEqual([]);
    expect(parseMediaIds(undefined)).toEqual([]);
    expect(parseMediaIds(JSON.stringify([1, null, "", "x".repeat(41), "ok"]))).toEqual(["ok"]);
  });
});
