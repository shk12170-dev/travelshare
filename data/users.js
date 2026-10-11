// 샘플 사용자 데이터. 로그인 기능(6단계) 전까지는 currentUserId를 내 계정으로 간주
export const users = [
  {
    id: "seacat",
    nickname: "바다고양이",
    bio: "바다가 보이는 곳이면 어디든. 주로 연인과 제주·강원 여행을 다닙니다.",
    avatar: "from-sky-400 to-teal-500",
    favoriteThemes: ["nature", "food"],
  },
];

export const currentUserId = "seacat";

export function getUser(id) {
  return users.find((user) => user.id === id);
}
