// DB 위치. .env의 DATABASE_URL이 있으면 그 값을, 없으면 기본 개발용 파일을 사용
// (Prisma CLI, seed 스크립트, 앱이 모두 이 값을 공유)
export const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
