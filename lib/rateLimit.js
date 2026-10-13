import "server-only";
import { prisma } from "./db";

// 글쓰기·로그인 횟수 제한 (정해진 시간 동안 허용 횟수를 넘으면 거부)
// 기록을 DB에 저장하므로 서버가 여러 대로 나뉘어 돌아도(서버리스) 함께 셉니다.
// 한 번의 SQL로 "횟수 올리기 + 시간이 지났으면 초기화"를 처리해 동시에 여러 요청이 와도 정확합니다.

// 규칙: limit번 / windowMs 동안
export const RATE_LIMITS = {
  logCreate: { limit: 10, windowMs: 60 * 60_000 },
  logUpdate: { limit: 30, windowMs: 60 * 60_000 },
  comment: { limit: 20, windowMs: 10 * 60_000 },
  like: { limit: 60, windowMs: 60_000 },
  follow: { limit: 30, windowMs: 60_000 },
  upload: { limit: 30, windowMs: 60 * 60_000 },
  mediaDelete: { limit: 60, windowMs: 60 * 60_000 },
  profileUpdate: { limit: 10, windowMs: 60 * 60_000 },
  passwordChange: { limit: 5, windowMs: 60 * 60_000 },
  accountDelete: { limit: 5, windowMs: 60 * 60_000 },
  // 로그인·가입: 서버 액션은 Better Auth의 자체 제한을 거치지 않으므로 여기서 제한
  signInPerEmail: { limit: 10, windowMs: 15 * 60_000 },
  signInPerIp: { limit: 30, windowMs: 15 * 60_000 },
  signUpPerIp: { limit: 5, windowMs: 60 * 60_000 },
  resetRequestPerEmail: { limit: 3, windowMs: 60 * 60_000 },
  resetRequestPerIp: { limit: 10, windowMs: 60 * 60_000 },
  resetPerIp: { limit: 10, windowMs: 60 * 60_000 },
  // IP는 위조될 수 있으므로(아래 clientIp 참고) 서버 전체 상한을 함께 둠
  signUpGlobal: { limit: 100, windowMs: 60 * 60_000 },
  resetRequestGlobal: { limit: 100, windowMs: 60 * 60_000 },
};

// 요청한 사람의 IP. 마지막 값을 사용: 앞단 프록시(Vercel, nginx, Cloudflare 등)가 붙이는 값이라 위조할 수 없음
// 프록시 없이 직접 노출하면 이 값은 위조될 수 있으므로 운영 시 프록시가 이 헤더를 설정해야 합니다.
export function clientIp(headerList) {
  const forwarded = headerList.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || headerList.get("x-real-ip") || "unknown";
}

// 한 번 사용. 결과: { ok: true } 또는 { ok: false, retryAfterSec }
// DB 오류가 나면 서비스를 막지 않고 허용(fail-open)하되 로그를 남김
export async function hit(rule, id, now = Date.now()) {
  const { windowMs } = RATE_LIMITS[rule];
  // 테스트처럼 한 PC에서 많이 가입하는 경우를 위해 배수로 늘릴 수 있음 (운영에서는 설정하지 마세요)
  const limit = RATE_LIMITS[rule].limit * (Number(process.env.RATE_LIMIT_MULTIPLIER) || 1);
  const key = `${rule}:${id}`;

  try {
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (?, 1, ?)
       ON CONFLICT("key") DO UPDATE SET
         "count" = CASE WHEN "RateLimit"."resetAt" <= ? THEN 1 ELSE "RateLimit"."count" + 1 END,
         "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ? THEN ? ELSE "RateLimit"."resetAt" END
       RETURNING "count", "resetAt"`,
      key,
      now + windowMs,
      now,
      now,
      now + windowMs,
    );
    const count = Number(rows[0].count);
    const resetAt = Number(rows[0].resetAt);

    // 가끔 만료된 기록을 정리 (요청 100번에 한 번 정도)
    if (Math.random() < 0.01) {
      prisma.$executeRawUnsafe(`DELETE FROM "RateLimit" WHERE "resetAt" <= ?`, now).catch(() => {});
    }

    if (count > limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
    return { ok: true };
  } catch (error) {
    console.error("횟수 제한 기록 실패", error);
    return { ok: true };
  }
}

export function limitMessage(retryAfterSec) {
  const minutes = Math.ceil(retryAfterSec / 60);
  return minutes > 1 ? `요청이 너무 많습니다. 약 ${minutes}분 뒤에 다시 시도하세요.` : "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
}
