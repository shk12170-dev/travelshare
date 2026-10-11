"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hit, limitMessage } from "@/lib/rateLimit";
import { validatePasswordChange, validateProfile } from "@/lib/validation";

const LOGIN_REQUIRED = { form: "로그인이 필요합니다." };

export async function updateProfile(prevState, formData) {
  const values = {
    nickname: String(formData.get("nickname") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    avatar: String(formData.get("avatar") ?? ""),
    favoriteThemes: formData.getAll("favoriteThemes").map(String),
  };
  const user = await getCurrentUser();
  if (!user) return { errors: LOGIN_REQUIRED, values };

  const errors = validateProfile(values);
  if (Object.keys(errors).length > 0) return { errors, values };

  const limit = hit("profileUpdate", user.id);
  if (!limit.ok) return { errors: { form: limitMessage(limit.retryAfterSec) }, values };

  const nickname = values.nickname.trim();
  const taken = await prisma.user.findUnique({ where: { nickname }, select: { id: true } });
  if (taken && taken.id !== user.id) return { errors: { nickname: "이미 사용 중인 닉네임입니다." }, values };

  await prisma.user.update({
    where: { id: user.id },
    data: { nickname, bio: values.bio.trim(), avatar: values.avatar, favoriteThemes: values.favoriteThemes },
  });
  redirect("/profile?updated=1");
}

export async function changePassword(prevState, formData) {
  const values = {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  };
  const user = await getCurrentUser();
  if (!user) return { errors: LOGIN_REQUIRED };

  const errors = validatePasswordChange(values);
  if (Object.keys(errors).length > 0) return { errors };

  // 현재 비밀번호 대입 방지
  const limit = hit("passwordChange", user.id);
  if (!limit.ok) return { errors: { form: limitMessage(limit.retryAfterSec) } };

  try {
    await getAuth().api.changePassword({
      // 비밀번호를 바꾸면 다른 기기의 로그인은 해제
      body: { currentPassword: values.currentPassword, newPassword: values.newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (error) {
    const code = error instanceof APIError ? error.body?.code : null;
    if (code === "INVALID_PASSWORD") return { errors: { currentPassword: "현재 비밀번호가 올바르지 않습니다." } };
    if (code === "CREDENTIAL_ACCOUNT_NOT_FOUND")
      return { errors: { form: "소셜 로그인으로 가입한 계정은 비밀번호를 바꿀 수 없습니다." } };
    console.error("비밀번호 변경 실패", error);
    return { errors: { form: "처리 중 문제가 발생했습니다. 잠시 후 다시 시도하세요." } };
  }
  return { errors: {}, done: true };
}
