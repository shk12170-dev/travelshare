import { existsSync, readdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { newUser, readE2eDb, signUp } from "./helpers.mjs";

// 16x16 단색 PNG
function makePng() {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8);
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
  const raw = Buffer.alloc((16 * 3 + 1) * 16);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(16, 0);
  header.writeUInt32BE(16, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("계정 삭제: 내 데이터가 모두 지워지고 상대 글의 좋아요 수가 되돌아간다", async ({ page }) => {
  const user = newUser();
  await signUp(page, user);
  const [{ id: userId }] = readE2eDb("SELECT id FROM User WHERE email = ?", user.email);
  const main = page.getByRole("main");

  // 1) 다른 사람의 로그에 좋아요와 댓글
  const likesBefore = readE2eDb("SELECT likes FROM TravelLog WHERE id = 'busan-solo-24h'")[0].likes;
  await page.goto("/log/busan-solo-24h");
  await main.getByRole("button", { name: /^좋아요/ }).click();
  await expect(main.getByRole("button", { name: new RegExp(`^좋아요 ${likesBefore + 1}개`) })).toBeVisible();
  await main.getByLabel("댓글 쓰기").fill("삭제 시험용 댓글");
  await main.getByRole("button", { name: "댓글 등록" }).click();
  await expect(main.getByText("삭제 시험용 댓글")).toBeVisible();

  // 2) 내 로그 작성
  await page.goto("/log/new");
  await main.getByLabel("제목").fill("삭제 시험용 로그");
  await main.getByLabel("지역").selectOption("서울");
  await main.getByLabel("누구와").selectOption("solo");
  await main.getByLabel("본문").fill("계정을 지우면 함께 사라지는 글입니다.");
  await main.getByRole("button", { name: "작성 완료" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "삭제 시험용 로그" })).toBeVisible();

  // 3) 사진 올리기 (허가 → 올리기 → 게시)
  const png = makePng();
  const permit = await page.request.post("/api/media", {
    data: { caption: "삭제 시험용 사진", region: "서울", contentType: "image/png", size: png.length },
  });
  const { token, upload } = await permit.json();
  expect((await page.request.put(upload.url, { headers: { "Content-Type": "image/png" }, data: png })).status()).toBe(200);
  expect((await page.request.put("/api/media", { data: { token } })).status()).toBe(201);
  const [{ fileName }] = readE2eDb("SELECT fileName FROM MediaItem WHERE authorId = ?", userId);
  expect(readdirSync("storage/e2e-uploads")).toContain(fileName);

  // 4) 삭제 화면: 잘못된 확인 값은 거부, 동의 없이 제출해도 거부
  await page.goto("/profile/edit");
  const form = main.locator("form").filter({ hasText: "계정 영구 삭제" });
  await expect(form).toContainText("여행 로그 1개");
  await expect(form).toContainText("사진·영상 1개");

  await form.getByLabel(/현재 비밀번호/).fill("wrong-password-123");
  await form.getByLabel(/이해했습니다/).check();
  await form.getByRole("button", { name: "계정 영구 삭제" }).click();
  await expect(form.getByText("비밀번호가 올바르지 않습니다.")).toBeVisible();
  expect(readE2eDb("SELECT id FROM User WHERE id = ?", userId)).toHaveLength(1);

  await form.getByLabel(/현재 비밀번호/).fill(user.password);
  await form.getByLabel(/이해했습니다/).uncheck();
  await form.getByRole("button", { name: "계정 영구 삭제" }).click();
  await expect(form.getByText("삭제하면 되돌릴 수 없다는 것에 동의해 주세요.")).toBeVisible();
  expect(readE2eDb("SELECT id FROM User WHERE id = ?", userId)).toHaveLength(1);

  // 5) 올바른 비밀번호 + 동의 → 삭제 (제출 후 입력란이 비워지므로 다시 입력)
  await form.getByLabel(/현재 비밀번호/).fill(user.password);
  await form.getByLabel(/이해했습니다/).check();
  await form.getByRole("button", { name: "계정 영구 삭제" }).click();
  await expect(page).toHaveURL(/\/\?deleted=1/);
  await expect(page.getByText("계정과 모든 데이터를 삭제했습니다.")).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "로그인" })).toBeVisible();

  // 6) 데이터가 모두 사라졌는지 DB와 파일로 확인
  const count = (sql, ...p) => readE2eDb(sql, ...p)[0].n;
  expect(count("SELECT COUNT(*) n FROM User WHERE id = ?", userId)).toBe(0);
  expect(count("SELECT COUNT(*) n FROM Account WHERE userId = ?", userId)).toBe(0);
  expect(count("SELECT COUNT(*) n FROM Session WHERE userId = ?", userId)).toBe(0);
  expect(count("SELECT COUNT(*) n FROM TravelLog WHERE authorId = ?", userId)).toBe(0);
  expect(count("SELECT COUNT(*) n FROM MediaItem WHERE authorId = ?", userId)).toBe(0);
  expect(count("SELECT COUNT(*) n FROM Comment WHERE authorId = ?", userId)).toBe(0);
  expect(count("SELECT COUNT(*) n FROM \"Like\" WHERE userId = ?", userId)).toBe(0);
  expect(existsSync(`storage/e2e-uploads/${fileName}`)).toBe(false);

  // 7) 상대 로그의 좋아요 수는 원래대로, 다른 사람의 글은 그대로
  expect(readE2eDb("SELECT likes FROM TravelLog WHERE id = 'busan-solo-24h'")[0].likes).toBe(likesBefore);
  expect(count("SELECT COUNT(*) n FROM TravelLog WHERE id = 'busan-solo-24h'")).toBe(1);

  // 8) 같은 이메일·비밀번호로 더 이상 로그인할 수 없음
  const login = await page.request.post("/api/auth/sign-in/email", {
    data: { email: user.email, password: user.password },
    headers: { Origin: "http://localhost:3200" },
  });
  expect(login.ok()).toBe(false);
});

test("샘플·체험 계정은 삭제할 수 없다", async ({ page }) => {
  // 체험 계정과 같은 형식의 이메일로 가입한 임시 계정으로, 서버가 삭제를 거부하는지 확인
  const user = { ...newUser(), email: `guard-${Date.now()}@sample.travelshare.test` };
  await signUp(page, user);
  await page.goto("/profile/edit");
  const main = page.getByRole("main");
  await expect(main.getByText("샘플·체험 계정은 삭제할 수 없습니다.")).toBeVisible();
  await expect(main.getByRole("button", { name: "계정 영구 삭제" })).toHaveCount(0);

  // 화면을 거치지 않고 서버 동작을 직접 호출해도 거부되는지는 단위 테스트(accountDeletion)에서 확인
  expect(readE2eDb("SELECT id FROM User WHERE email = ?", user.email)).toHaveLength(1);
});
