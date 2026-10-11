import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser, safeReturnPath } from "@/lib/session";

export const metadata = {
  title: "로그인",
};

export default async function LoginPage({ searchParams }) {
  const next = safeReturnPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="mt-1 text-sm text-muted">여행 기록을 남기고 사진을 공유하려면 로그인하세요.</p>
      </div>
      <AuthForm mode="login" next={next} />
    </div>
  );
}
