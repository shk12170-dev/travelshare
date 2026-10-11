import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 홈 폴더의 package-lock.json과 혼동되지 않도록 프로젝트 루트를 명시
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
