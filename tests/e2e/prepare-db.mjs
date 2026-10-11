// E2E 테스트 서버를 띄우기 전에 전용 DB와 업로드 폴더를 새로 만들고 샘플 데이터를 넣음
// (playwright.config.mjs의 webServer 명령에서 서버보다 먼저 실행)
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const uploadDir = process.env.UPLOAD_DIR;
if (process.env.DATABASE_URL !== "file:./prisma/e2e.db" || !uploadDir?.includes("e2e")) {
  throw new Error("E2E 전용 환경 변수가 아닙니다. 개발 DB를 지우지 않도록 중단합니다.");
}

for (const file of ["prisma/e2e.db", "prisma/e2e.db-journal"]) rmSync(file, { force: true });
rmSync(uploadDir, { recursive: true, force: true });

execSync("npx prisma migrate deploy", { stdio: "inherit" });
execSync("npx prisma db seed", { stdio: "inherit" });
