import "server-only";
import { isMailConfigured } from "./mail";
import { isBlobConfigured } from "./blob";
import { isR2Configured } from "./r2";
import { isCloudMode } from "@/prisma/cloud.mjs";

// 외부 서비스 설정에 따라 켜고 끄는 기능. 설정이 없으면 화면에서 솔직하게 안내합니다.

// 비밀번호 재설정 메일: 메일 서비스가 설정됐거나, 개발 중(링크가 서버 콘솔에 출력됨)일 때만 사용 가능
// MAIL_CONSOLE_FALLBACK=1은 E2E 테스트처럼 운영 빌드에서 콘솔 출력으로 확인할 때만 사용
export function mailAvailable() {
  return isMailConfigured() || process.env.NODE_ENV !== "production" || process.env.MAIL_CONSOLE_FALLBACK === "1";
}

// 사진·영상 올리기: R2나 Vercel Blob이 설정됐거나, 로컬 디스크에 저장할 수 있는 환경(Vercel이 아님)일 때만 사용 가능
// Vercel 서버는 파일을 영구 저장할 수 없어서 외부 저장소 없이는 올릴 수 없음
export function uploadAvailable() {
  if (!isCloudMode()) return true; // PC: 로컬 폴더에 저장
  return isR2Configured() || isBlobConfigured();
}
