// 운영 DB용 초기 데이터: 여행 코스만 넣습니다 (사용자·로그·미디어·데모 계정은 넣지 않음).
// 실행: npm run db:seed:courses -- --remote   (Turso에 입력, 여러 번 실행해도 안전)
import "dotenv/config";
import { applyRemoteFlag, createPrismaClient } from "./client-factory.mjs";
import { courses } from "./seed-data/courses.mjs";

applyRemoteFlag();

const prisma = createPrismaClient();

try {
  for (const { stops, ...course } of courses) {
    // 다시 실행해도 사용자가 누른 좋아요 수는 유지 (likes는 처음 만들 때만 사용)
    const { likes, ...rest } = course;
    await prisma.course.upsert({ where: { id: course.id }, update: rest, create: course });
    await prisma.courseStop.deleteMany({ where: { courseId: course.id } });
    await prisma.courseStop.createMany({
      data: stops.map((stop, index) => ({ ...stop, order: index + 1, courseId: course.id })),
    });
  }
  console.log(`코스 ${courses.length}개 입력 완료`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
