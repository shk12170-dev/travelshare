// 배포 전 점검: Turso(DB)와 Cloudflare R2(파일 저장소)에 실제로 접속해 필요한 기능이 모두 되는지 확인합니다.
// 실행: npm run check:services   (.env 또는 환경 변수의 키를 사용)
// 만드는 데이터는 모두 확인 후 지웁니다. 실제 사용자 데이터는 건드리지 않습니다.
import "dotenv/config";
import { createClient } from "@libsql/client";
import { AwsClient } from "aws4fetch";

let failed = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg, hint) => {
  failed += 1;
  console.log(`  ✗ ${msg}`);
  if (hint) console.log(`      → ${hint}`);
};

async function checkTurso() {
  console.log("\n[Turso DB]");
  const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = process.env;
  if (!url) return bad("TURSO_DATABASE_URL이 설정되지 않았습니다.", ".env에 libsql://... 주소를 넣으세요.");
  if (!authToken && !url.startsWith("file:")) return bad("TURSO_AUTH_TOKEN이 설정되지 않았습니다.");

  const client = createClient({ url, authToken });
  try {
    const one = await client.execute("SELECT 1 AS ok");
    ok(`접속 성공 (${url.startsWith("file:") ? "로컬 파일" : new URL(url.replace("libsql:", "https:")).hostname})`);
    if (Number(one.rows[0].ok) !== 1) bad("조회 결과가 이상합니다.");

    const tables = (await client.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)).rows.map((r) => r.name);
    const required = ["User", "Session", "Account", "TravelLog", "MediaItem", "Comment", "Like", "RateLimit"];
    const missing = required.filter((t) => !tables.includes(t));
    if (missing.length) {
      return bad(`테이블이 없습니다: ${missing.join(", ")}`, "npm run db:migrate:remote 를 실행하세요.");
    }
    ok(`필요한 테이블 ${required.length}개가 모두 있습니다.`);

    // 횟수 제한에서 쓰는 UPSERT + RETURNING이 이 DB에서 동작하는지
    const key = `check:${Date.now()}`;
    const r = await client.execute({
      sql: `INSERT INTO "RateLimit" ("key","count","resetAt") VALUES (?,1,?) ON CONFLICT("key") DO UPDATE SET "count"="RateLimit"."count"+1 RETURNING "count"`,
      args: [key, Date.now() + 60_000],
    });
    await client.execute({ sql: `DELETE FROM "RateLimit" WHERE "key" = ?`, args: [key] });
    if (Number(r.rows[0]?.count) === 1) ok("쓰기·RETURNING 동작 확인");
    else bad("쓰기 확인에 실패했습니다.");
  } catch (error) {
    bad(`접속 실패: ${error.message}`, "주소와 토큰이 맞는지, Turso 데이터베이스가 만들어졌는지 확인하세요.");
  } finally {
    client.close();
  }
}

async function checkR2() {
  console.log("\n[Cloudflare R2]");
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  const missing = Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) return bad(`설정되지 않음: ${missing.join(", ")}`);

  const aws = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
  const base = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
  const key = `pending/check-${Date.now()}.png`;
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

  try {
    // 1) 서명된 업로드 주소로 브라우저처럼 직접 올리기 (Content-Type·Content-Length 서명 포함)
    const url = new URL(`${base}/${key}`);
    url.searchParams.set("X-Amz-Expires", "300");
    const signed = await aws.sign(
      new Request(url, { method: "PUT", headers: { "Content-Type": "image/png", "Content-Length": String(png.length) } }),
      { aws: { signQuery: true, allHeaders: true } },
    );
    const put = await fetch(signed.url, { method: "PUT", headers: { "Content-Type": "image/png" }, body: png });
    if (put.ok) ok("서명된 주소로 직접 업로드 성공");
    else return bad(`업로드 실패 (HTTP ${put.status})`, put.status === 403 ? "API 토큰 권한(객체 읽기·쓰기)과 버킷 이름을 확인하세요." : undefined);

    // 2) 다른 형식으로 올리면 거부되는지 (서명이 형식을 묶는지)
    const wrong = await fetch(signed.url, { method: "PUT", headers: { "Content-Type": "text/html" }, body: png });
    if (wrong.status === 403) ok("허가받지 않은 형식은 거부됨");
    else bad(`형식 제한이 동작하지 않습니다 (HTTP ${wrong.status})`, "이 경우 서버 쪽 검사(게시 단계)가 마지막 방어선이 됩니다.");

    // 3) 서버 쪽 확인 동작: 정보 조회, 앞부분 읽기, 복사, 삭제
    const head = await aws.fetch(`${base}/${key}`, { method: "HEAD" });
    if (head.ok && Number(head.headers.get("content-length")) === png.length) ok("크기 조회(HEAD) 성공");
    else bad(`크기 조회 실패 (HTTP ${head.status})`);

    const part = await aws.fetch(`${base}/${key}`, { headers: { Range: "bytes=0-7" } });
    if (part.status === 206 && (await part.arrayBuffer()).byteLength === 8) ok("앞부분 읽기(Range) 성공");
    else bad(`앞부분 읽기 실패 (HTTP ${part.status})`);

    const finalKey = `media/check-${Date.now()}.png`;
    const copy = await aws.fetch(`${base}/${finalKey}`, { method: "PUT", headers: { "x-amz-copy-source": `/${R2_BUCKET}/${key}` } });
    if (copy.ok) ok("정식 위치로 복사 성공");
    else bad(`복사 실패 (HTTP ${copy.status})`);

    // 4) 보기용 서명 주소와 브라우저가 쓰는 Range 요청
    const view = new URL(`${base}/${finalKey}`);
    view.searchParams.set("X-Amz-Expires", "300");
    const viewSigned = await aws.sign(new Request(view, { method: "GET" }), { aws: { signQuery: true } });
    const got = await fetch(viewSigned.url, { headers: { Range: "bytes=0-3" } });
    if (got.status === 206) ok("보기용 서명 주소 + Range 요청 성공 (영상 건너뛰기 가능)");
    else bad(`보기용 주소 실패 (HTTP ${got.status})`);

    // 5) 정리
    await aws.fetch(`${base}/${key}`, { method: "DELETE" });
    const del = await aws.fetch(`${base}/${finalKey}`, { method: "DELETE" });
    if (del.ok) ok("삭제 성공 (점검용 파일 정리 완료)");
    else bad(`삭제 실패 (HTTP ${del.status})`);
  } catch (error) {
    bad(`R2 접속 실패: ${error.message}`, "R2_ACCOUNT_ID와 키가 맞는지 확인하세요.");
  }

  console.log(
    "\n  ※ 브라우저에서 직접 올리려면 버킷에 CORS 규칙이 필요합니다. 이 점검은 서버에서 실행되어 CORS는 확인하지 못합니다.\n" +
      "    (README의 'R2 설정' 참고)",
  );
}

await checkTurso();
await checkR2();
console.log(failed === 0 ? "\n모든 점검을 통과했습니다." : `\n${failed}개 항목에 문제가 있습니다.`);
process.exitCode = failed === 0 ? 0 : 1;
