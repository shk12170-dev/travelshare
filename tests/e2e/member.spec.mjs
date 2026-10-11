import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { logIn, logOut, newUser, readE2eDb, signUp } from "./helpers.mjs";

// 32x32 단색 PNG를 직접 만듦 (업로드 테스트용)
function makePng() {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const size = 32;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) raw.set([15, 118, 110], y * (size * 3 + 1) + 1 + x * 3);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const PNG = makePng();

test.describe("회원", () => {
  test("가입 → 로그 작성·좋아요·댓글·수정·삭제", async ({ page }) => {
    const user = newUser();
    await signUp(page, user, "/log/new");
    await expect(page).toHaveURL(/\/log\/new$/);

    // 작성
    const main = page.getByRole("main");
    await main.getByLabel("제목").fill("E2E 테스트 여행기");
    await main.getByLabel("지역").selectOption("부산");
    await main.getByLabel("누구와").selectOption("friends");
    await main.getByLabel("본문").fill("첫째 문단입니다. 자동 테스트로 작성했습니다.\n\n둘째 문단입니다.");
    await main.getByLabel(/여행 팁/).fill("팁 하나\n팁 둘");
    await main.getByRole("button", { name: "작성 완료" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "E2E 테스트 여행기" })).toBeVisible();
    const logUrl = page.url();

    // 좋아요 (누르고 새로고침해도 유지)
    const like = main.getByRole("button", { name: /^좋아요 0개/ });
    await like.click();
    await expect(main.getByRole("button", { name: /^좋아요 1개/ })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(main.getByRole("button", { name: /^좋아요 1개/ })).toHaveAttribute("aria-pressed", "true");

    // 댓글
    await main.getByLabel("댓글 쓰기").fill("자동 테스트 댓글입니다.");
    await main.getByRole("button", { name: "댓글 등록" }).click();
    await expect(main.getByText("자동 테스트 댓글입니다.")).toBeVisible();
    await expect(main.getByRole("heading", { name: "댓글 1" })).toBeVisible();
    await expect(main.getByLabel("댓글 쓰기")).toHaveValue("");

    // 댓글 삭제
    page.once("dialog", (dialog) => dialog.accept());
    await main.getByRole("listitem").filter({ hasText: "자동 테스트 댓글입니다." }).getByRole("button", { name: "삭제" }).click();
    await expect(main.getByRole("heading", { name: "댓글 0" })).toBeVisible();

    // 수정
    await main.getByRole("link", { name: "수정" }).click();
    await expect(main.getByLabel("제목")).toHaveValue("E2E 테스트 여행기");
    await main.getByLabel("제목").fill("E2E 수정된 여행기");
    await main.getByRole("button", { name: "수정 완료" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "E2E 수정된 여행기" })).toBeVisible();

    // 삭제
    page.once("dialog", (dialog) => dialog.accept());
    await main.locator("header").getByRole("button", { name: "삭제" }).click();
    await expect(page).toHaveURL(/\/log$/);
    expect((await page.request.get(logUrl)).status()).toBe(404);
  });

  test("다른 사람의 글은 수정·삭제할 수 없다", async ({ page }) => {
    await signUp(page, newUser());
    await page.goto("/log/busan-solo-24h");
    const header = page.getByRole("main").locator("article header");
    await expect(header.getByRole("link", { name: "수정" })).toHaveCount(0);
    await expect(header.getByRole("button", { name: "삭제" })).toHaveCount(0);

    await page.goto("/log/busan-solo-24h/edit");
    await expect(page.getByRole("heading", { name: "수정 권한이 없습니다" })).toBeVisible();

    const del = await page.request.delete("/api/media/m3");
    expect(del.status()).toBe(403);
  });

  test("미디어를 올리고 지울 수 있다", async ({ page }) => {
    await signUp(page, newUser(), "/media");
    const main = page.getByRole("main");
    await main.locator('input[type="file"]').setInputFiles({ name: "e2e.png", mimeType: "image/png", buffer: PNG });
    await main.getByLabel("설명").fill("E2E 업로드 사진");
    await main.getByLabel("지역").selectOption("서울");
    await main.getByRole("button", { name: "1개 게시하기" }).click();
    await expect(main.getByText("1개를 게시했습니다.")).toBeVisible();

    const tile = main.getByRole("listitem").filter({ hasText: "E2E 업로드 사진" });
    await expect(tile.getByRole("img", { name: "E2E 업로드 사진" })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await tile.getByRole("button", { name: "E2E 업로드 사진 삭제" }).click();
    await expect(main.getByText("E2E 업로드 사진")).toHaveCount(0);
  });

  test("프로필 수정과 코스 찜", async ({ page }) => {
    const user = newUser();
    await signUp(page, user);

    await page.goto("/course/gyeongju-night");
    await page.getByRole("main").getByRole("button", { name: /^좋아요/ }).click();
    await expect(page.getByRole("main").getByRole("button", { name: /^좋아요/ })).toHaveAttribute("aria-pressed", "true");

    await page.goto("/profile/edit");
    const main = page.getByRole("main");
    await main.getByLabel("닉네임").fill(`${user.nickname}수정`);
    await main.getByLabel("소개").fill("자동 테스트 소개글");
    await main.getByText("맛집", { exact: true }).click();
    await main.getByRole("button", { name: "프로필 저장" }).click();

    await expect(page).toHaveURL(/\/profile\?updated=1/);
    await expect(main.getByText("프로필을 저장했습니다.")).toBeVisible();
    await expect(main.getByRole("heading", { name: `${user.nickname}수정` })).toBeVisible();
    await expect(main.getByText("자동 테스트 소개글")).toBeVisible();
    await expect(main.getByRole("heading", { name: "경주 야경과 역사 유적" })).toBeVisible();
  });

  test("이미 쓰는 닉네임과 이메일로는 가입할 수 없다", async ({ page }) => {
    const user = newUser();
    await signUp(page, user);
    await logOut(page);

    await page.goto("/signup");
    const form = page.getByRole("main").locator("form");
    await form.getByLabel("닉네임").fill("바다고양이");
    await form.getByLabel("이메일").fill("someone-new@example.test");
    await form.getByLabel("비밀번호", { exact: true }).fill("password-1234");
    await form.getByLabel("비밀번호 확인").fill("password-1234");
    await form.getByRole("button", { name: "가입하기" }).click();
    await expect(form.getByText("이미 사용 중인 닉네임입니다.")).toBeVisible();

    await form.getByLabel("닉네임").fill(`새닉${Date.now() % 10000}`);
    await form.getByLabel("이메일").fill(user.email);
    await form.getByLabel("비밀번호", { exact: true }).fill("password-1234");
    await form.getByLabel("비밀번호 확인").fill("password-1234");
    await form.getByRole("button", { name: "가입하기" }).click();
    await expect(form.getByText("이미 가입된 이메일입니다.")).toBeVisible();
  });

  test("비밀번호 재설정 후 새 비밀번호로 로그인", async ({ page }) => {
    const user = newUser();
    await signUp(page, user);
    await logOut(page);

    await page.goto("/login");
    await page.getByRole("link", { name: "비밀번호를 잊으셨나요?" }).click();
    await page.getByRole("main").getByLabel("가입한 이메일").fill(user.email);
    await page.getByRole("main").getByRole("button", { name: "재설정 링크 받기" }).click();
    await expect(page.getByRole("status")).toContainText("재설정 링크를 보냈습니다");

    // 메일 대신 테스트 DB에서 토큰을 읽음
    const [row] = readE2eDb(
      `SELECT v.identifier FROM Verification v JOIN User u ON u.id = v.value
       WHERE u.email = ? AND v.identifier LIKE 'reset-password:%' ORDER BY v.createdAt DESC LIMIT 1`,
      user.email,
    );
    const token = row.identifier.replace("reset-password:", "");

    const newPassword = `${user.password}-new`;
    await page.goto(`/reset-password?token=${token}`);
    const main = page.getByRole("main");
    await main.getByLabel("새 비밀번호", { exact: true }).fill(newPassword);
    await main.getByLabel("새 비밀번호 확인").fill(newPassword);
    await main.getByRole("button", { name: "비밀번호 변경" }).click();
    await expect(page).toHaveURL(/\/login\?reset=1/);

    // 같은 링크는 다시 쓸 수 없음
    await page.goto(`/reset-password?token=${token}`);
    await main.getByLabel("새 비밀번호", { exact: true }).fill("another-pass-1");
    await main.getByLabel("새 비밀번호 확인").fill("another-pass-1");
    await main.getByRole("button", { name: "비밀번호 변경" }).click();
    await expect(main.getByRole("alert")).toContainText("링크가 만료되었거나");

    // 옛 비밀번호는 실패, 새 비밀번호는 성공
    await logIn(page, user.email, user.password);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("이메일 또는 비밀번호가 올바르지 않습니다.");
    await logIn(page, user.email, newPassword);
    await expect(page.getByRole("banner").getByRole("link", { name: user.nickname })).toBeVisible();
  });

  test("소셜 로그인 등으로 같은 이름이 들어와도 닉네임이 겹치지 않는다", async ({ request }) => {
    // 화면 검사를 거치지 않는 인증 API로 기존 닉네임 가입 시도 → 숫자가 붙은 닉네임으로 생성
    const user = newUser();
    const res = await request.post("/api/auth/sign-up/email", {
      data: { name: "바다고양이", email: user.email, password: user.password },
      headers: { Origin: "http://localhost:3200" },
    });
    expect(res.ok()).toBeTruthy();
    const [row] = readE2eDb("SELECT nickname FROM User WHERE email = ?", user.email);
    expect(row.nickname).toMatch(/^바다고양이\d{4}$/);
  });
});
