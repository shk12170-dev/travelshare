import Link from "next/link";
import { ResetPasswordForm } from "@/components/PasswordResetForms";

export const metadata = {
  title: "새 비밀번호 설정",
};

export default async function ResetPasswordPage({ searchParams }) {
  const token = String((await searchParams).token ?? "");

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">새 비밀번호 설정</h1>
      </div>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-center text-sm text-muted">
          링크가 올바르지 않습니다.{" "}
          <Link href="/forgot-password" className="font-semibold text-brand">
            재설정 링크를 다시 요청
          </Link>
          하세요.
        </p>
      )}
    </div>
  );
}
