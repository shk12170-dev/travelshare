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

  it("원격 DB에는 데모 시드(공개 비밀번호 계정)를 넣지 않고 오류로 종료", () => {
    const result = spawnSync(process.execPath, ["prisma/seed.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, TURSO_DATABASE_URL: "libsql://example.turso.io", ALLOW_DEMO_SEED: "" },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("원격 DB(Turso)에는 데모 데이터를 넣을 수 없습니다");
    expect(result.stderr).toContain("npm run db:seed:courses");
  });
});
