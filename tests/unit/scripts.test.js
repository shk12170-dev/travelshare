import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const scriptFiles = ["prisma", "scripts", "prisma/seed-data"].flatMap((dir) =>
  readdirSync(path.join(root, dir))
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => path.join(dir, f)),
);

describe("운영 스크립트", () => {
  it.each(scriptFiles)("%s 문법 오류 없음", (file) => {
    expect(() => execFileSync(process.execPath, ["--check", file], { cwd: root, stdio: "pipe" })).not.toThrow();
  });

  const runSeed = (env, args = ["--remote"]) =>
    spawnSync(process.execPath, ["prisma/seed.mjs", ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DEMO_PASSWORD: "", USE_CLOUD: "", VERCEL: "", ...env },
    });

  it("원격 DB에는 공개된 데모 비밀번호로 계정을 만들지 않고 오류로 종료", () => {
    const result = runSeed({ TURSO_DATABASE_URL: "libsql://example.turso.io" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("공개된 데모 비밀번호로 계정을 만들 수 없습니다");
    expect(result.stderr).toContain("DEMO_PASSWORD");
  });

  it("DEMO_PASSWORD가 12자 미만이면 거부", () => {
    const result = runSeed({ TURSO_DATABASE_URL: "libsql://example.turso.io", DEMO_PASSWORD: "short" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("12자 이상");
  });
});
