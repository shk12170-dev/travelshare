// DB 구조 반영: prisma/migrations 폴더의 SQL을 순서대로 적용합니다. 이미 적용한 것은 건너뜁니다.
// Turso(원격)는 prisma migrate deploy를 직접 지원하지 않아서 이 스크립트를 씁니다.
//
// 실행: npm run db:migrate:remote   (Turso에 적용, --remote)
//       node scripts/migrate.mjs     (로컬 파일 DATABASE_URL에 적용)
// 개발 중 스키마를 바꿀 때는 기존대로 npm run db:migrate (prisma migrate dev)로 마이그레이션을 만든 뒤,
// 이 스크립트로 Turso에 반영합니다.
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { applyRemoteFlag, connectionConfig } from "../prisma/client-factory.mjs";

// SQL 파일을 문장 단위로 나눔 (따옴표 안의 ;와 -- 주석은 구분자로 취급하지 않음)
export function splitStatements(sql) {
  const statements = [];
  let current = "";
  let quote = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (quote) {
      current += ch;
      if (ch === quote) {
        if (next === quote) current += sql[++i]; // '' 로 이스케이프된 따옴표
        else quote = null;
      }
      continue;
    }
    if (ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

export async function migrate(client, migrationsDir, log = console.log) {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS "_app_migrations" ("name" TEXT NOT NULL PRIMARY KEY, "appliedAt" TEXT NOT NULL)`,
  );
  const done = new Set((await client.execute(`SELECT "name" FROM "_app_migrations"`)).rows.map((r) => r.name));

  const names = (await readdir(migrationsDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let applied = 0;
  for (const name of names) {
    if (done.has(name)) continue;
    const sql = await readFile(path.join(migrationsDir, name, "migration.sql"), "utf8");
    const statements = splitStatements(sql);
    // 외래 키 검사를 끄고 한 번에(전부 성공하거나 전부 취소) 적용
    await client.migrate([
      ...statements.map((statement) => ({ sql: statement, args: [] })),
      { sql: `INSERT INTO "_app_migrations" ("name", "appliedAt") VALUES (?, ?)`, args: [name, new Date().toISOString()] },
    ]);
    log(`적용: ${name} (${statements.length}문장)`);
    applied += 1;
  }
  if (applied === 0) log("적용할 새 마이그레이션이 없습니다.");
  return applied;
}

// 직접 실행했을 때만 동작 (테스트에서 불러올 때는 실행하지 않음)
if (import.meta.url === new URL(process.argv[1], "file://").href || process.argv[1]?.endsWith("migrate.mjs")) {
  applyRemoteFlag();
  const { url, authToken, remote } = connectionConfig();
  console.log(`대상: ${remote ? url : `로컬 파일 ${url}`}`);
  const client = createClient({ url, authToken });
  try {
    await migrate(client, path.resolve("prisma/migrations"));
  } finally {
    client.close();
  }
}
