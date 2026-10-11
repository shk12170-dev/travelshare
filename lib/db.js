import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client.mts";

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// 개발 서버는 코드가 바뀔 때마다 모듈을 다시 불러오므로, 연결이 쌓이지 않게 전역에 하나만 유지
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
