// 글쓰기·로그인 횟수 제한 (정해진 시간 동안 허용 횟수를 넘으면 거부)
// 서버 메모리에 기록하므로 서버 한 대 기준입니다. 서버를 여러 대로 늘리면 DB나 Redis 저장 방식으로 바꿔야 합니다.

const buckets = new Map();
const MAX_KEYS = 10_000;

// 규칙: limit번 / windowMs 동안
export const RATE_LIMITS = {
  logCreate: { limit: 10, windowMs: 60 * 60_000 },
  logUpdate: { limit: 30, windowMs: 60 * 60_000 },
  comment: { limit: 20, windowMs: 10 * 60_000 },
  like: { limit: 60, windowMs: 60_000 },
  upload: { limit: 30, windowMs: 60 * 60_000 },
  mediaDelete: { limit: 60, windowMs: 60 * 60_000 },
  profileUpdate: { limit: 10, windowMs: 60 * 60_000 },
  passwordChange: { limit: 5, windowMs: 60 * 60_000 },
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

// 요청한 사람의 IP. Next는 X-Forwarded-For가 없을 때만 채우므로, 앞단 프록시(nginx·Cloudflare 등) 없이
// 직접 노출하면 이 값은 위조될 수 있습니다. 운영 시에는 프록시가 이 헤더를 설정하도록 하세요.
export function clientIp(headerList) {
  const forwarded = headerList.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || headerList.get("x-real-ip") || "unknown";
}

function sweep(now) {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

// 한 번 사용. 결과: { ok: true } 또는 { ok: false, retryAfterSec }
export function hit(rule, id, now = Date.now()) {
  const { windowMs } = RATE_LIMITS[rule];
  // E2E 테스트처럼 한 PC에서 많이 가입하는 경우를 위해 배수로 늘릴 수 있음 (운영에서는 설정하지 마세요)
  const limit = RATE_LIMITS[rule].limit * (Number(process.env.RATE_LIMIT_MULTIPLIER) || 1);
  const key = `${rule}:${id}`;
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) sweep(now);
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  return { ok: true };
}

export function limitMessage(retryAfterSec) {
  const minutes = Math.ceil(retryAfterSec / 60);
  return minutes > 1 ? `요청이 너무 많습니다. 약 ${minutes}분 뒤에 다시 시도하세요.` : "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
}

// 테스트용
export function resetRateLimits() {
  buckets.clear();
}
