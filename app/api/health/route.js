import { isCloudMode } from "@/prisma/cloud.mjs";

// 배포 상태 점검: GET /api/health
// 비밀값은 내보내지 않고, 설정이 "있는지"와 어느 단계에서 실패했는지만 알려 줍니다.
export const dynamic = "force-dynamic";

// 오류 문장에서 주소·토큰처럼 보이는 부분을 가림
function safeMessage(error) {
  return String(error?.message ?? error)
    .replace(/(libsql|https?|wss?):\/\/[^\s"')]+/g, "<주소>")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<토큰>")
    .replace(/vercel_blob_rw_\w+/g, "<토큰>")
    .slice(0, 300);
}

async function step(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Date.now() - started, ...(detail ? { detail } : {}) };
  } catch (error) {
    return { name, ok: false, ms: Date.now() - started, error: `${error?.name ?? "Error"}: ${safeMessage(error)}` };
  }
}

export async function GET() {
  const env = process.env;
  const config = {
    cloudMode: isCloudMode(),
    region: env.VERCEL_REGION ?? null,
    TURSO_DATABASE_URL: Boolean(env.TURSO_DATABASE_URL),
    TURSO_AUTH_TOKEN: Boolean(env.TURSO_AUTH_TOKEN),
    BETTER_AUTH_SECRET: Boolean(env.BETTER_AUTH_SECRET),
    BLOB_READ_WRITE_TOKEN: Boolean(env.BLOB_READ_WRITE_TOKEN),
    siteUrl: env.BETTER_AUTH_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : null),
  };

  const checks = [];
  checks.push(
    await step("db", async () => {
      const { prisma } = await import("@/lib/db");
      const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM "Course"`);
      return `코스 ${Number(rows[0].n)}개`;
    }),
  );
  checks.push(
    await step("auth", async () => {
      const { getAuth } = await import("@/lib/auth");
      const auth = getAuth();
      await auth.$context;
      return "설정 정상";
    }),
  );
  checks.push(
    await step("storage", async () => {
      const { driver } = await import("@/lib/mediaStorage");
      return driver();
    }),
  );

  const ok = checks.every((c) => c.ok);
  return Response.json({ ok, config, checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
