import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import SocialButtons from "@/components/SocialButtons";
import { enabledSocialProviders } from "@/lib/auth";
import { mailAvailable } from "@/lib/features";
import { getCurrentUser, safeReturnPath } from "@/lib/session";

export const metadata = {
  title: "로그인",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="mt-1 text-sm text-muted">여행 기록을 남기고 사진을 공유하려면 로그인하세요.</p>
      </div>
      {params.reset && (
        <p role="status" className="rounded-lg bg-brand-soft p-3 text-sm text-brand">
          비밀번호를 변경했습니다. 새 비밀번호로 로그인하세요.
        </p>
      )}
      {params.error === "social" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          소셜 로그인에 실패했습니다. 다시 시도하거나 이메일로 로그인하세요.
        </p>
      )}
      <SocialButtons providers={enabledSocialProviders()} next={next} />
      <AuthForm mode="login" next={next} showForgot={mailAvailable()} />
    </div>
  );
}
