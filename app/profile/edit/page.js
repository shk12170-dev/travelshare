import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import DeleteAccountForm from "@/components/DeleteAccountForm";
import { isProtectedAccount } from "@/lib/accountDeletion";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "프로필 수정",
};

export default async function EditProfilePage() {
  const { id } = await requireUser("/profile/edit");
  const [user, credential, logCount, mediaCount] = await Promise.all([
    getUser(id),
    prisma.account.findFirst({ where: { userId: id, providerId: "credential" }, select: { id: true } }),
    prisma.travelLog.count({ where: { authorId: id } }),
    prisma.mediaItem.count({ where: { authorId: id } }),
  ]);

  const initialValues = {
    nickname: user.nickname,
    bio: user.bio,
    avatar: user.avatar,
    favoriteThemes: Array.isArray(user.favoriteThemes) ? user.favoriteThemes : [],
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <Link href="/profile" className="text-sm text-muted hover:text-foreground">
        ← 프로필
      </Link>

      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">프로필 수정</h1>
        <ProfileForm initialValues={initialValues} />
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <h2 className="text-xl font-bold">비밀번호 변경</h2>
        {credential ? (
          <PasswordChangeForm />
        ) : (
          <p className="text-sm text-muted">소셜 로그인으로 가입한 계정은 비밀번호 없이 로그인합니다.</p>
        )}
      </section>

      <section aria-labelledby="delete-account" className="flex flex-col gap-4 border-t border-border pt-8">
        <h2 id="delete-account" className="text-xl font-bold">
          계정 삭제
        </h2>
        {isProtectedAccount(user.email) ? (
          <p className="text-sm text-muted">
            샘플·체험 계정은 삭제할 수 없습니다. 삭제를 시험해 보려면 새로 가입한 계정을 사용하세요.
          </p>
        ) : (
          <DeleteAccountForm
            hasPassword={Boolean(credential)}
            nickname={user.nickname}
            counts={{ logs: logCount, media: mediaCount }}
          />
        )}
      </section>
    </div>
  );
}
