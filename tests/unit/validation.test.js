import { describe, expect, it } from "vitest";
import {
  LOG_LIMITS,
  splitTips,
  validateComment,
  validateLog,
  validateMediaFile,
  validatePasswordChange,
  validateProfile,
  validateSignup,
  avatarChoices,
} from "@/lib/validation";

const validLog = { title: "제주 여행", region: "제주", companion: "solo", body: "열 글자 이상의 본문입니다.", tips: "" };

describe("validateLog", () => {
  it("올바른 입력은 오류 없음", () => {
    expect(validateLog(validLog)).toEqual({});
  });

  it("목록에 없는 지역·동행 유형은 거부", () => {
    const errors = validateLog({ ...validLog, region: "화성", companion: "alien" });
    expect(errors.region).toBeDefined();
    expect(errors.companion).toBeDefined();
  });

  it("제목·본문 길이 제한", () => {
    expect(validateLog({ ...validLog, title: " a " }).title).toBeDefined();
    expect(validateLog({ ...validLog, title: "가".repeat(LOG_LIMITS.titleMax + 1) }).title).toBeDefined();
    expect(validateLog({ ...validLog, body: "짧음" }).body).toBeDefined();
  });

  it("팁 개수 제한", () => {
    const tips = Array.from({ length: LOG_LIMITS.tipsMax + 1 }, (_, i) => `팁 ${i}`).join("\n");
    expect(validateLog({ ...validLog, tips }).tips).toBeDefined();
  });
});

describe("splitTips", () => {
  it("빈 줄과 앞뒤 공백 제거", () => {
    expect(splitTips(" 하나 \n\n 둘\n")).toEqual(["하나", "둘"]);
  });
});

describe("validateComment", () => {
  it("빈 댓글과 너무 긴 댓글은 거부", () => {
    expect(validateComment("   ")).not.toBeNull();
    expect(validateComment("가".repeat(501))).not.toBeNull();
    expect(validateComment("좋은 정보 감사합니다")).toBeNull();
  });
});

describe("validateSignup", () => {
  const ok = { nickname: "여행자", email: "a@b.co", password: "password1", passwordConfirm: "password1" };

  it("올바른 입력은 오류 없음", () => {
    expect(validateSignup(ok)).toEqual({});
  });

  it("짧은 비밀번호·불일치·잘못된 이메일", () => {
    const errors = validateSignup({ ...ok, email: "no-at-sign", password: "short", passwordConfirm: "other" });
    expect(Object.keys(errors).sort()).toEqual(["email", "password", "passwordConfirm"]);
  });
});

describe("validatePasswordChange", () => {
  it("현재 비밀번호 누락과 확인 불일치", () => {
    const errors = validatePasswordChange({ currentPassword: "", newPassword: "newpassword", confirm: "different" });
    expect(errors.currentPassword).toBeDefined();
    expect(errors.confirm).toBeDefined();
  });
});

describe("validateProfile", () => {
  it("허용되지 않은 색상·테마는 거부", () => {
    const errors = validateProfile({ nickname: "여행자", bio: "", avatar: "bg-[url(x)]", favoriteThemes: ["hack"] });
    expect(errors.avatar).toBeDefined();
    expect(errors.favoriteThemes).toBeDefined();
  });

  it("올바른 입력은 오류 없음", () => {
    expect(validateProfile({ nickname: "여행자", bio: "안녕", avatar: avatarChoices[0], favoriteThemes: ["food"] })).toEqual({});
  });
});

describe("validateMediaFile", () => {
  const file = (type, size) => ({ type, size });

  it("허용 형식과 용량", () => {
    expect(validateMediaFile(file("image/png", 1024))).toBeNull();
    expect(validateMediaFile(file("video/mp4", 50 * 1024 * 1024))).toBeNull();
  });

  it("SVG·HTML 등 다른 형식, 용량 초과, 빈 파일은 거부", () => {
    expect(validateMediaFile(file("image/svg+xml", 10))).not.toBeNull();
    expect(validateMediaFile(file("text/html", 10))).not.toBeNull();
    expect(validateMediaFile(file("image/jpeg", 11 * 1024 * 1024))).not.toBeNull();
    expect(validateMediaFile(file("image/png", 0))).not.toBeNull();
  });
});
