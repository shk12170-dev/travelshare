import { expect, test } from "@playwright/test";
import { newUser, readE2eDb, signUp } from "./helpers.mjs";

async function writeLog(page, title) {
  await page.goto("/log/new");
  const main = page.getByRole("main");
  await main.getByLabel("제목").fill(title);
  await main.getByLabel("지역").selectOption("제주");
  await main.getByLabel("누구와").selectOption("friends");
  await main.getByLabel("본문").fill("팔로우 시험용 여행 기록입니다.");
  await main.getByRole("button", { name: "작성 완료" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  return page.url().split("/").pop();
}

test("작성자를 팔로우하면 팔로잉 탭에 그 사람의 로그만 모아 보인다", async ({ browser }) => {
  const writerCtx = await browser.newContext();
  const readerCtx = await browser.newContext();
  const writer = await writerCtx.newPage();
  const reader = await readerCtx.newPage();
  const writerUser = newUser();
  await signUp(writer, writerUser);
  await signUp(reader, newUser());

  const title = `팔로우 시험 로그 ${Date.now()}`;
  const logId = await writeLog(writer, title);
  // 본인 글에는 팔로우 버튼이 없음
  await expect(writer.getByRole("button", { name: /팔로우/ })).toHaveCount(0);

  // 독자가 로그 상세에서 팔로우
  await reader.goto(`/log/${logId}`);
  const button = reader.getByRole("button", { name: /팔로우$/ });
  await button.click();
  await expect(reader.getByRole("button", { name: /팔로잉 중, 팔로우 취소/ })).toBeVisible();
  await expect(reader.getByText("팔로워 1")).toBeVisible();
  const [{ id: writerId }] = readE2eDb("SELECT id FROM User WHERE email = ?", writerUser.email);
  expect(readE2eDb("SELECT 1 FROM Follow WHERE followingId = ?", writerId)).toHaveLength(1);

  // 팔로잉 탭에 그 사람의 로그가 나오고, 다른 사람의 로그는 나오지 않음
  await reader.goto("/log?feed=following");
  await expect(reader.getByRole("main").getByText(title)).toBeVisible();
  await expect(reader.getByRole("main").getByText("비 오는 날의 제주")).toHaveCount(0);

  // 새로 고쳐도 유지, 취소하면 사라짐
  await reader.goto(`/log/${logId}`);
  await reader.getByRole("button", { name: /팔로잉 중, 팔로우 취소/ }).click();
  await expect(reader.getByRole("button", { name: /팔로우$/ })).toBeVisible();
  expect(readE2eDb("SELECT 1 FROM Follow WHERE followingId = ?", writerId)).toHaveLength(0);

  await writerCtx.close();
  await readerCtx.close();
});

test("로그인하지 않은 사용자는 팔로우하려면 로그인 화면으로 이동한다", async ({ page }) => {
  await page.goto("/log/jeju-rain-day");
  await page.getByRole("button", { name: /팔로우$/ }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("실제 파일이 없는 샘플 미디어에는 샘플 이미지 표시가 있다", async ({ page }) => {
  await page.goto("/media");
  await expect(page.getByText("샘플 이미지").first()).toBeVisible();
});
