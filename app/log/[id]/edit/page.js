import Link from "next/link";
import { notFound } from "next/navigation";
import LogForm from "@/components/LogForm";
import { updateLog } from "@/app/log/actions";
import { getLog } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "여행 로그 수정",
};

export default async function EditLogPage({ params }) {
  const { id } = await params;
  const user = await requireUser(`/log/${id}/edit`);
  const log = await getLog(id);
  if (!log) notFound();

  if (log.authorId !== user.id) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-5xl">🔒</p>
        <h1 className="text-xl font-bold">수정 권한이 없습니다</h1>
        <p className="text-sm text-muted">본인이 작성한 로그만 수정할 수 있습니다.</p>
        <Link href={`/log/${id}`} className="text-sm font-semibold text-brand">
          로그로 돌아가기
        </Link>
      </div>
    );
  }

  const initialValues = {
    title: log.title,
    region: log.region,
    companion: log.companion,
    body: log.body.join("\n\n"),
    tips: log.tips.join("\n"),
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href={`/log/${id}`} className="text-sm text-muted hover:text-foreground">
        ← 로그로 돌아가기
      </Link>
      <h1 className="text-2xl font-bold">여행 로그 수정</h1>
      <LogForm action={updateLog.bind(null, id)} initialValues={initialValues} submitLabel="수정 완료" />
    </div>
  );
}
