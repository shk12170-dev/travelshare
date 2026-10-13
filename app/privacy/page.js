import Link from "next/link";

export const metadata = {
  title: "이용 안내·개인정보 처리",
  description: "TravelShare 과제용 데모 사이트의 이용 안내와 개인정보 처리 방식",
};

const collected = [
  ["이메일 주소", "로그인과 계정 구분", "계정을 삭제할 때까지"],
  ["닉네임", "다른 사용자에게 표시되는 이름", "계정을 삭제할 때까지"],
  ["비밀번호", "로그인 확인. 원문은 저장하지 않고 한 방향으로 암호화한 값만 저장", "계정을 삭제할 때까지"],
  ["로그인 기록(접속 IP, 브라우저 정보, 시각)", "로그인 유지와 부정 사용 방지", "로그인 세션이 끝나면 삭제"],
  ["작성한 로그·댓글·좋아요, 올린 사진·영상", "서비스 기능 제공. 공개 화면에 표시됨", "직접 삭제하거나 계정을 삭제할 때까지"],
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-8 leading-7">
      <header>
        <h1 className="text-2xl font-bold">이용 안내·개인정보 처리</h1>
        <p className="mt-2 text-sm text-muted">
          TravelShare는 과제 제출을 위해 만든 <strong>비상업 데모 사이트</strong>입니다. 아래는 이 사이트가 어떤 정보를 어떻게
          다루는지에 대한 안내입니다.
        </p>
      </header>

      <section aria-labelledby="notice">
        <h2 id="notice" className="text-lg font-bold">
          먼저 알려 드립니다
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          <li>실명, 연락처, 다른 곳에서 쓰는 비밀번호 같은 <strong>실제 개인정보는 입력하지 마세요.</strong></li>
          <li>이메일은 실제 주소가 아니어도 됩니다(예: test1@example.com). 메일은 발송하지 않습니다.</li>
          <li>사진과 영상, 글은 누구나 볼 수 있습니다. 개인이 식별되는 사진은 올리지 마세요.</li>
          <li>데모 사이트이므로 데이터는 예고 없이 지워질 수 있습니다.</li>
        </ul>
      </section>

      <section aria-labelledby="collect">
        <h2 id="collect" className="text-lg font-bold">
          수집하는 정보
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <caption className="sr-only">수집 항목, 이용 목적, 보관 기간</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-3 font-semibold">항목</th>
                <th scope="col" className="py-2 pr-3 font-semibold">이용 목적</th>
                <th scope="col" className="py-2 font-semibold">보관</th>
              </tr>
            </thead>
            <tbody>
              {collected.map(([item, purpose, keep]) => (
                <tr key={item} className="border-b border-border align-top">
                  <th scope="row" className="py-2 pr-3 font-medium">{item}</th>
                  <td className="py-2 pr-3 text-muted">{purpose}</td>
                  <td className="py-2 text-muted">{keep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="uses">
        <h2 id="uses" className="text-lg font-bold">
          이용 방식과 제3자
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          <li>수집한 정보는 위 목적 외에 사용하지 않으며 광고나 분석에 쓰지 않습니다.</li>
          <li>
            서비스 운영을 위해 호스팅(Vercel), 데이터베이스(Turso), 파일 저장소(Vercel Blob)에 정보가 저장됩니다.
            이 서비스들은 일본 도쿄 지역을 사용합니다.
          </li>
          <li>이 사이트는 쿠키를 로그인 상태 유지에만 사용합니다. 광고·추적 쿠키는 쓰지 않습니다.</li>
        </ul>
      </section>

      <section aria-labelledby="rules">
        <h2 id="rules" className="text-lg font-bold">
          이용 규칙
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          <li>다른 사람의 권리를 침해하는 글·사진·영상, 불법 콘텐츠, 광고·스팸은 올릴 수 없습니다.</li>
          <li>본인이 직접 촬영했거나 사용 권한이 있는 사진·영상만 올려 주세요.</li>
          <li>운영자는 규칙에 맞지 않는 콘텐츠를 예고 없이 삭제할 수 있습니다.</li>
          <li>글·댓글·사진은 작성자 본인이 언제든 삭제할 수 있습니다.</li>
        </ul>
      </section>

      <section aria-labelledby="delete">
        <h2 id="delete" className="text-lg font-bold">
          삭제 요청
        </h2>
        <p className="mt-2 text-sm">
          올린 글과 사진은 각 화면의 삭제 버튼으로 직접 지울 수 있습니다. 계정 삭제 기능은 아직 제공하지 않습니다.
          계정과 모든 데이터의 삭제를 원하시면 소스 저장소의{" "}
          <a
            href="https://github.com/shk12170-dev/travelshare/issues"
            className="font-medium text-brand underline-offset-2 hover:underline"
          >
            이슈
          </a>
          로 요청해 주세요.
        </p>
      </section>

      <p className="text-xs text-muted">
        이 안내는 과제용 데모 사이트를 위한 것이며 법률 자문이 아닙니다. 실제 서비스로 운영할 때는 관련 법령에 맞는 방침을
        별도로 마련해야 합니다.
      </p>
      <Link href="/" className="text-sm font-medium text-brand">
        ← 홈으로
      </Link>
    </article>
  );
}
