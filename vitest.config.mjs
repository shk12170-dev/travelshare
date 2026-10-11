import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      // 서버 전용 표시 모듈은 테스트에서 빈 모듈로 대체
      "server-only": path.join(root, "tests/unit/empty-module.js"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.js"],
  },
});
