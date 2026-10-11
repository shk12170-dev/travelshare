"use client";

import { useActionState } from "react";
import Link from "next/link";
import FormField, { FormError, inputClass } from "./FormField";
import { requestPasswordReset, resetPassword } from "@/app/(auth)/actions";
import { PASSWORD_LIMITS } from "@/lib/validation";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, { errors: {}, values: {} });

  if (state.sent) {
    return (
      <div role="status" className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 text-sm">
        <p>
          <strong>{state.values.email}</strong>로 가입된 계정이 있으면 비밀번호 재설정 링크를 보냈습니다. 메일함(스팸함 포함)을
          확인하세요. 링크는 1시간 동안 유효합니다.
        </p>
        <Link href="/login" className="font-semibold text-brand">
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormError message={state.errors.form} />
      <FormField label="가입한 이메일" error={state.errors.email}>
        <input name="email" type="email" className={inputClass} defaultValue={state.values.email} autoComplete="email" required />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-900"
      >
        {pending ? "보내는 중..." : "재설정 링크 받기"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }) {
  const [state, formAction, pending] = useActionState(resetPassword, { errors: {} });

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.errors.form} />
      <FormField label="새 비밀번호" error={state.errors.password}>
        <input
          name="password"
          type="password"
          className={inputClass}
          maxLength={PASSWORD_LIMITS.max}
          autoComplete="new-password"
          placeholder={`${PASSWORD_LIMITS.min}자 이상`}
          required
        />
      </FormField>
      <FormField label="새 비밀번호 확인" error={state.errors.passwordConfirm}>
        <input name="passwordConfirm" type="password" className={inputClass} maxLength={PASSWORD_LIMITS.max} autoComplete="new-password" required />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-900"
      >
        {pending ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
