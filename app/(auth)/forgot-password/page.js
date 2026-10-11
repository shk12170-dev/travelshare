import { ForgotPasswordForm } from "@/components/PasswordResetForms";

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
      <ForgotPasswordForm />
    </div>
  );
}
