import { describe, expect, it } from "vitest";
import { isProtectedAccount } from "@/lib/accountDeletion";
import { validateAccountDelete } from "@/lib/validation";

describe("isProtectedAccount", () => {
  it("샘플·체험 계정 이메일은 보호 대상", () => {
    expect(isProtectedAccount("seacat@sample.travelshare.test")).toBe(true);
    expect(isProtectedAccount("SEACAT@Sample.TravelShare.test")).toBe(true);
  });

  it("일반 이메일은 보호 대상이 아님", () => {
    expect(isProtectedAccount("someone@example.com")).toBe(false);
    expect(isProtectedAccount("sample.travelshare.test@gmail.com")).toBe(false);
    expect(isProtectedAccount(undefined)).toBe(false);
  });
});

describe("validateAccountDelete", () => {
  it("확인 값과 동의가 모두 있어야 통과", () => {
    expect(validateAccountDelete({ confirmValue: "pw", understood: true })).toEqual({});
    expect(validateAccountDelete({ confirmValue: "", understood: true }).confirmValue).toBeDefined();
    expect(validateAccountDelete({ confirmValue: "pw", understood: false }).understood).toBeDefined();
  });
});
