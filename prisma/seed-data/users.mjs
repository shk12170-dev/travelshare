// 샘플 사용자 데이터 (prisma/seed.mjs에서 DB에 입력)
export const users = [
  {
    id: "seacat",
    nickname: "바다고양이",
    bio: "바다가 보이는 곳이면 어디든. 주로 연인과 제주·강원 여행을 다닙니다.",
    avatar: "from-sky-400 to-teal-500",
    favoriteThemes: ["nature", "food"],
  },
  {
    id: "honbap",
    nickname: "혼밥러",
    bio: "혼자 떠나는 먹방 여행 기록.",
    avatar: "from-orange-300 to-rose-500",
    favoriteThemes: ["food", "city"],
  },
  {
    id: "hyodo",
    nickname: "효도여행",
    bio: "부모님과 함께하는 느린 여행.",
    avatar: "from-violet-400 to-indigo-600",
    favoriteThemes: ["culture"],
  },
  {
    id: "meokbo",
    nickname: "먹보삼총사",
    bio: "친구 셋이서 전국 시장 정복 중.",
    avatar: "from-emerald-300 to-teal-600",
    favoriteThemes: ["food"],
  },
  {
    id: "golmok",
    nickname: "골목탐험가",
    bio: "큰길보다 골목이 좋아요.",
    avatar: "from-amber-200 to-rose-400",
    favoriteThemes: ["city", "culture"],
  },
];
