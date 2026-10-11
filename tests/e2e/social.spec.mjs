import { expect, test } from "@playwright/test";

// 실제 구글·카카오로는 이동하지 않고, 이동하려는 주소만 확인
const providers = [
  { name: "Google", host: "accounts.google.com", clientId: "e2e-google-client-id" },
  { name: "카카오", host: "kauth.kakao.com", clientId: "e2e-kakao-client-id" },
];

for (const { name, host, clientId } of providers) {
  test(`${name} 로그인 버튼은 ${host}로 이동한다`, async ({ page }) => {
    let authorizeUrl;
    await page.route(`https://${host}/**`, (route) => {
      authorizeUrl = new URL(route.request().url());
      return route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" });
    });

    await page.goto("/login?next=%2Flog%2Fnew");
    await page.getByRole("button", { name: `${name}로 계속하기` }).click();
    await expect.poll(() => authorizeUrl?.host).toBe(host);
    expect(authorizeUrl.searchParams.get("client_id")).toBe(clientId);
    expect(authorizeUrl.searchParams.get("redirect_uri")).toBe(
      `http://localhost:3200/api/auth/callback/${name === "Google" ? "google" : "kakao"}`,
    );
    // 위조 방지용 state 값이 붙어야 함
    expect(authorizeUrl.searchParams.get("state")).toBeTruthy();
  });
}
