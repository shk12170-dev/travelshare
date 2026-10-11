import { beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMITS, clientIp, hit, resetRateLimits } from "@/lib/rateLimit";

describe("hit", () => {
  beforeEach(() => resetRateLimits());

  it("한도까지 허용하고 넘으면 거부", () => {
    const { limit } = RATE_LIMITS.comment;
    for (let i = 0; i < limit; i++) expect(hit("comment", "u1", 0).ok).toBe(true);
    const blocked = hit("comment", "u1", 0);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("사용자별로 따로 셈", () => {
    for (let i = 0; i < RATE_LIMITS.signUpPerIp.limit; i++) hit("signUpPerIp", "1.1.1.1", 0);
    expect(hit("signUpPerIp", "1.1.1.1", 0).ok).toBe(false);
    expect(hit("signUpPerIp", "2.2.2.2", 0).ok).toBe(true);
  });

  it("시간이 지나면 다시 허용", () => {
    const { limit, windowMs } = RATE_LIMITS.like;
    for (let i = 0; i <= limit; i++) hit("like", "u1", 0);
    expect(hit("like", "u1", 0).ok).toBe(false);
    expect(hit("like", "u1", windowMs).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("X-Forwarded-For의 마지막 값(가장 가까운 프록시가 붙인 주소)을 사용", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 10.0.0.1" }))).toBe("10.0.0.1");
  });

  it("헤더가 없으면 unknown", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
