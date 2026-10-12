import Link from "next/link";
import { ForgotPasswordForm } from "@/components/PasswordResetForms";
import { mailAvailable } from "@/lib/features";

export const metadata = {
  title: "비밀번호 찾기",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">비밀번호 찾기</h1>
        <p className="mt-1 text-sm text-muted">가입한 이메일로 비밀번호 재설정 링크를 보내 드립니다.</p>
      </div>
      {mailAvailable() ? (
        <ForgotPasswordForm />
      ) : (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-sm">
          <p>
            이 데모 사이트는 메일 발송 기능을 연결하지 않아 비밀번호 재설정 메일을 보낼 수 없습니다. 새 계정으로 가입해
            이용해 주세요.
          </p>
          <Link href="/signup" className="font-semibold text-brand">
            회원가입하기
          </Link>
        </div>
      )}
    </div>
  );
}
