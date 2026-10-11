import "server-only";
import { createPrismaClient } from "@/prisma/client-factory.mjs";

// 개발 서버는 코드가 바뀔 때마다 모듈을 다시 불러오므로, 연결이 쌓이지 않게 전역에 하나만 유지
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
