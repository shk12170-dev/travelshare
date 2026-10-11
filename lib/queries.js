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
    include: withAuthor,
    take,
  });
  return rows.map(toLog);
}

export async function getLog(id) {
  const row = await prisma.travelLog.findUnique({ where: { id }, include: withAuthor });
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
