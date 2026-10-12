import "server-only";
import { createPrismaClient } from "@/prisma/client-factory.mjs";

// DB 연결은 실제로 처음 쓸 때 만듭니다.
// 빌드(페이지 정보 수집) 중에는 DB가 필요 없으므로, 환경 변수가 아직 없어도 빌드가 멈추지 않게 하기 위함입니다.
// 개발 서버는 코드가 바뀔 때마다 모듈을 다시 불러오므로, 연결이 쌓이지 않게 전역에 하나만 유지
const globalForPrisma = globalThis;

function getClient() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

// prisma.user.findMany() 처럼 기존과 똑같이 쓸 수 있는 대리 객체
export const prisma = new Proxy(
  {},
  {
    get(_, property) {
      const client = getClient();
      const value = client[property];
      return typeof value === "function" ? value.bind(client) : value;
    },
  },
);
