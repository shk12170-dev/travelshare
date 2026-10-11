import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { expect } from "@playwright/test";

// 테스트마다 겹치지 않는 사용자 정보 (테스트 전용 DB에만 생성됨)
export function newUser() {
  const id = randomUUID().slice(0, 8);
  return { nickname: `테스터${id}`, email: `e2e-${id}@example.test`, password: `pw-${randomUUID()}` };
}

export async function signUp(page, user, next = "/") {
  await page.goto(`/signup?next=${encodeURIComponent(next)}`);
  const form = page.getByRole("main").locator("form");
  await form.getByLabel("닉네임").fill(user.nickname);
  await form.getByLabel("이메일").fill(user.email);
  await form.getByLabel("비밀번호", { exact: true }).fill(user.password);
  await form.getByLabel("비밀번호 확인").fill(user.password);
  await form.getByRole("button", { name: "가입하기" }).click();
  await expect(page.getByRole("banner").getByRole("link", { name: user.nickname })).toBeVisible();
}

export async function logIn(page, email, password, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  const form = page.getByRole("main").locator("form").last();
  await form.getByLabel("이메일").fill(email);
  await form.getByLabel("비밀번호", { exact: true }).fill(password);
  await form.getByRole("button", { name: "로그인" }).click();
}

export async function logOut(page) {
  await page.getByRole("banner").getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("banner").getByRole("link", { name: "로그인" })).toBeVisible();
}

// 테스트 전용 DB를 직접 읽기 (메일 대신 재설정 토큰 확인 등)
export function readE2eDb(sql, ...params) {
  const db = new Database("prisma/e2e.db", { readonly: true });
  try {
    return db.prepare(sql).all(...params);
  } finally {
    db.close();
  }
}
