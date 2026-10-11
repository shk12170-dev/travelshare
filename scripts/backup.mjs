// DB와 업로드 파일 백업. 서버가 켜져 있어도 안전하게 실행할 수 있습니다.
// 실행: npm run db:backup   (매일 자동 실행: README의 "백업" 참고)
//
// - DB: SQLite 백업 기능으로 일관된 사본을 만듦 (backups/db/travelshare-YYYYMMDD-HHMMSS.db)
// - 업로드 파일: 이름이 바뀌지 않으므로 새 파일만 복사 (backups/uploads/)
// - 오래된 DB 백업은 최근 BACKUP_KEEP개(기본 14개)만 남김
// - 백업 위치는 BACKUP_DIR로 바꿀 수 있음. 서버 디스크가 고장 나도 남도록 다른 디스크나 클라우드 동기화 폴더를 권장
import "dotenv/config";
import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { databaseUrl } from "../prisma/database-url.mjs";

const backupDir = path.resolve(process.env.BACKUP_DIR || "backups");
const keep = Number(process.env.BACKUP_KEEP) || 14;
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join("storage", "uploads"));
const dbFile = path.resolve(databaseUrl.replace(/^file:/, ""));

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

async function backupDatabase() {
  const dir = path.join(backupDir, "db");
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `travelshare-${stamp}.db`);
  const db = new Database(dbFile, { readonly: true, fileMustExist: true });
  try {
    await db.backup(target);
  } finally {
    db.close();
  }

  // 오래된 백업 정리
  const files = (await readdir(dir)).filter((f) => /^travelshare-\d{8}-\d{6}\.db$/.test(f)).sort();
  for (const old of files.slice(0, Math.max(0, files.length - keep))) await rm(path.join(dir, old));
  return { target, kept: Math.min(files.length, keep) };
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

const db = await backupDatabase();
const uploads = await backupUploads();
console.log(`DB 백업: ${db.target} (보관 ${db.kept}개)`);
console.log(`업로드 파일: 새 파일 ${uploads.copied}개 복사 (전체 ${uploads.total}개)`);
