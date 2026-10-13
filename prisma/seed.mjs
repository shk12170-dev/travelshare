// 샘플 데이터를 DB에 넣습니다. 여러 번 실행해도 같은 결과가 되도록 upsert를 사용합니다.
// 실행: npm run db:seed (로컬)  /  npm run db:seed:remote (Turso, .env의 DEMO_PASSWORD 필요)
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { applyRemoteFlag, createPrismaClient } from "./client-factory.mjs";
import { demoAccount, users } from "./seed-data/users.mjs";
import { courses } from "./seed-data/courses.mjs";
import { logs } from "./seed-data/logs.mjs";
import { mediaItems } from "./seed-data/media.mjs";

// 데모(평가자 체험) 계정 비밀번호
// - DEMO_PASSWORD 환경 변수가 있으면 그 값 사용 (12자 이상)
// - 없으면 저장소에 공개된 개발용 비밀번호를 쓰므로, 원격(배포) DB에서는 거부
const remote = applyRemoteFlag();
const demoPassword = process.env.DEMO_PASSWORD || (remote ? null : demoAccount.password);

if (process.env.DEMO_PASSWORD && process.env.DEMO_PASSWORD.length < 12) {
  console.error("DEMO_PASSWORD는 12자 이상이어야 합니다.");
  process.exit(1);
}
if (!demoPassword) {
  console.error(
    "원격 DB(Turso)에는 저장소에 공개된 데모 비밀번호로 계정을 만들 수 없습니다.\n" +
      "평가자용 체험 계정을 만들려면 DEMO_PASSWORD(12자 이상)를 .env에 넣고 다시 실행하세요.\n" +
      "코스 데이터만 넣으려면: npm run db:seed:courses",
  );
  process.exit(1);
}

const prisma = createPrismaClient();

async function main() {
  for (const user of users) {
    await prisma.user.upsert({ where: { id: user.id }, update: user, create: user });
  }

  // 샘플 사용자 전원의 비밀번호 (Better Auth와 같은 방식으로 해시해서 저장)
  // 평가자가 어느 샘플 계정으로도 로그인해 볼 수 있도록 같은 비밀번호를 사용
  const password = await hashPassword(demoPassword);
  for (const user of users) {
    const credential = { providerId: "credential", accountId: user.id, userId: user.id };
    const existing = await prisma.account.findFirst({ where: credential, select: { id: true } });
    if (existing) await prisma.account.update({ where: { id: existing.id }, data: { password } });
    else await prisma.account.create({ data: { ...credential, id: `seed-${user.id}`, password } });
  }

  for (const { stops, ...course } of courses) {
    // 다시 실행해도 사용자가 누른 좋아요 수는 유지 (likes는 처음 만들 때만 사용)
    const { likes: _courseLikes, ...courseRest } = course;
    await prisma.course.upsert({ where: { id: course.id }, update: courseRest, create: course });
    await prisma.courseStop.deleteMany({ where: { courseId: course.id } });
    await prisma.courseStop.createMany({
      data: stops.map((stop, index) => ({ ...stop, order: index + 1, courseId: course.id })),
    });
  }

  for (const { date, body, ...log } of logs) {
    const data = { ...log, body: body.join("\n\n"), createdAt: new Date(`${date}T09:00:00+09:00`) };
    const { likes: _logLikes, ...logRest } = data;
    await prisma.travelLog.upsert({ where: { id: log.id }, update: logRest, create: data });
  }

  for (const item of mediaItems) {
    const { likes: _mediaLikes, ...itemRest } = item;
    await prisma.mediaItem.upsert({ where: { id: item.id }, update: itemRest, create: item });
  }

  console.log(
    `사용자 ${users.length}, 코스 ${courses.length}, 로그 ${logs.length}, 미디어 ${mediaItems.length}건 입력 완료`,
  );
  console.log(
    `데모 계정: ${demoAccount.email} (비밀번호: ${process.env.DEMO_PASSWORD ? "DEMO_PASSWORD 값" : "prisma/seed-data/users.mjs 참고"})`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
