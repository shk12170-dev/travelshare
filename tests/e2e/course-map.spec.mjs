import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// 지도 타일은 외부(OpenStreetMap) 요청이므로 시험에서는 빈 이미지로 대체
const emptyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("코스 상세에 번호 마커와 출처 표기가 있는 지도가 나온다", async ({ page }) => {
  const tileRequests = [];
  await page.route("https://tile.openstreetmap.org/**", (route) => {
    tileRequests.push(route.request().url());
    return route.fulfill({ contentType: "image/png", body: emptyPng });
  });

  await page.goto("/course/jeju-east-coast");
  const map = page.getByRole("region", { name: "코스 지도" });
  await expect(map.getByRole("heading", { name: "코스 지도" })).toBeVisible();
  // 성산일출봉·우도·월정리 해변 3곳의 번호 마커
  await expect(map.locator(".ts-marker")).toHaveCount(3);
  await expect(map.locator(".ts-marker").first()).toHaveText("1");
  await expect(map.getByRole("link", { name: "OpenStreetMap" })).toBeVisible();
  await expect(map.getByText("대략적인 위치")).toBeVisible();
  expect(tileRequests.length).toBeGreaterThan(0);

  const results = await new AxeBuilder({ page }).include("[aria-label='코스 지도']").analyze();
  expect(results.violations).toEqual([]);
});
