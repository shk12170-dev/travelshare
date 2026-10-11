import { expect, test } from "@playwright/test";
import { newUser, readE2eDb, signUp, writeE2eDb } from "./helpers.mjs";

// 데이터가 많아져도 목록이 페이지 단위로 나뉘는지 확인
test("로그·미디어 목록은 페이지로 나뉜다", async ({ page }) => {
  const user = newUser();
  await signUp(page, user);
  const [{ id: userId }] = readE2eDb("SELECT id FROM User WHERE email = ?", user.email);

  // 미래 시각으로 넣어 첫 페이지 맨 앞에 오도록 함
  const base = Date.parse("2099-01-01T00:00:00Z");
  const iso = (offset) => new Date(base + offset * 60_000).toISOString().replace("Z", "+00:00");
  writeE2eDb((db) => {
    const log = db.prepare(
      `INSERT INTO TravelLog (id, title, region, companion, cover, excerpt, body, tips, likes, createdAt, updatedAt, authorId)
       VALUES (?, ?, '서울', 'solo', 'from-sky-400 to-teal-500', '대량 데이터', '대량 데이터 본문입니다.', '[]', 0, ?, ?, ?)`,
    );
    for (let i = 1; i <= 14; i++) log.run(`bulk-log-${i}`, `대량 로그 ${String(i).padStart(2, "0")}`, iso(i), iso(i), userId);
    const media = db.prepare(
      `INSERT INTO MediaItem (id, type, caption, region, cover, likes, createdAt, authorId)
       VALUES (?, ?, ?, '서울', 'from-sky-400 to-teal-500', 0, ?, ?)`,
    );
    for (let i = 1; i <= 30; i++) media.run(`bulk-media-${i}`, i % 3 === 0 ? "video" : "photo", `대량 미디어 ${i}`, iso(i), userId);
  });

  // 로그: 1페이지 12개, 다음 페이지와 겹치지 않음
  await page.goto("/log");
  const titles = page.getByRole("main").locator("a[href^='/log/'] h3");
  await expect(titles).toHaveCount(12);
  const first = await titles.allTextContents();
  expect(first[0]).toBe("대량 로그 14");
  await page.getByRole("link", { name: "다음 →" }).click();
  await expect(page).toHaveURL(/\/log\?page=2/);
  await expect(page.getByRole("link", { name: "← 이전" })).toBeVisible();
  const second = await titles.allTextContents();
  expect(second.length).toBeGreaterThan(0);
  expect(second.filter((t) => first.includes(t))).toEqual([]);

  // 잘못된 페이지 번호는 1페이지로
  await page.goto("/log?page=abc");
  await expect(titles.first()).toHaveText("대량 로그 14");

  // 미디어: 1페이지 24개, 유형 필터는 서버에서 적용
  await page.goto("/media");
  const captions = page.getByRole("main").locator("ul.grid > li p.font-semibold");
  await expect(captions).toHaveCount(24);
  await expect(page.getByRole("link", { name: "다음 →" })).toBeVisible();
  await page.getByRole("navigation", { name: "미디어 유형" }).getByRole("link", { name: "영상" }).click();
  await expect(page).toHaveURL(/\/media\?type=video/);
  await expect(captions.first()).toHaveText("대량 미디어 30");
  const videoCaptions = await captions.allTextContents();
  // 사진으로 넣은 항목(3의 배수가 아닌 번호)은 나오면 안 됨
  const bulkNumbers = videoCaptions.filter((c) => c.startsWith("대량 미디어")).map((c) => Number(c.split(" ").at(-1)));
  expect(bulkNumbers.every((n) => n % 3 === 0)).toBe(true);

  // 프로필은 일부만 보여 주고 전체 개수 안내
  await page.goto("/profile");
  await expect(page.getByRole("link", { name: "전체 14개 보기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "전체 30개 보기" })).toBeVisible();
  await page.getByRole("link", { name: "전체 14개 보기" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${user.nickname}님의 여행 로그`);
});

test("업로드는 허가 → 올리기 → 게시 단계마다 크기·형식·내용을 검사한다", async ({ page }) => {
  await signUp(page, newUser());
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const base = { caption: "검사용", region: "서울" };
  const permit = (data) => page.request.post("/api/media", { data: { ...base, ...data } });
  const upload = (url, type, data) => page.request.put(url, { headers: { "Content-Type": type }, data });
  const MB = 1024 * 1024;

  // 1단계(허가): 형식·크기·입력값 검사
  expect((await permit({ contentType: "image/png", size: 10 * MB + 1 })).status()).toBe(413);
  expect((await permit({ contentType: "video/mp4", size: 50 * MB + 1 })).status()).toBe(413);
  expect((await permit({ contentType: "text/html", size: 10 })).status()).toBe(415);
  expect((await permit({ contentType: "image/svg+xml", size: 10 })).status()).toBe(415);
  expect((await permit({ contentType: "image/png", size: 0 })).status()).toBe(400);
  expect((await permit({ contentType: "image/png", size: 10, caption: "" })).status()).toBe(400);
  expect((await permit({ contentType: "image/png", size: 10, region: "화성" })).status()).toBe(400);

  // 2단계(올리기): 허가받은 형식과 다르면 거부, 내용이 형식과 다르면 거부
  const ok = await permit({ contentType: "image/png", size: png.length });
  expect(ok.status()).toBe(200);
  const { token, upload: target } = await ok.json();
  expect((await upload(target.url, "image/jpeg", png)).status()).toBe(415);

  const fake = await (await permit({ contentType: "image/png", size: 25 })).json();
  expect((await upload(fake.upload.url, "image/png", Buffer.from("<script>alert(1)</script>"))).status()).toBe(400);

  const big = await (await permit({ contentType: "image/png", size: 100 })).json();
  expect((await upload(big.upload.url, "image/png", Buffer.concat([png, Buffer.alloc(10 * MB)]))).status()).toBe(413);

  // 올리기 전에 게시를 시도하면 거부 (파일이 없음)
  const empty = await (await permit({ contentType: "image/png", size: png.length })).json();
  expect((await page.request.put("/api/media", { data: { token: empty.token } })).status()).toBe(404);

  // 허가증을 바꿔치기하면 거부
  const [body, sig] = token.split(".");
  const forged = JSON.parse(Buffer.from(body, "base64url").toString());
  forged.caption = "바꿔치기";
  const forgedToken = `${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${sig}`;
  expect((await page.request.put("/api/media", { data: { token: forgedToken } })).status()).toBe(403);

  // 정상: 올리고 게시, 같은 허가증으로 다시 게시해도 중복 생성되지 않음
  expect((await upload(target.url, "image/png", png)).status()).toBe(200);
  const first = await page.request.put("/api/media", { data: { token } });
  expect(first.status()).toBe(201);
  const second = await page.request.put("/api/media", { data: { token } });
  expect(second.status()).toBe(200);
  expect((await second.json()).id).toBe((await first.json()).id);
});

test("다른 사용자의 업로드 허가증은 쓸 수 없다", async ({ browser }) => {
  const owner = await browser.newContext();
  const other = await browser.newContext();
  const ownerPage = await owner.newPage();
  const otherPage = await other.newPage();
  await signUp(ownerPage, newUser());
  await signUp(otherPage, newUser());

  const permit = await ownerPage.request.post("/api/media", {
    data: { caption: "남의 것", region: "서울", contentType: "image/png", size: 12 },
  });
  const { token, upload } = await permit.json();

  const stolenUpload = await otherPage.request.put(upload.url, { headers: { "Content-Type": "image/png" }, data: Buffer.alloc(12) });
  expect(stolenUpload.status()).toBe(403);
  const stolenPublish = await otherPage.request.put("/api/media", { data: { token } });
  expect(stolenPublish.status()).toBe(403);

  await owner.close();
  await other.close();
});
