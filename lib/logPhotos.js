import "server-only";
import { prisma } from "./db";
import { MAX_LOG_PHOTOS } from "./logPhotoLimits";
import { deleteMedia } from "./mediaStorage";

// 로그에 사진을 붙이는 규칙
// - 로그 작성 화면에서 올린 사진은 "임시(draft)" 상태로 저장되고, 로그를 저장할 때 로그에 연결됩니다.
// - 임시 상태의 사진은 미디어 목록·검색·통계에 나오지 않습니다.

// 화면이 보낸 사진 ID 목록(JSON)을 정리: 문자열만, 중복 제거, 최대 개수 제한
export function parseMediaIds(value) {
  let parsed;
  try {
    parsed = JSON.parse(String(value ?? "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const ids = parsed.filter((id) => typeof id === "string" && id.length > 0 && id.length <= 40);
  return [...new Set(ids)].slice(0, MAX_LOG_PHOTOS);
}

// 로그에 붙일 사진을 확정한다.
// - 목록에 있고 내 사진이며 아직 다른 로그에 붙지 않은 것만 연결
// - 예전에 붙어 있었지만 목록에서 빠진 사진은 삭제(DB와 파일)
export async function syncLogPhotos({ logId, userId, title, region, mediaIds }) {
  const requested = await prisma.mediaItem.findMany({
    where: { id: { in: mediaIds }, authorId: userId, type: "photo", OR: [{ logId: null }, { logId }] },
    select: { id: true },
  });
  const keepIds = new Set(requested.map((m) => m.id));

  const attached = await prisma.mediaItem.findMany({ where: { logId }, select: { id: true, fileName: true } });
  const removed = attached.filter((m) => !keepIds.has(m.id));

  const caption = title.slice(0, 100);
  await prisma.$transaction([
    ...(removed.length
      ? [
          prisma.like.deleteMany({ where: { targetType: "media", targetId: { in: removed.map((m) => m.id) } } }),
          prisma.mediaItem.deleteMany({ where: { id: { in: removed.map((m) => m.id) } } }),
        ]
      : []),
    prisma.mediaItem.updateMany({ where: { id: { in: [...keepIds] } }, data: { logId, draft: false, caption, region } }),
  ]);

  await Promise.all(removed.map((m) => deleteMedia(m.fileName)));
  return { attached: keepIds.size, removed: removed.length };
}

// 로그를 지울 때: 붙어 있던 사진의 좋아요 기록을 지우고, 로그 삭제 후 파일을 삭제할 수 있게 목록을 돌려줌
export async function prepareLogDeletion(logId) {
  const photos = await prisma.mediaItem.findMany({ where: { logId }, select: { id: true, fileName: true } });
  return {
    photos,
    cleanup: () => Promise.all(photos.map((p) => deleteMedia(p.fileName))),
    likeDeletion: photos.length
      ? [prisma.like.deleteMany({ where: { targetType: "media", targetId: { in: photos.map((p) => p.id) } } })]
      : [],
  };
}

// 24시간이 지나도록 로그에 연결되지 않은 임시 사진을 정리 (작성하다 떠난 경우)
export async function cleanupOldDrafts(userId, now = Date.now()) {
  const cutoff = new Date(now - 24 * 3600_000);
  const drafts = await prisma.mediaItem.findMany({
    where: { authorId: userId, draft: true, logId: null, createdAt: { lt: cutoff } },
    select: { id: true, fileName: true },
  });
  if (drafts.length === 0) return 0;
  await prisma.mediaItem.deleteMany({ where: { id: { in: drafts.map((d) => d.id) } } });
  await Promise.all(drafts.map((d) => deleteMedia(d.fileName)));
  return drafts.length;
}
