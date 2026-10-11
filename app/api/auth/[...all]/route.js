import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth의 로그인·가입·세션 API (/api/auth/*)
export const { GET, POST } = toNextJsHandler(auth);
