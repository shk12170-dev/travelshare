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

export async function getCourses() {
  const rows = await prisma.course.findMany({
    orderBy: { likes: "desc" },
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

export async function getMediaItems({ authorId } = {}) {
  const rows = await prisma.mediaItem.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    include: withAuthor,
  });
  return rows.map(toMedia);
}

export async function getUser(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getComments(logId) {
  const rows = await prisma.comment.findMany({
    where: { logId },
    orderBy: { createdAt: "asc" },
    include: withAuthor,
  });
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
  });
  if (likes.length === 0) return [];
  const rows = await prisma.course.findMany({
    where: { id: { in: likes.map((l) => l.targetId) } },
    include: { stops: { orderBy: { order: "asc" } } },
  });
  const order = new Map(likes.map((l, i) => [l.targetId, i]));
  return rows.map(toCourse).sort((a, b) => order.get(a.id) - order.get(b.id));
}
