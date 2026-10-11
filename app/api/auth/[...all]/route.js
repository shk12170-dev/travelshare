import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// Better Auth의 로그인·가입·세션 API (/api/auth/*)
export const GET = (request) => toNextJsHandler(getAuth()).GET(request);
export const POST = (request) => toNextJsHandler(getAuth()).POST(request);
