import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";

// 현재 로그인한 사용자. 한 요청 안에서는 한 번만 조회
export const getCurrentUser = cache(async () => {
  // headers()를 먼저 호출해야 빌드 중 정적 렌더링에서 인증 설정이 생성되지 않음
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, nickname: name, email };
});

// 로그인이 필요한 페이지에서 사용. 로그인하지 않았으면 로그인 화면으로 보낸 뒤 원래 페이지로 돌아옴
export async function requireUser(returnTo) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export { safeReturnPath } from "./url";
