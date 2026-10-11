"use client";

import { useActionState } from "react";
import FormField, { FormError, inputClass } from "./FormField";
import { updateProfile } from "@/app/profile/actions";
import { themes } from "@/data/options";
import { BIO_LIMITS, NICKNAME_LIMITS, avatarChoices } from "@/lib/validation";

export default function ProfileForm({ initialValues }) {
  const [state, formAction, pending] = useActionState(updateProfile, { errors: {}, values: initialValues });
  const { errors, values } = state;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormError message={errors.form} />

      <FormField label="닉네임" error={errors.nickname}>
        <input name="nickname" className={inputClass} defaultValue={values.nickname} maxLength={NICKNAME_LIMITS.max} required />
      </FormField>

      <FormField label="소개" error={errors.bio}>
        <textarea
          name="bio"
          className={`${inputClass} min-h-24`}
          defaultValue={values.bio}
          maxLength={BIO_LIMITS.max}
          placeholder="어떤 여행을 좋아하나요?"
        />
      </FormField>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">프로필 색상</legend>
        <div className="flex flex-wrap gap-3">
          {avatarChoices.map((choice, index) => (
            <label key={choice} className="cursor-pointer">
              <input type="radio" name="avatar" value={choice} defaultChecked={values.avatar === choice} className="peer sr-only" />
              <span
                className={`block h-10 w-10 rounded-full bg-linear-to-br ring-offset-2 peer-checked:ring-2 peer-checked:ring-brand peer-focus-visible:ring-2 peer-focus-visible:ring-foreground ${choice}`}
              />
              <span className="sr-only">색상 {index + 1}</span>
            </label>
          ))}
        </div>
        {errors.avatar && <span className="text-xs text-red-600 dark:text-red-400">{errors.avatar}</span>}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">좋아하는 여행 테마</legend>
        <div className="flex flex-wrap gap-2">
          {themes.map((theme) => (
            <label key={theme.id} className="cursor-pointer">
              <input
                type="checkbox"
                name="favoriteThemes"
                value={theme.id}
                defaultChecked={values.favoriteThemes.includes(theme.id)}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-border px-3.5 py-1.5 text-sm text-muted peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-foreground dark:peer-checked:text-slate-900">
                {theme.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-900"
      >
        {pending ? "저장 중..." : "프로필 저장"}
      </button>
    </form>
  );
}
