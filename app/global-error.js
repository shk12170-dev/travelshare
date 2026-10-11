"use client";

// 공통 레이아웃(헤더 등)에서 오류가 났을 때 보여 주는 최후의 화면. 레이아웃을 대신하므로 html/body를 직접 그림
export default function GlobalError({ retry }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: "sans-serif", textAlign: "center", padding: "6rem 1rem" }}>
        <h1 style={{ fontSize: "1.25rem" }}>문제가 발생했습니다</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>잠시 후 다시 시도하세요.</p>
        <button type="button" onClick={() => retry()} style={{ marginTop: "1rem", padding: "0.5rem 1.25rem" }}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
