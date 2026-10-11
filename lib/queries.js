import "server-only";
import { prisma } from "./db";

// DB 행을 화면 컴포넌트가 쓰는 형태로 변환

const dateFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" });

function toCourse(row) {
  return {
    ...row,
    stops: row.stops?.map(({ name, note }) => ({ name, note })) ?? [],
  };
}

function toLog(row) {
  return {
    id: row.id,
    title: row.title,
    region: row.region,
    companion: row.companion,
    cover: row.cover,
    excerpt: row.excerpt,
    body: row.body.split(/\n\s*\n/).filter((p) => p.trim()),
    tips: row.tips,
    likes: row.likes,
    commentCount: row._count?.comments ?? 0,
    date: dateFormatter.format(row.createdAt),
    author: row.author.nickname,
    authorId: row.authorId,
    courseId: row.courseId,
  };
}

function toMedia(row) {
  return {
    id: row.id,
    type: row.type,
    caption: row.caption,
    region: row.region,
    cover: row.cover,
    src: row.fileName ? `/api/media/${row.id}/file` : null,
    mimeType: row.mimeType,
    duration: row.duration,
    likes: row.likes,
    author: row.author.nickname,
    authorId: row.authorId,
  };
}

const withAuthor = { author: { select: { nickname: true } } };
const logInclude = { ...withAuthor, _count: { select: { comments: true } } };

// 페이지 번호 정리: 1 이상 정수, 너무 큰 값은 제한
export function pageNumber(value) {
  const n = Number.parseInt(String(value ?? "1"), 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 1000) : 1;
}

// 한 페이지만 가져옴. 다음 페이지가 있는지는 1개를 더 읽어서 판단 (전체 개수 계산 없이)
async function paginate(findMany, { page, pageSize }) {
  const rows = await findMany({ skip: (page - 1) * pageSize, take: pageSize + 1 });
  return { rows: rows.slice(0, pageSize), page, hasPrev: page > 1, hasNext: rows.length > pageSize };
}

export const PAGE_SIZES = { logs: 12, media: 24 };

export async function getCourses() {
  const rows = await prisma.course.findMany({
    orderBy: { likes: "desc" },
    take: 100,
    include: { stops: { orderBy: { order: "asc" } } },
  });
  return rows.map(toCourse);
}

export async function getCourse(id) {
  const row = await prisma.course.findUnique({
    where: { id },
    include: { stops: { orderBy: { order: "asc" } } },
  });
  return row && toCourse(row);
}

export async function getLogs({ authorId, courseId, take } = {}) {
  const rows = await prisma.travelLog.findMany({
    where: { authorId, courseId },
    orderBy: { createdAt: "desc" },
    include: logInclude,
    take,
  });
  return rows.map(toLog);
}

export async function getLog(id) {
  const row = await prisma.travelLog.findUnique({ where: { id }, include: logInclude });
  return row && toLog(row);
}

export async function getMediaItems({ authorId, take } = {}) {
  const rows = await prisma.mediaItem.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    include: withAuthor,
    take,
  });
  return rows.map(toMedia);
}

export async function getLogPage({ page = 1, authorId } = {}) {
  const result = await paginate(
    (args) =>
      prisma.travelLog.findMany({ where: { authorId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: logInclude, ...args }),
    { page, pageSize: PAGE_SIZES.logs },
  );
  return { ...result, items: result.rows.map(toLog) };
}

export async function getMediaPage({ page = 1, type, authorId } = {}) {
  const result = await paginate(
    (args) =>
      prisma.mediaItem.findMany({ where: { type, authorId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: withAuthor, ...args }),
    { page, pageSize: PAGE_SIZES.media },
  );
  return { ...result, items: result.rows.map(toMedia) };
}

export async function getUser(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getComments(logId) {
  // 최근 200개까지 (그 이상은 댓글 페이지 나누기 필요)
  const rows = await prisma.comment.findMany({
    where: { logId },
    orderBy: { createdAt: "desc" },
    include: withAuthor,
    take: 200,
  });
  rows.reverse();
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    authorId: row.authorId,
    author: row.author.nickname,
    date: dateFormatter.format(row.createdAt),
  }));
}

// 사용자가 좋아요한 대상 ID 목록 (화면에 하트 표시용)
export async function getLikedIds(userId, targetType, targetIds) {
  if (!userId || targetIds.length === 0) return new Set();
  const rows = await prisma.like.findMany({
    where: { userId, targetType, targetId: { in: targetIds } },
    select: { targetId: true },
  });
  return new Set(rows.map((row) => row.targetId));
}

// 통합 검색: 코스·로그·미디어에서 제목·지역·내용을 찾음
export async function search(query) {
  const q = query.trim().slice(0, 50);
  if (!q) return { courses: [], logs: [], media: [] };
  const [courses, logs, media] = await Promise.all([
    prisma.course.findMany({
      where: { OR: [{ title: { contains: q } }, { region: { contains: q } }, { summary: { contains: q } }] },
      orderBy: { likes: "desc" },
      include: { stops: { orderBy: { order: "asc" } } },
      take: 20,
    }),
    prisma.travelLog.findMany({
      where: { OR: [{ title: { contains: q } }, { region: { contains: q } }, { body: { contains: q } }] },
      orderBy: { createdAt: "desc" },
      include: logInclude,
      take: 20,
    }),
    prisma.mediaItem.findMany({
      where: { OR: [{ caption: { contains: q } }, { region: { contains: q } }] },
      orderBy: { createdAt: "desc" },
      include: withAuthor,
      take: 30,
    }),
  ]);
  return { courses: courses.map(toCourse), logs: logs.map(toLog), media: media.map(toMedia) };
}

// 사용자가 좋아요한 코스 (프로필의 "찜한 코스")
export async function getLikedCourses(userId) {
  const likes = await prisma.like.findMany({
    where: { userId, targetType: "course" },
    orderBy: { createdAt: "desc" },
    select: { targetId: true },
    take: 30,
  });
  if (likes.length === 0) return [];
  const rows = await prisma.course.findMany({
    where: { id: { in: likes.map((l) => l.targetId) } },
    include: { stops: { orderBy: { order: "asc" } } },
  });
  const order = new Map(likes.map((l, i) => [l.targetId, i]));
  return rows.map(toCourse).sort((a, b) => order.get(a.id) - order.get(b.id));
}

// 프로필 통계: 목록은 일부만 보여 주므로 개수와 좋아요 합계는 DB에서 따로 계산
export async function getUserStats(userId) {
  const [logs, media, logLikes, mediaLikes] = await Promise.all([
    prisma.travelLog.count({ where: { authorId: userId } }),
    prisma.mediaItem.count({ where: { authorId: userId } }),
    prisma.travelLog.aggregate({ where: { authorId: userId }, _sum: { likes: true } }),
    prisma.mediaItem.aggregate({ where: { authorId: userId }, _sum: { likes: true } }),
  ]);
  return { logs, media, likes: (logLikes._sum.likes ?? 0) + (mediaLikes._sum.likes ?? 0) };
}
