import { defineConfig, devices } from "@playwright/test";

// E2E 테스트: 전용 DB(prisma/e2e.db)와 업로드 폴더(storage/e2e-uploads)로 운영 빌드를 띄워서 실행
// 실행: npm run build 후 npm run test:e2e
const PORT = 3200;
const baseURL = `http://localhost:${PORT}`;

export const e2eEnv = {
  DATABASE_URL: "file:./prisma/e2e.db",
  UPLOAD_DIR: "storage/e2e-uploads",
  BETTER_AUTH_URL: baseURL,
  // 테스트 전용 값 (실제 서비스에 쓰지 마세요)
  BETTER_AUTH_SECRET: "e2e-only-secret-not-for-production-0123456789",
  // 테스트에서는 메일 대신 콘솔 출력
  RESEND_API_KEY: "",
  MAIL_FROM: "",
  // 소셜 로그인 버튼·이동 확인용 가짜 키 (실제 로그인은 되지 않음)
  GOOGLE_CLIENT_ID: "e2e-google-client-id",
  GOOGLE_CLIENT_SECRET: "e2e-google-secret",
  KAKAO_CLIENT_ID: "e2e-kakao-client-id",
  KAKAO_CLIENT_SECRET: "e2e-kakao-secret",
};

export default defineConfig({
  testDir: "tests/e2e",
  // 한 DB를 함께 쓰므로 순서대로 실행
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "ko-KR",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      // PC에 설치된 브라우저 사용 (기본 Edge). 내려받은 Chromium을 쓰려면 PW_CHANNEL=chromium
      use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL ?? "msedge" },
    },
  ],
  webServer: {
    // 테스트 DB를 새로 만든 뒤 서버 시작
    command: `node tests/e2e/prepare-db.mjs && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: e2eEnv,
  },
});
