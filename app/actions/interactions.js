"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hit, limitMessage } from "@/lib/rateLimit";
import { COMMENT_LIMITS, validateComment } from "@/lib/validation";

// 좋아요 대상별 테이블
const likeTargets = {
  course: (tx) => tx.course,
  log: (tx) => tx.travelLog,
  media: (tx) => tx.mediaItem,
};

// 좋아요 누르기/취소. 결과: { liked, likes } 또는 { error }
export async function toggleLike(targetType, targetId) {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const model = likeTargets[targetType];
  if (!model || typeof targetId !== "string") return { error: "잘못된 요청입니다." };
  const limit = await hit("like", user.id);
  if (!limit.ok) return { error: limitMessage(limit.retryAfterSec) };

  try {
    return await prisma.$transaction(async (tx) => {
      const target = await model(tx).findUnique({ where: { id: targetId }, select: { id: true } });
      if (!target) return { error: "삭제되었거나 없는 항목입니다." };

      const key = { userId_targetType_targetId: { userId: user.id, targetType, targetId } };
      const existing = await tx.like.findUnique({ where: key });
      if (existing) {
        await tx.like.delete({ where: key });
      } else {
        await tx.like.create({ data: { userId: user.id, targetType, targetId } });
      }
      const updated = await model(tx).update({
        where: { id: targetId },
        data: { likes: { increment: existing ? -1 : 1 } },
        select: { likes: true },
      });
      return { liked: !existing, likes: Math.max(0, updated.likes) };
    });
  } catch (error) {
    console.error("좋아요 처리 실패", error);
    return { error: "잠시 후 다시 시도하세요." };
  }
}

// 팔로우 누르기/취소. 결과: { following, followers } 또는 { error }
export async function toggleFollow(targetUserId) {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  if (typeof targetUserId !== "string") return { error: "잘못된 요청입니다." };
  if (targetUserId === user.id) return { error: "자기 자신은 팔로우할 수 없습니다." };
  const limit = await hit("follow", user.id);
  if (!limit.ok) return { error: limitMessage(limit.retryAfterSec) };

  try {
    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!target) return { error: "없는 사용자입니다." };

    const key = { followerId_followingId: { followerId: user.id, followingId: targetUserId } };
    const existing = await prisma.follow.findUnique({ where: key });
    if (existing) await prisma.follow.delete({ where: key });
    else await prisma.follow.create({ data: { followerId: user.id, followingId: targetUserId } });
    const followers = await prisma.follow.count({ where: { followingId: targetUserId } });
    return { following: !existing, followers };
  } catch (error) {
    // 동시에 두 번 눌러 이미 처리된 경우 등
    console.error("팔로우 처리 실패", error);
    return { error: "잠시 후 다시 시도하세요." };
  }
}

// 사용: addComment.bind(null, logId)
export async function addComment(logId, prevState, formData) {
  const body = String(formData.get("body") ?? "");
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다.", body };

  const error = validateComment(body);
  if (error) return { error, body };

  const limit = await hit("comment", user.id);
  if (!limit.ok) return { error: limitMessage(limit.retryAfterSec), body };

  const log = await prisma.travelLog.findUnique({ where: { id: logId }, select: { id: true } });
  if (!log) return { error: "삭제되었거나 없는 로그입니다.", body };

  await prisma.comment.create({
    data: { body: body.trim().slice(0, COMMENT_LIMITS.max), logId, authorId: user.id },
  });
  revalidatePath(`/log/${logId}`);
  return { error: null, body: "", savedAt: Date.now() };
}

// 댓글 삭제: 댓글 작성자 또는 로그 작성자만 가능. 사용: deleteComment.bind(null, commentId)
export async function deleteComment(commentId) {
  const user = await getCurrentUser();
  if (!user) return { errors: { form: "로그인이 필요합니다." } };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, logId: true, log: { select: { authorId: true } } },
  });
  if (!comment) return { errors: { form: "이미 삭제된 댓글입니다." } };
  if (comment.authorId !== user.id && comment.log.authorId !== user.id) {
    return { errors: { form: "삭제 권한이 없습니다." } };
  }

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(`/log/${comment.logId}`);
  return null;
}
