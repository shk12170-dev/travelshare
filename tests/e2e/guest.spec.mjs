import { expect, test } from "@playwright/test";

test.describe("로그인하지 않은 방문자", () => {
  test("홈·코스·로그·미디어를 볼 수 있다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "인기 코스" })).toBeVisible();
    await page.getByRole("link", { name: "코스 찾아보기" }).click();
    await expect(page.getByRole("heading", { name: "여행 코스 추천" })).toBeVisible();
    await page.goto("/log");
    await expect(page.getByRole("heading", { name: "여행 로그" })).toBeVisible();
    await page.goto("/media");
    await expect(page.getByText("로그인하면 내 사진과 영상을 올릴 수 있어요.")).toBeVisible();
  });

  test("코스 필터가 동작한다", async ({ page }) => {
    await page.goto("/course");
    await page.getByRole("button", { name: "가족", exact: true }).click();
    await expect(page.getByText("코스 3개")).toBeVisible();
    await expect(page.getByRole("heading", { name: "강릉 가족 바다 여행" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "부산 시장 먹거리 투어" })).toHaveCount(0);
  });

  test("검색으로 코스·로그·미디어를 찾는다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "검색" }).click();
    await page.getByRole("searchbox", { name: "검색어" }).fill("제주");
    await page.getByRole("button", { name: "검색", exact: true }).click();
    await expect(page).toHaveURL(/\/search\?q=/);
    await expect(page.getByRole("heading", { name: "제주 동쪽 해안 드라이브" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "비 오는 날의 제주, 오히려 좋았던 이유" })).toBeVisible();

    await page.goto("/search?q=없는검색어xyz");
    await expect(page.getByText("결과가 없습니다")).toBeVisible();
  });

  test("쓰기 화면은 로그인으로 보낸다", async ({ page }) => {
    for (const path of ["/log/new", "/profile", "/profile/edit", "/log/jeju-rain-day/edit"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
    }
  });

  test("없는 페이지는 404 상태 코드와 안내 화면", async ({ page }) => {
    for (const path of ["/course/no-such-course", "/log/no-such-log", "/no-such-page"]) {
      const res = await page.goto(path);
      expect(res.status(), path).toBe(404);
      await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
    }
  });

  test("쓰기 API는 401로 거부한다", async ({ request }) => {
    const permit = await request.post("/api/media", { data: { caption: "x", region: "제주", contentType: "image/png", size: 10 } });
    expect(permit.status()).toBe(401);
    const publish = await request.put("/api/media", { data: { token: "x.y" } });
    expect(publish.status()).toBe(401);
    const direct = await request.put("/api/media/upload/x.y", { headers: { "Content-Type": "image/png" }, data: Buffer.alloc(4) });
    expect(direct.status()).toBe(401);
    const del = await request.delete("/api/media/m1");
    expect(del.status()).toBe(401);
  });

  test("좋아요를 누르면 로그인 화면으로 간다", async ({ page }) => {
    await page.goto("/course/jeju-east-coast");
    await page.getByRole("button", { name: /좋아요/ }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fcourse%2Fjeju-east-coast/);
  });

  test("이용 안내 화면이 모든 화면의 안내 줄과 가입 화면에서 연결된다", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("main").getByRole("link", { name: "이용 안내·개인정보 처리" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1, name: "이용 안내·개인정보 처리" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "수집하는 정보" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("이메일 주소");

    await page.goto("/course");
    await page.getByRole("note").getByRole("link", { name: "이용 안내" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
  });

  test("로그인 후 외부 주소로 이동하지 않는다", async ({ page }) => {
    await page.goto("/login?next=https%3A%2F%2Fevil.example");
    await expect(page.locator('input[name="next"]')).toHaveValue("/");
  });
});
