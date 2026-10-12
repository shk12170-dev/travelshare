"use client";

import { useActionState } from "react";
import Link from "next/link";
import FormField, { FormError, inputClass } from "./FormField";
import { signIn, signUp } from "@/app/(auth)/actions";
import { NICKNAME_LIMITS, PASSWORD_LIMITS } from "@/lib/validation";

// mode: "login" | "signup"
// showForgot: 비밀번호 찾기 링크 표시 여부 (메일 발송이 가능할 때만)
export default function AuthForm({ mode, next, showForgot = true }) {
  const isSignup = mode === "signup";
  const [state, formAction, pending] = useActionState(isSignup ? signUp : signIn, { errors: {}, values: {} });
  const { errors, values } = state;
  const query = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormError message={errors.form} />

      {isSignup && (
        <FormField label="닉네임" error={errors.nickname}>
          <input
            name="nickname"
            className={inputClass}
            defaultValue={values.nickname}
            maxLength={NICKNAME_LIMITS.max}
            autoComplete="nickname"
            required
          />
        </FormField>
      )}

      <FormField label="이메일" error={errors.email}>
        <input
          name="email"
          type="email"
          className={inputClass}
          defaultValue={values.email}
          autoComplete="email"
          required
        />
      </FormField>

      <FormField label="비밀번호" error={errors.password}>
        <input
          name="password"
          type="password"
          className={inputClass}
          maxLength={PASSWORD_LIMITS.max}
          autoComplete={isSignup ? "new-password" : "current-password"}
          placeholder={isSignup ? `${PASSWORD_LIMITS.min}자 이상` : undefined}
          required
        />
      </FormField>

      {isSignup && (
        <FormField label="비밀번호 확인" error={errors.passwordConfirm}>
          <input
            name="passwordConfirm"
            type="password"
            className={inputClass}
            maxLength={PASSWORD_LIMITS.max}
            autoComplete="new-password"
            required
          />
        </FormField>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-900"
      >
        {pending ? "처리 중..." : isSignup ? "가입하기" : "로그인"}
      </button>

      {!isSignup && showForgot && (
        <Link href="/forgot-password" className="text-center text-sm text-muted underline-offset-2 hover:underline">
          비밀번호를 잊으셨나요?
        </Link>
      )}

      <p className="text-center text-sm text-muted">
        {isSignup ? "이미 계정이 있나요? " : "아직 계정이 없나요? "}
        <Link href={`${isSignup ? "/login" : "/signup"}${query}`} className="font-semibold text-brand">
          {isSignup ? "로그인" : "회원가입"}
        </Link>
      </p>
    </form>
  );
}
