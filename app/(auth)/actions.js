"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { enabledSocialProviders, getAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientIp, hit, limitMessage } from "@/lib/rateLimit";
import { safeReturnPath } from "@/lib/session";
import { validateLogin, validatePasswordChange, validateSignup } from "@/lib/validation";

function field(formData, name) {
  return String(formData.get(name) ?? "");
}

// 여러 횟수 제한 규칙을 모두 확인. 하나라도 넘으면 안내 문장, 아니면 null
function checkLimits(...rules) {
  for (const [rule, id] of rules) {
    const result = hit(rule, id);
    if (!result.ok) return limitMessage(result.retryAfterSec);
  }
  return null;
}

// Better Auth 오류 코드를 사용자에게 보여 줄 문장으로 변환
function authErrorMessage(error) {
  const code = error instanceof APIError ? error.body?.code : null;
  switch (code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return { email: "이미 가입된 이메일입니다." };
    case "INVALID_EMAIL_OR_PASSWORD":
      return { form: "이메일 또는 비밀번호가 올바르지 않습니다." };
    case "INVALID_EMAIL":
      return { email: "올바른 이메일 주소를 입력하세요." };
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      return { password: "비밀번호 길이를 확인하세요." };
    case "INVALID_TOKEN":
      return { form: "링크가 만료되었거나 올바르지 않습니다. 비밀번호 재설정을 다시 요청하세요." };
    case "INVALID_PASSWORD":
      return { currentPassword: "현재 비밀번호가 올바르지 않습니다." };
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return { form: "소셜 로그인으로 가입한 계정은 비밀번호가 없습니다." };
    default:
      if (error instanceof APIError && error.status === "TOO_MANY_REQUESTS")
        return { form: "시도가 너무 많습니다. 잠시 후 다시 시도하세요." };
      console.error("인증 처리 실패", error);
      return { form: "처리 중 문제가 발생했습니다. 잠시 후 다시 시도하세요." };
  }
}

export async function signUp(prevState, formData) {
  const values = {
    nickname: field(formData, "nickname"),
    email: field(formData, "email"),
    password: field(formData, "password"),
    passwordConfirm: field(formData, "passwordConfirm"),
  };
  // 비밀번호는 화면으로 되돌려 보내지 않음
  const echo = { nickname: values.nickname, email: values.email };

  const errors = validateSignup(values);
  if (Object.keys(errors).length > 0) return { errors, values: echo };

  const ip = clientIp(await headers());
  const limited = checkLimits(["signUpPerIp", ip], ["signUpGlobal", "all"]);
  if (limited) return { errors: { form: limited }, values: echo };

  const nickname = values.nickname.trim();
  if (await prisma.user.findUnique({ where: { nickname }, select: { id: true } })) {
    return { errors: { nickname: "이미 사용 중인 닉네임입니다." }, values: echo };
  }

  try {
    await getAuth().api.signUpEmail({
      body: { name: nickname, email: values.email.trim().toLowerCase(), password: values.password },
      headers: await headers(),
    });
  } catch (error) {
    return { errors: authErrorMessage(error), values: echo };
  }

  redirect(safeReturnPath(formData.get("next")));
}

export async function signIn(prevState, formData) {
  const values = { email: field(formData, "email"), password: field(formData, "password") };
  const echo = { email: values.email };

  const errors = validateLogin(values);
  if (Object.keys(errors).length > 0) return { errors, values: echo };

  // 비밀번호 대입 공격 방지: 계정(이메일)별, IP별로 시도 횟수 제한
  const email = values.email.trim().toLowerCase();
  const limited = checkLimits(["signInPerEmail", email], ["signInPerIp", clientIp(await headers())]);
  if (limited) return { errors: { form: limited }, values: echo };

  try {
    await getAuth().api.signInEmail({
      body: { email: values.email.trim().toLowerCase(), password: values.password },
      headers: await headers(),
    });
  } catch (error) {
    return { errors: authErrorMessage(error), values: echo };
  }

  redirect(safeReturnPath(formData.get("next")));
}

export async function signOut() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}

// 소셜 로그인 시작: 서비스 로그인 화면 주소로 이동. 사용: signInSocial.bind(null, provider, next)
export async function signInSocial(provider, next) {
  if (!enabledSocialProviders().includes(provider)) redirect("/login?error=social");
  const result = await getAuth().api.signInSocial({
    body: { provider, callbackURL: safeReturnPath(next), errorCallbackURL: "/login?error=social" },
    headers: await headers(),
  });
  redirect(result.url);
}

// 비밀번호 재설정 메일 요청. 가입 여부를 알 수 없도록 항상 같은 안내를 보여 줌
export async function requestPasswordReset(prevState, formData) {
  const email = field(formData, "email").trim().toLowerCase();
  const errors = validateLogin({ email, password: "-" });
  if (errors.email) return { errors, values: { email } };

  const limited = checkLimits(
    ["resetRequestPerEmail", email],
    ["resetRequestPerIp", clientIp(await headers())],
    ["resetRequestGlobal", "all"],
  );
  if (limited) return { errors: { form: limited }, values: { email } };

  try {
    await getAuth().api.requestPasswordReset({ body: { email }, headers: await headers() });
  } catch (error) {
    const message = authErrorMessage(error);
    if (message.form?.startsWith("시도가")) return { errors: message, values: { email } };
  }
  return { errors: {}, values: { email }, sent: true };
}

export async function resetPassword(prevState, formData) {
  const token = field(formData, "token");
  const values = { password: field(formData, "password"), passwordConfirm: field(formData, "passwordConfirm") };
  const errors = validatePasswordChange({ currentPassword: "-", newPassword: values.password, confirm: values.passwordConfirm });
  if (Object.keys(errors).length > 0) return { errors: { password: errors.newPassword, passwordConfirm: errors.confirm } };

  const limited = checkLimits(["resetPerIp", clientIp(await headers())]);
  if (limited) return { errors: { form: limited } };

  try {
    await getAuth().api.resetPassword({ body: { token, newPassword: values.password }, headers: await headers() });
  } catch (error) {
    return { errors: authErrorMessage(error) };
  }
  redirect("/login?reset=1");
}
