import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { sendMail } from "./mail";
import { NICKNAME_LIMITS, PASSWORD_LIMITS } from "./validation";

// 소셜 로그인: 환경 변수에 키가 있는 서비스만 켜짐
const socialEnv = {
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  kakao: ["KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET"],
};

export const socialLabels = { google: "Google", kakao: "카카오" };

export function enabledSocialProviders() {
  return Object.keys(socialEnv).filter((id) => socialEnv[id].every((name) => process.env[name]));
}

function socialProviders() {
  return Object.fromEntries(
    enabledSocialProviders().map((id) => [
      id,
      { clientId: process.env[socialEnv[id][0]], clientSecret: process.env[socialEnv[id][1]] },
    ]),
  );
}

// 소셜 로그인 이름이 이미 쓰이는 닉네임이면 뒤에 숫자를 붙여 겹치지 않게 함
async function uniqueNickname(name) {
  const base = (name || "여행자").trim().slice(0, NICKNAME_LIMITS.max - 4) || "여행자";
  if (!(await prisma.user.findUnique({ where: { nickname: base }, select: { id: true } }))) return base;
  for (let i = 0; i < 20; i++) {
    const candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    if (!(await prisma.user.findUnique({ where: { nickname: candidate }, select: { id: true } }))) return candidate;
  }
  return `${base}${Date.now().toString().slice(-4)}`;
}

// 운영 환경에서는 BETTER_AUTH_SECRET(32자 이상 무작위 값)이 반드시 필요합니다.
// 개발 환경에서 값이 없으면 Better Auth의 기본값을 사용합니다.
// 빌드 중에는 비밀키 검사가 실행되지 않도록 처음 사용할 때 생성합니다.
let instance;

export function getAuth() {
  instance ??= createAuth();
  return instance;
}

function createAuth() {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: "sqlite" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_LIMITS.min,
      maxPasswordLength: PASSWORD_LIMITS.max,
      resetPasswordTokenExpiresIn: 60 * 60,
      // 비밀번호를 재설정하면 다른 기기의 로그인도 모두 해제
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        const siteUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
        const link = `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
        await sendMail({
          to: user.email,
          subject: "[TravelShare] 비밀번호 재설정 안내",
          text: `아래 링크에서 새 비밀번호를 설정하세요. 링크는 1시간 동안 유효합니다.\n\n${link}\n\n요청하지 않았다면 이 메일을 무시하세요.`,
        });
      },
    },
    socialProviders: socialProviders(),
    user: {
      // Better Auth의 name을 User.nickname 컬럼에 저장
      fields: { name: "nickname" },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, name: await uniqueNickname(user.name) } }),
        },
      },
    },
    telemetry: { enabled: false },
    // 서버 액션에서 로그인·가입할 때 쿠키를 설정하도록 마지막에 둠
    plugins: [nextCookies()],
  });
}
