import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUploadToken, verifyUploadToken } from "@/lib/uploadToken";

const payload = { key: "123e4567-e89b-12d3-a456-426614174000.png", uid: "u1", mime: "image/png", type: "photo", caption: "제주", region: "제주" };

beforeEach(() => vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-test-secret-test-secret-1234"));
afterEach(() => vi.unstubAllEnvs());

describe("업로드 허가증", () => {
  it("발급한 허가증은 내용 그대로 검증됨", () => {
    const token = createUploadToken(payload, 1000);
    expect(verifyUploadToken(token, 2000)).toMatchObject(payload);
  });

  it("내용을 바꾸면 거부 (다른 사용자·다른 파일로 바꿔치기 방지)", () => {
    const token = createUploadToken(payload, 1000);
    const [body, sig] = token.split(".");
    const forged = JSON.parse(Buffer.from(body, "base64url").toString());
    forged.uid = "attacker";
    const forgedBody = Buffer.from(JSON.stringify(forged)).toString("base64url");
    expect(verifyUploadToken(`${forgedBody}.${sig}`, 2000)).toBeNull();
  });

  it("서명이 없거나 형식이 다르면 거부", () => {
    expect(verifyUploadToken("", 0)).toBeNull();
    expect(verifyUploadToken("abc", 0)).toBeNull();
    expect(verifyUploadToken("a.b.c", 0)).toBeNull();
    expect(verifyUploadToken(undefined, 0)).toBeNull();
    expect(verifyUploadToken({ key: "x" }, 0)).toBeNull();
  });

  it("30분이 지나면 만료", () => {
    const token = createUploadToken(payload, 0);
    expect(verifyUploadToken(token, 29 * 60_000)).not.toBeNull();
    expect(verifyUploadToken(token, 31 * 60_000)).toBeNull();
  });

  it("다른 비밀키로 만든 허가증은 거부", () => {
    const token = createUploadToken(payload, 1000);
    vi.stubEnv("BETTER_AUTH_SECRET", "another-secret-another-secret-another-1234");
    expect(verifyUploadToken(token, 2000)).toBeNull();
  });

  it("운영 환경에서 비밀키가 없으면 발급하지 않음", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => createUploadToken(payload)).toThrow();
  });
});
