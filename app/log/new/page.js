import Link from "next/link";
import LogForm from "@/components/LogForm";

export const metadata = {
  title: "여행 로그 작성",
};

export default function NewLogPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/log" className="text-sm text-muted hover:text-foreground">
        ← 로그 목록
      </Link>
      <div>
        <h1 className="text-2xl font-bold">여행 로그 작성</h1>
        <p className="mt-1 text-sm text-muted">다녀온 여행의 이야기와 팁을 공유해 주세요.</p>
      </div>
      <LogForm />
    </div>
  );
}
