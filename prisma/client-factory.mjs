// Prisma 클라이언트 생성. 앱(lib/db.js)과 seed 스크립트가 같은 방식으로 DB에 연결합니다.
//
// 어느 DB에 연결할지:
// - 클라우드(Turso): Vercel에서 실행될 때, 또는 USE_CLOUD=1(스크립트의 --remote)일 때만
// - 그 밖(PC에서 개발·테스트): 항상 로컬 SQLite 파일(DATABASE_URL, 기본 file:./prisma/dev.db)
// .env에 Turso 키가 있어도 PC의 개발 서버·테스트가 실제 서비스 DB를 건드리지 않도록 하기 위함입니다.
// 두 경우 모두 같은 어댑터(libSQL)를 쓰므로 개발 중에 확인한 동작이 배포 환경에서도 같습니다.
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client.mts";
import { isCloudMode } from "./cloud.mjs";
import { databaseUrl } from "./database-url.mjs";

export { applyRemoteFlag, isCloudMode } from "./cloud.mjs";

export function connectionConfig(env = process.env) {
  if (isCloudMode(env)) {
    if (!env.TURSO_DATABASE_URL) {
      throw new Error("클라우드 DB(Turso)를 쓰려면 TURSO_DATABASE_URL과 TURSO_AUTH_TOKEN이 필요합니다.");
    }
    return { url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN || undefined, remote: true };
  }
  return { url: databaseUrl, remote: false };
}

export function createPrismaClient() {
  const { url, authToken, remote } = connectionConfig();
  const client = new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });

  if (!remote) {
    // 로컬 파일: WAL 모드(쓰는 중에도 읽기 가능)와 busy_timeout(다른 쓰기를 최대 5초 기다림)
    // 원격 Turso는 서버가 관리하므로 설정하지 않음
    client
      .$queryRawUnsafe("PRAGMA journal_mode = WAL")
      .then(() => client.$queryRawUnsafe("PRAGMA busy_timeout = 5000"))
      .catch((error) => console.error("SQLite 설정 실패", error));
  }
  return client;
}
