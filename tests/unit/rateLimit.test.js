import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 실제 SQLite(메모리)에 같은 SQL을 실행해 횟수 제한 로직을 검증
let sqlite;
let failQueries = false;

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRawUnsafe: async (sql, ...params) => {
      if (failQueries) throw new Error("db down");
      return sqlite.prepare(sql).all(...params);
    },
    $executeRawUnsafe: async (sql, ...params) => sqlite.prepare(sql).run(...params),
  },
}));

const { RATE_LIMITS, clientIp, hit } = await import("@/lib/rateLimit");

beforeEach(() => {
  sqlite = new Database(":memory:");
  sqlite.exec('CREATE TABLE "RateLimit" ("key" TEXT NOT NULL PRIMARY KEY, "count" INTEGER NOT NULL, "resetAt" BIGINT NOT NULL)');
  failQueries = false;
});

describe("hit", () => {
  it("한도까지 허용하고 넘으면 거부", async () => {
    const { limit } = RATE_LIMITS.comment;
    for (let i = 0; i < limit; i++) expect((await hit("comment", "u1", 0)).ok).toBe(true);
    const blocked = await hit("comment", "u1", 0);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("사용자별로 따로 셈", async () => {
    for (let i = 0; i < RATE_LIMITS.signUpPerIp.limit; i++) await hit("signUpPerIp", "1.1.1.1", 0);
    expect((await hit("signUpPerIp", "1.1.1.1", 0)).ok).toBe(false);
    expect((await hit("signUpPerIp", "2.2.2.2", 0)).ok).toBe(true);
  });

  it("시간이 지나면 다시 허용", async () => {
    const { limit, windowMs } = RATE_LIMITS.like;
    for (let i = 0; i <= limit; i++) await hit("like", "u1", 0);
    expect((await hit("like", "u1", 0)).ok).toBe(false);
    expect((await hit("like", "u1", windowMs)).ok).toBe(true);
  });

  it("동시에 와도 정확히 한도만큼만 허용", async () => {
    const { limit } = RATE_LIMITS.like;
    const results = await Promise.all(Array.from({ length: limit + 15 }, () => hit("like", "burst", 0)));
    expect(results.filter((r) => r.ok)).toHaveLength(limit);
  });

  it("DB 오류가 나도 서비스를 막지 않음", async () => {
    failQueries = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await hit("like", "u1", 0)).ok).toBe(true);
    spy.mockRestore();
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
