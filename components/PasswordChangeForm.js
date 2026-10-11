"use client";

import { useActionState } from "react";
import FormField, { FormError, inputClass } from "./FormField";
import { changePassword } from "@/app/profile/actions";
import { PASSWORD_LIMITS } from "@/lib/validation";

export default function PasswordChangeForm() {
  const [state, formAction, pending] = useActionState(changePassword, { errors: {} });
  const { errors } = state;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={errors.form} />
      {state.done && (
        <p role="status" className="rounded-lg bg-brand-soft p-3 text-sm text-brand">
          비밀번호를 변경했습니다. 다른 기기의 로그인은 해제되었습니다.
        </p>
      )}
      <FormField label="현재 비밀번호" error={errors.currentPassword}>
        <input name="currentPassword" type="password" className={inputClass} autoComplete="current-password" required />
      </FormField>
      <FormField label="새 비밀번호" error={errors.newPassword}>
        <input
          name="newPassword"
          type="password"
          className={inputClass}
          maxLength={PASSWORD_LIMITS.max}
          autoComplete="new-password"
          placeholder={`${PASSWORD_LIMITS.min}자 이상`}
          required
        />
      </FormField>
      <FormField label="새 비밀번호 확인" error={errors.confirm}>
        <input name="confirm" type="password" className={inputClass} maxLength={PASSWORD_LIMITS.max} autoComplete="new-password" required />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full border border-border px-5 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
