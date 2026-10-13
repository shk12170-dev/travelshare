import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { newUser, signUp } from "./helpers.mjs";

// 자동 접근성 검사 (WCAG 2.1 A/AA). 심각(serious)·치명(critical) 문제가 없어야 통과
async function expectNoSeriousViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations
    .filter((v) => ["serious", "critical"].includes(v.impact))
    .map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  expect(serious, serious.join("\n")).toEqual([]);
}

const guestPages = ["/", "/course", "/course/jeju-east-coast", "/log", "/log/jeju-rain-day", "/media", "/search?q=제주", "/login", "/signup", "/forgot-password", "/privacy"];

for (const path of guestPages) {
  test(`접근성: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoSeriousViolations(page);
  });
}

test("접근성: 로그인 사용자 화면", async ({ page }) => {
  await signUp(page, newUser());
  for (const path of ["/log/new", "/profile", "/profile/edit", "/media", "/log/jeju-rain-day"]) {
    await page.goto(path);
    await expectNoSeriousViolations(page);
  }
});

test("접근성: 휴대폰 화면", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/", "/media", "/log/jeju-rain-day"]) {
    await page.goto(path);
    await expectNoSeriousViolations(page);
    // 가로 스크롤이 생기지 않아야 함
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test("키보드: 본문으로 건너뛰기 링크", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "본문으로 건너뛰기" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
});
