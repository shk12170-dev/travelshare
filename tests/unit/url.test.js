import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/url";

describe("safeReturnPath", () => {
  it("사이트 안의 경로는 그대로 허용", () => {
    expect(safeReturnPath("/log/new")).toBe("/log/new");
    expect(safeReturnPath("/search?q=제주")).toBe("/search?q=제주");
  });

  it.each([
    ["https://evil.example", "외부 주소"],
    ["//evil.example", "프로토콜 생략 주소"],
    ["/\\evil.example", "백슬래시"],
    ["/\t/evil.example", "탭 문자"],
    ["/\n/evil.example", "줄바꿈 문자"],
    ["javascript:alert(1)", "스크립트 주소"],
    ["", "빈 값"],
    [undefined, "값 없음"],
  ])("%s (%s)는 홈으로", (value) => {
    expect(safeReturnPath(value)).toBe("/");
  });
});
