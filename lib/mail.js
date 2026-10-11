import "server-only";

// 메일 발송. RESEND_API_KEY와 MAIL_FROM이 있으면 Resend(https://resend.com)로 보내고,
// 없으면 서버 콘솔에 내용을 출력합니다(개발용). 다른 서비스를 쓰려면 이 함수만 바꾸면 됩니다.
export async function sendMail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    const note = process.env.NODE_ENV === "production" ? "[메일 미설정] 운영 환경에서 메일이 발송되지 않았습니다." : "[개발용 메일]";
    console.warn(`${note}\n받는 사람: ${to}\n제목: ${subject}\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) {
    console.error("메일 발송 실패", res.status, await res.text().catch(() => ""));
    throw new Error("메일 발송 실패");
  }
}

export function isMailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}
