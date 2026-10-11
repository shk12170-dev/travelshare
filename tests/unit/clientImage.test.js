import { describe, expect, it } from "vitest";
import { targetSize } from "@/lib/clientImage";

describe("targetSize", () => {
  it("긴 변이 한도 이하이면 그대로", () => {
    expect(targetSize(1600, 900)).toEqual({ width: 1600, height: 900, resized: false });
  });

  it("가로가 길면 가로를 한도에 맞추고 비율 유지", () => {
    expect(targetSize(4096, 2048)).toEqual({ width: 2048, height: 1024, resized: true });
  });

  it("세로가 길면 세로를 한도에 맞추고 비율 유지", () => {
    expect(targetSize(3000, 4000)).toEqual({ width: 1536, height: 2048, resized: true });
  });
});
