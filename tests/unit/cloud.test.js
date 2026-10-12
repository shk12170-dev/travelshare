import { describe, expect, it } from "vitest";
import { applyRemoteFlag, isCloudMode } from "../../prisma/cloud.mjs";
import { connectionConfig } from "../../prisma/client-factory.mjs";

const turso = { TURSO_DATABASE_URL: "libsql://example.turso.io", TURSO_AUTH_TOKEN: "t" };

describe("클라우드 사용 여부 (실제 서비스 데이터 보호)", () => {
  it("PC에서는 .env에 Turso 키가 있어도 로컬 파일 DB를 사용", () => {
    expect(isCloudMode({ ...turso })).toBe(false);
    const config = connectionConfig({ ...turso });
    expect(config.remote).toBe(false);
    expect(config.url).toMatch(/^file:/);
  });

  it("Vercel에서 실행되면 Turso 사용", () => {
    const config = connectionConfig({ ...turso, VERCEL: "1" });
    expect(config).toMatchObject({ url: turso.TURSO_DATABASE_URL, remote: true });
  });

  it("--remote를 준 스크립트만 Turso 사용", () => {
    const env = { ...turso };
    expect(applyRemoteFlag(["node", "script.mjs"], env)).toBe(false);
    expect(applyRemoteFlag(["node", "script.mjs", "--remote"], env)).toBe(true);
    expect(connectionConfig(env).remote).toBe(true);
  });

  it("클라우드를 써야 하는데 Turso 주소가 없으면 로컬로 조용히 넘어가지 않고 오류", () => {
    expect(() => connectionConfig({ VERCEL: "1" })).toThrow(/TURSO_DATABASE_URL/);
  });
});
