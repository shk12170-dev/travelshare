import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import SocialButtons from "@/components/SocialButtons";
import { enabledSocialProviders } from "@/lib/auth";
import { getCurrentUser, safeReturnPath } from "@/lib/session";

export const metadata = {
  title: "회원가입",
};

export default async function SignupPage({ searchParams }) {
  const next = safeReturnPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">회원가입</h1>
        <p className="mt-1 text-sm text-muted">TravelShare에서 여행 이야기를 나눠 보세요.</p>
      </div>
      <SocialButtons providers={enabledSocialProviders()} next={next} />
      <AuthForm mode="signup" next={next} />
      <p className="text-center text-xs text-muted">
        가입하면 <Link href="/privacy" className="font-medium text-brand">이용 안내·개인정보 처리</Link>에 동의한 것으로
        봅니다. 데모 사이트이므로 실제 이메일이 아니어도 됩니다.
      </p>
    </div>
  );
}
