import { describe, expect, it } from "vitest";
import { splitStatements } from "../../scripts/migrate.mjs";

describe("splitStatements", () => {
  it("문장을 ;로 나누고 주석은 무시", () => {
    const sql = `-- 주석\nCREATE TABLE "A" ("id" TEXT);\n/* 블록 주석; 포함 */\nCREATE INDEX "i" ON "A"("id");`;
    expect(splitStatements(sql)).toEqual([`CREATE TABLE "A" ("id" TEXT)`, `CREATE INDEX "i" ON "A"("id")`]);
  });

  it("따옴표 안의 ;와 --는 구분자가 아님", () => {
    const sql = `INSERT INTO "T" VALUES ('a;b', 'x -- y', 'it''s;ok');\nSELECT 1;`;
    expect(splitStatements(sql)).toEqual([`INSERT INTO "T" VALUES ('a;b', 'x -- y', 'it''s;ok')`, "SELECT 1"]);
  });

  it("마지막 문장 끝에 ;가 없어도 포함", () => {
    expect(splitStatements("SELECT 1; SELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });
});
