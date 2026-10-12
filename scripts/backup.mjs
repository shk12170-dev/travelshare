// DB와 업로드 파일 백업. 서버가 켜져 있어도 안전하게 실행할 수 있습니다.
// 실행: npm run db:backup   (매일 자동 실행: README의 "백업" 참고)
//
// 두 가지 방식을 자동으로 고릅니다.
// - 로컬 파일 DB(개발·자체 서버): SQLite 백업 기능으로 일관된 사본을 만듦 (backups/db/travelshare-YYYYMMDD-HHMMSS.db)
//   업로드 파일은 이름이 바뀌지 않으므로 새 파일만 복사 (backups/uploads/)
// - Turso(npm run db:backup:remote): 모든 테이블을 SQL 파일로 내려받음 (backups/db/travelshare-YYYYMMDD-HHMMSS.sql)
//   파일은 R2에 있고 R2가 자체적으로 보관하므로 여기서는 복사하지 않음
// - 오래된 DB 백업은 최근 BACKUP_KEEP개(기본 14개)만 남김
// - 백업 위치는 BACKUP_DIR로 바꿀 수 있음. 서버 디스크가 고장 나도 남도록 다른 디스크나 클라우드 동기화 폴더를 권장
//
// Turso 백업 복원: 새 데이터베이스에 `turso db shell <이름> < backups/db/travelshare-....sql`
//   또는 로컬 파일로 `sqlite3 restored.db < backups/db/travelshare-....sql`
import "dotenv/config";
import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { applyRemoteFlag, connectionConfig } from "../prisma/client-factory.mjs";

applyRemoteFlag();

const backupDir = path.resolve(process.env.BACKUP_DIR || "backups");
const keep = Number(process.env.BACKUP_KEEP) || 14;
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join("storage", "uploads"));

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

async function backupDatabase() {
  const dir = path.join(backupDir, "db");
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `travelshare-${stamp}.db`);
  const { default: Database } = await import("better-sqlite3");
  const dbFile = path.resolve(connectionConfig().url.replace(/^file:/, ""));
  const db = new Database(dbFile, { readonly: true, fileMustExist: true });
  try {
    await db.backup(target);
  } finally {
    db.close();
  }

  return { target, kept: await prune(dir, "db") };
}

// 오래된 백업 정리. 최근 keep개만 남기고 남은 개수를 돌려줌
async function prune(dir, extension) {
  const pattern = new RegExp(`^travelshare-\\d{8}-\\d{6}\\.${extension}$`);
  const files = (await readdir(dir)).filter((f) => pattern.test(f)).sort();
  for (const old of files.slice(0, Math.max(0, files.length - keep))) await rm(path.join(dir, old));
  return Math.min(files.length, keep);
}

// SQL 값 표현 (문자열은 따옴표 이스케이프, bigint·숫자는 그대로)
function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "bigint" || typeof value === "number") return String(value);
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return `X'${Buffer.from(value.buffer ?? value).toString("hex")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

// 원격(Turso) DB를 SQL 파일로 내려받기
async function dumpRemoteDatabase() {
  const { url, authToken } = connectionConfig();
  const client = createClient({ url, authToken });
  try {
    const dir = path.join(backupDir, "db");
    await mkdir(dir, { recursive: true });
    const target = path.join(dir, `travelshare-${stamp}.sql`);

    const objects = (
      await client.execute(
        `SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name`,
      )
    ).rows;

    const lines = ["-- TravelShare 백업", `-- ${new Date().toISOString()}`, "PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;"];
    for (const o of objects.filter((o) => o.type === "table")) lines.push(`${o.sql};`);

    let rowCount = 0;
    for (const o of objects.filter((o) => o.type === "table")) {
      const rows = (await client.execute(`SELECT * FROM "${o.name}"`)).rows;
      for (const row of rows) {
        const cols = Object.keys(row).filter((k) => Number.isNaN(Number(k)));
        lines.push(`INSERT INTO "${o.name}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((c) => sqlValue(row[c])).join(", ")});`);
        rowCount += 1;
      }
    }
    for (const o of objects.filter((o) => o.type !== "table")) lines.push(`${o.sql};`);
    lines.push("COMMIT;", "");

    await writeFile(target, lines.join("\n"), "utf8");
    return { target, rows: rowCount, kept: await prune(dir, "sql") };
  } finally {
    client.close();
  }
}

async function backupUploads() {
  const dir = path.join(backupDir, "uploads");
  await mkdir(dir, { recursive: true });
  let source;
  try {
    source = await readdir(uploadDir);
  } catch {
    return { copied: 0, total: 0 };
  }
  const existing = new Set(await readdir(dir));
  let copied = 0;
  for (const name of source) {
    if (existing.has(name)) continue;
    await copyFile(path.join(uploadDir, name), path.join(dir, name));
    copied += 1;
  }
  return { copied, total: source.length };
}

if (connectionConfig().remote) {
  const dump = await dumpRemoteDatabase();
  console.log(`DB 백업(Turso → SQL): ${dump.target} (행 ${dump.rows}개, 보관 ${dump.kept}개)`);
  console.log("업로드 파일은 R2에 보관되어 있어 복사하지 않습니다.");
} else {
  const db = await backupDatabase();
  const uploads = await backupUploads();
  console.log(`DB 백업: ${db.target} (보관 ${db.kept}개)`);
  console.log(`업로드 파일: 새 파일 ${uploads.copied}개 복사 (전체 ${uploads.total}개)`);
}
