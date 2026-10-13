import "server-only";
import { prisma } from "./db";
import { deleteMedia } from "./mediaStorage";

// 샘플·체험 계정(평가자 계정 등)은 화면에서 삭제할 수 없음. 지우면 샘플 데이터와 체험 계정이 함께 사라지기 때문
export const PROTECTED_EMAIL_SUFFIX = "@sample.travelshare.test";

export function isProtectedAccount(email) {
  return String(email ?? "").toLowerCase().endsWith(PROTECTED_EMAIL_SUFFIX);
}

// 계정과 그 사용자의 모든 데이터를 삭제
// - 내 글·댓글·세션·로그인 수단: 계정 삭제와 함께 자동 삭제(DB의 연쇄 삭제 규칙)
// - 내가 다른 글·코스·미디어에 누른 좋아요: 상대 글의 좋아요 수를 1씩 되돌린 뒤 기록 삭제
// - 내 글·미디어에 달린 좋아요 기록: 연결 규칙이 없어 직접 삭제
// - 올린 사진·영상 파일: DB 삭제가 끝난 뒤 저장소에서 삭제
// 결과: 삭제한 미디어 파일 수
export async function deleteAccountData(userId) {
  const media = await prisma.mediaItem.findMany({ where: { authorId: userId }, select: { fileName: true } });

  const decrement = (table, targetType) =>
    prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "likes" = MAX("likes" - 1, 0)
       WHERE "id" IN (SELECT "targetId" FROM "Like" WHERE "userId" = ? AND "targetType" = ?)`,
      userId,
      targetType,
    );

  await prisma.$transaction([
    decrement("Course", "course"),
    decrement("TravelLog", "log"),
    decrement("MediaItem", "media"),
    prisma.$executeRawUnsafe(
      `DELETE FROM "Like" WHERE "targetType" = 'log' AND "targetId" IN (SELECT "id" FROM "TravelLog" WHERE "authorId" = ?)`,
      userId,
    ),
    prisma.$executeRawUnsafe(
      `DELETE FROM "Like" WHERE "targetType" = 'media' AND "targetId" IN (SELECT "id" FROM "MediaItem" WHERE "authorId" = ?)`,
      userId,
    ),
    prisma.$executeRawUnsafe(`DELETE FROM "Like" WHERE "userId" = ?`, userId),
    // 비밀번호 재설정 요청 기록, 이 사용자의 횟수 제한 기록
    prisma.$executeRawUnsafe(`DELETE FROM "Verification" WHERE "value" = ?`, userId),
    prisma.$executeRawUnsafe(`DELETE FROM "RateLimit" WHERE "key" LIKE ?`, `%:${userId}`),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  // 파일은 DB 삭제가 성공한 뒤에 지움 (실패해도 계정 삭제는 유지, 남은 파일은 로그에 기록)
  const files = media.map((m) => m.fileName).filter(Boolean);
  await Promise.all(files.map((name) => deleteMedia(name)));
  return files.length;
}
