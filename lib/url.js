// 로그인 후 돌아갈 주소 검사. 외부 사이트로 보내는 것을 막기 위해 같은 사이트 안의 경로만 허용
// - "//evil.com"(프로토콜 생략 주소)과 "/\evil.com"(브라우저가 //로 해석)을 차단
// - 브라우저는 주소 속 탭·줄바꿈을 지우므로 "/\t/evil.com"도 //evil.com이 됨 → 제어 문자가 있으면 차단
export function safeReturnPath(value) {
  const path = String(value ?? "");
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return "/";
  return path;
}
