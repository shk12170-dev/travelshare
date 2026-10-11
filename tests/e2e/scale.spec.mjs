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

test("업로드 API는 크기·형식·내용을 검사한다", async ({ page }) => {
  await signUp(page, newUser());
  const query = new URLSearchParams({ caption: "검사용", region: "서울" }).toString();
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const post = (type, data, q = query) => page.request.post(`/api/media?${q}`, { headers: { "Content-Type": type }, data });

  // 사진 한도(10MB) 초과
  expect((await post("image/png", Buffer.concat([png, Buffer.alloc(10 * 1024 * 1024)]))).status()).toBe(413);
  // 형식을 속인 파일
  expect((await post("image/png", Buffer.from("<script>alert(1)</script>"))).status()).toBe(400);
  // 허용하지 않는 형식
  expect((await post("text/html", Buffer.from("<h1>x</h1>"))).status()).toBe(415);
  // 설명 없음
  expect((await post("image/png", png, new URLSearchParams({ region: "서울" }).toString())).status()).toBe(400);
  // 정상
  expect((await post("image/png", png)).status()).toBe(201);
});
