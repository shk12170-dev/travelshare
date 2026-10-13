import { existsSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { newUser, readE2eDb, signUp } from "./helpers.mjs";

// 서로 다른 색의 32x32 PNG를 만듦 (파일마다 내용이 달라지도록 색을 바꿈)
function makePng(seed = 0) {
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
  const size = 32;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) raw.set([(seed * 53) % 256, (seed * 97 + 40) % 256, 150], y * (size * 3 + 1) + 1 + x * 3);
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

const photo = (n) => ({ name: `여행사진${n}.png`, mimeType: "image/png", buffer: makePng(n) });

async function fillLog(main, title) {
  await main.getByLabel("제목").fill(title);
  await main.getByLabel("지역").selectOption("제주");
  await main.getByLabel("누구와").selectOption("couple");
  await main.getByLabel("본문").fill("사진과 함께 남기는 여행 기록입니다.");
}

test("로그에 사진을 첨부해 작성·표시·수정·삭제할 수 있다", async ({ page }) => {
  const user = newUser();
  await signUp(page, user);
  const main = page.getByRole("main");

  // 1) 작성 화면에서 사진 3장 첨부
  await page.goto("/log/new");
  await fillLog(main, "사진 첨부 시험 로그");
  await main.locator('input[type="file"]').setInputFiles([photo(1), photo(2), photo(3)]);
  await expect(main.getByText("3/5")).toBeVisible();
  await expect(main.getByRole("img", { name: "여행사진1.png" })).toBeVisible();
  await main.getByRole("button", { name: "작성 완료" }).click();

  // 2) 상세 화면에 사진 3장이 보이고, 사진은 로그에 연결되며 임시 상태가 아님
  await expect(page.getByRole("heading", { level: 1, name: "사진 첨부 시험 로그" })).toBeVisible();
  const gallery = page.getByRole("region", { name: "첨부한 사진" });
  await expect(gallery.getByRole("img")).toHaveCount(3);
  const logId = page.url().split("/").pop();
  const rows = readE2eDb("SELECT id, fileName, draft, caption FROM MediaItem WHERE logId = ? ORDER BY createdAt", logId);
  expect(rows).toHaveLength(3);
  expect(rows.every((r) => r.draft === 0 && r.caption === "사진 첨부 시험 로그")).toBe(true);
  for (const r of rows) expect(existsSync(`storage/e2e-uploads/${r.fileName}`)).toBe(true);

  // 3) 사진 이미지가 실제로 열림
  const first = await page.request.get(`/api/media/${rows[0].id}/file`);
  expect(first.status()).toBe(200);
  expect(first.headers()["content-type"]).toBe("image/png");

  // 4) 목록 카드에 대표 사진이 나옴
  await page.goto("/log");
  const card = main.locator("a[href='/log/" + logId + "']");
  await expect(card.locator("img")).toHaveCount(1);

  // 5) 수정: 사진 1장 빼고 새 사진 1장 추가
  await page.goto(`/log/${logId}/edit`);
  await expect(main.getByText("3/5")).toBeVisible();
  await main.getByRole("button", { name: /빼기/ }).first().click();
  await expect(main.getByText("2/5")).toBeVisible();
  await main.locator('input[type="file"]').setInputFiles([photo(4)]);
  await expect(main.getByText("3/5")).toBeVisible();
  await main.getByRole("button", { name: "수정 완료" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "사진 첨부 시험 로그" })).toBeVisible();
  await expect(page.getByRole("region", { name: "첨부한 사진" }).getByRole("img")).toHaveCount(3);

  const after = readE2eDb("SELECT id, fileName FROM MediaItem WHERE logId = ?", logId);
  expect(after).toHaveLength(3);
  // 빠진 사진은 DB와 파일 모두 삭제됨
  expect(after.map((r) => r.id)).not.toContain(rows[0].id);
  expect(existsSync(`storage/e2e-uploads/${rows[0].fileName}`)).toBe(false);

  // 6) 로그를 삭제하면 첨부 사진과 파일도 함께 삭제됨
  const files = after.map((r) => r.fileName);
  page.once("dialog", (dialog) => dialog.accept());
  await main.locator("header").getByRole("button", { name: "삭제" }).click();
  await expect(page).toHaveURL(/\/log$/);
  expect(readE2eDb("SELECT id FROM MediaItem WHERE logId = ?", logId)).toHaveLength(0);
  for (const f of files) expect(existsSync(`storage/e2e-uploads/${f}`)).toBe(false);
});

test("저장하지 않고 떠난 임시 사진은 어디에도 나오지 않는다", async ({ page }) => {
  const user = newUser();
  await signUp(page, user);
  const [{ id: userId }] = readE2eDb("SELECT id FROM User WHERE email = ?", user.email);
  const main = page.getByRole("main");

  await page.goto("/log/new");
  await main.locator('input[type="file"]').setInputFiles([photo(7)]);
  await expect(main.getByText("1/5")).toBeVisible();

  // 임시 상태로 저장되어 있음
  const drafts = readE2eDb("SELECT id, draft, logId FROM MediaItem WHERE authorId = ?", userId);
  expect(drafts).toHaveLength(1);
  expect(drafts[0]).toMatchObject({ draft: 1, logId: null });

  // 미디어 목록, 검색, 내 프로필 통계에는 나오지 않음
  await page.goto("/media");
  await expect(main.getByText("여행 사진")).toHaveCount(0);
  await page.goto("/profile");
  await expect(main.getByText("아직 올린 미디어가 없습니다.")).toBeVisible();
  const res = await page.request.get(`/search?q=${encodeURIComponent("여행 사진")}`);
  expect(await res.text()).not.toContain(drafts[0].id);
});

test("남의 사진이나 이미 다른 로그에 붙은 사진은 내 로그에 붙일 수 없다", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pa = await a.newPage();
  const pb = await b.newPage();
  await signUp(pa, newUser());
  await signUp(pb, newUser());

  // A가 임시 사진을 올림
  await pa.goto("/log/new");
  await pa.getByRole("main").locator('input[type="file"]').setInputFiles([photo(9)]);
  await expect(pa.getByRole("main").getByText("1/5")).toBeVisible();
  const [{ id: stolenId }] = readE2eDb("SELECT id FROM MediaItem WHERE draft = 1 ORDER BY createdAt DESC LIMIT 1");

  // B가 그 사진 ID를 자기 로그에 붙이려고 폼 값을 조작해 제출
  await pb.goto("/log/new");
  const main = pb.getByRole("main");
  await fillLog(main, "남의 사진 훔치기 시도");
  await pb.evaluate((id) => {
    document.querySelector('input[name="mediaIds"]').value = JSON.stringify([id]);
  }, stolenId);
  await main.getByRole("button", { name: "작성 완료" }).click();
  await expect(pb.getByRole("heading", { level: 1, name: "남의 사진 훔치기 시도" })).toBeVisible();

  // 로그는 만들어지지만 남의 사진은 붙지 않고, A의 사진은 그대로 A의 임시 사진
  const bLogId = pb.url().split("/").pop();
  expect(readE2eDb("SELECT id FROM MediaItem WHERE logId = ?", bLogId)).toHaveLength(0);
  const row = readE2eDb("SELECT draft, logId FROM MediaItem WHERE id = ?", stolenId)[0];
  expect(row).toMatchObject({ draft: 1, logId: null });

  await a.close();
  await b.close();
});
