"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hit, limitMessage } from "@/lib/rateLimit";
import { splitTips, validateLog } from "@/lib/validation";
import { cleanupOldDrafts, parseMediaIds, prepareLogDeletion, syncLogPhotos } from "@/lib/logPhotos";

const covers = [
  "from-sky-400 to-teal-500",
  "from-amber-300 to-rose-500",
  "from-violet-400 to-indigo-600",
  "from-emerald-300 to-teal-600",
  "from-orange-300 to-red-500",
];

const LOGIN_REQUIRED = { form: "로그인이 필요합니다. 로그인 후 다시 시도하세요." };
const NOT_OWNER = { form: "본인이 작성한 로그만 수정·삭제할 수 있습니다." };

function readForm(formData) {
  const field = (name) => String(formData.get(name) ?? "");
  return {
    title: field("title"),
    region: field("region"),
    companion: field("companion"),
    body: field("body"),
    tips: field("tips"),
    mediaIds: field("mediaIds"),
  };
}

function toData(values) {
  // mediaIds(첨부 사진 목록)는 로그 자체의 필드가 아니므로 제외
  const body = values.body.trim().replace(/\r\n/g, "\n");
  return {
    title: values.title.trim(),
    region: values.region,
    companion: values.companion,
    body,
    excerpt: body.replace(/\s+/g, " ").slice(0, 80),
    tips: splitTips(values.tips),
  };
}

// 로그인한 사용자가 이 로그의 작성자인지 확인
async function checkOwner(logId) {
  const user = await getCurrentUser();
  if (!user) return { error: LOGIN_REQUIRED };
  const log = await prisma.travelLog.findUnique({ where: { id: logId }, select: { authorId: true } });
  if (!log || log.authorId !== user.id) return { error: NOT_OWNER };
  return { user };
}

export async function createLog(prevState, formData) {
  const values = readForm(formData);
  const user = await getCurrentUser();
  if (!user) return { errors: LOGIN_REQUIRED, values };

  const errors = validateLog(values);
  if (Object.keys(errors).length > 0) return { errors, values };

  const limit = await hit("logCreate", user.id);
  if (!limit.ok) return { errors: { form: limitMessage(limit.retryAfterSec) }, values };

  let log;
  try {
    log = await prisma.travelLog.create({
      data: {
        ...toData(values),
        cover: covers[Math.floor(Math.random() * covers.length)],
        authorId: user.id,
      },
    });
  } catch (error) {
    console.error("로그 저장 실패", error);
    return { errors: { form: "저장 중 문제가 발생했습니다. 잠시 후 다시 시도하세요." }, values };
  }

  // redirect는 예외로 동작하므로 try 블록 밖에서 호출
  // 첨부 사진 연결과 오래된 임시 사진 정리. 실패해도 로그 저장은 유지
  try {
    await syncLogPhotos({
      logId: log.id,
      userId: user.id,
      title: log.title,
      region: log.region,
      mediaIds: parseMediaIds(values.mediaIds),
    });
    await cleanupOldDrafts(user.id);
  } catch (error) {
    console.error("사진 연결 실패", error);
  }

  redirect(`/log/${log.id}`);
}

// 사용: updateLog.bind(null, logId)
export async function updateLog(logId, prevState, formData) {
  const values = readForm(formData);
  const { error, user } = await checkOwner(logId);
  if (error) return { errors: error, values };

  const errors = validateLog(values);
  if (Object.keys(errors).length > 0) return { errors, values };

  const limit = await hit("logUpdate", user.id);
  if (!limit.ok) return { errors: { form: limitMessage(limit.retryAfterSec) }, values };

  try {
    const data = toData(values);
    await prisma.travelLog.update({ where: { id: logId }, data });
    await syncLogPhotos({
      logId,
      userId: user.id,
      title: data.title,
      region: data.region,
      mediaIds: parseMediaIds(values.mediaIds),
    });
  } catch (error) {
    console.error("로그 수정 실패", error);
    return { errors: { form: "저장 중 문제가 발생했습니다. 잠시 후 다시 시도하세요." }, values };
  }

  redirect(`/log/${logId}`);
}

// 사용: deleteLog.bind(null, logId)
export async function deleteLog(logId) {
  const { error } = await checkOwner(logId);
  if (error) return { errors: error };

  // 댓글과 첨부 사진 기록은 함께 삭제되고(Cascade), 좋아요 기록은 직접 정리. 사진 파일은 DB 삭제 뒤에 지움
  const { likeDeletion, cleanup } = await prepareLogDeletion(logId);
  await prisma.$transaction([
    ...likeDeletion,
    prisma.like.deleteMany({ where: { targetType: "log", targetId: logId } }),
    prisma.travelLog.delete({ where: { id: logId } }),
  ]);
  await cleanup();
  redirect("/log");
}
