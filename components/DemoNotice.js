import Link from "next/link";

// 과제 제출용 데모 사이트 안내. 실제 개인정보를 넣지 않도록 모든 화면 맨 위에 표시
export default function DemoNotice() {
  return (
    <p
      role="note"
      className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      과제 제출용 데모 사이트입니다. 실명·연락처·다른 곳에서 쓰는 비밀번호 같은 실제 개인정보는 입력하지 마세요.{" "}
      <Link href="/privacy" className="font-semibold underline underline-offset-2">
        이용 안내
      </Link>
    </p>
  );
}
