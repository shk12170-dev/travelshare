import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { PASSWORD_LIMITS } from "./validation";

// 운영 환경에서는 BETTER_AUTH_SECRET(32자 이상 무작위 값)이 반드시 필요합니다.
// 개발 환경에서 값이 없으면 Better Auth의 기본값을 사용합니다.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_LIMITS.min,
    maxPasswordLength: PASSWORD_LIMITS.max,
  },
  user: {
    // Better Auth의 name을 User.nickname 컬럼에 저장
    fields: { name: "nickname" },
  },
  telemetry: { enabled: false },
  // 서버 액션에서 로그인·가입할 때 쿠키를 설정하도록 마지막에 둠
  plugins: [nextCookies()],
});
