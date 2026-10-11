import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 홈 폴더의 package-lock.json과 혼동되지 않도록 프로젝트 루트를 명시
  turbopack: {
    root: projectRoot,
  },
  images: {
    // 업로드한 사진만 크기 조절·WebP 변환 대상으로 허용 (쿼리 문자열 불가)
    localPatterns: [{ pathname: "/api/media/**", search: "" }],
    qualities: [75],
    // 삭제한 사진이 오래 남지 않도록 원본 파일 캐시와 같은 1시간
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
