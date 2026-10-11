import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client.mts";
import { databaseUrl } from "@/prisma/database-url.mjs";

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  const client = new PrismaClient({ adapter });
  // WAL 모드: 쓰는 중에도 읽기가 막히지 않음 (DB 파일에 저장되므로 한 번 켜면 유지)
  // busy_timeout: 다른 쓰기가 끝나기를 최대 5초 기다린 뒤 오류
  client
    .$queryRawUnsafe("PRAGMA journal_mode = WAL")
    .then(() => client.$queryRawUnsafe("PRAGMA busy_timeout = 5000"))
    .catch((error) => console.error("SQLite 설정 실패", error));
  return client;
}

// 개발 서버는 코드가 바뀔 때마다 모듈을 다시 불러오므로, 연결이 쌓이지 않게 전역에 하나만 유지
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
