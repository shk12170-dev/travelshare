// 샘플 데이터를 DB에 넣습니다. 여러 번 실행해도 같은 결과가 되도록 upsert를 사용합니다.
// 실행: npm run db:seed
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../generated/prisma/client.mts";
import { databaseUrl } from "./database-url.mjs";
import { demoAccount, users } from "./seed-data/users.mjs";
import { courses } from "./seed-data/courses.mjs";
import { logs } from "./seed-data/logs.mjs";
import { mediaItems } from "./seed-data/media.mjs";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
});

async function main() {
  for (const user of users) {
    await prisma.user.upsert({ where: { id: user.id }, update: user, create: user });
  }

  // 데모 계정 비밀번호 (Better Auth와 같은 방식으로 해시해서 저장)
  const password = await hashPassword(demoAccount.password);
  const credential = { providerId: "credential", accountId: demoAccount.userId, userId: demoAccount.userId };
  const existing = await prisma.account.findFirst({ where: credential, select: { id: true } });
  if (existing) await prisma.account.update({ where: { id: existing.id }, data: { password } });
  else await prisma.account.create({ data: { ...credential, id: `seed-${demoAccount.userId}`, password } });

  for (const { stops, ...course } of courses) {
    await prisma.course.upsert({ where: { id: course.id }, update: course, create: course });
    await prisma.courseStop.deleteMany({ where: { courseId: course.id } });
    await prisma.courseStop.createMany({
      data: stops.map((stop, index) => ({ ...stop, order: index + 1, courseId: course.id })),
    });
  }

  for (const { date, body, ...log } of logs) {
    const data = { ...log, body: body.join("\n\n"), createdAt: new Date(`${date}T09:00:00+09:00`) };
    await prisma.travelLog.upsert({ where: { id: log.id }, update: data, create: data });
  }

  for (const item of mediaItems) {
    await prisma.mediaItem.upsert({ where: { id: item.id }, update: item, create: item });
  }

  console.log(
    `사용자 ${users.length}, 코스 ${courses.length}, 로그 ${logs.length}, 미디어 ${mediaItems.length}건 입력 완료`,
  );
  console.log(`데모 계정: ${demoAccount.email} (비밀번호는 prisma/seed-data/users.mjs 참고)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
