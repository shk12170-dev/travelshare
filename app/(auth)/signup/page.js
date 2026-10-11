import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
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
      <AuthForm mode="signup" next={next} />
    </div>
  );
}
