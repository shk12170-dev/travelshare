// 클라우드 서비스(Turso·Vercel Blob·R2)를 쓸지 결정하는 한 곳.
// - Vercel에서 실행될 때(VERCEL 환경 변수는 Vercel이 자동 설정), 또는 USE_CLOUD=1(스크립트의 --remote)일 때만 사용
// - PC에서 개발·테스트할 때는 .env에 키가 있어도 로컬 파일 DB와 로컬 폴더를 사용 (실제 서비스 데이터 보호)
export function isCloudMode(env = process.env) {
  return Boolean(env.VERCEL) || env.USE_CLOUD === "1";
}

// 스크립트에서 --remote를 주면 클라우드 대상으로 실행
export function applyRemoteFlag(argv = process.argv, env = process.env) {
  if (argv.includes("--remote")) env.USE_CLOUD = "1";
  return isCloudMode(env);
}
