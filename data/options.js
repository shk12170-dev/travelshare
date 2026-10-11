// 코스 필터에 쓰는 동행 유형과 테마 목록
export const companions = [
  { id: "solo", label: "혼자" },
  { id: "friends", label: "친구" },
  { id: "couple", label: "연인" },
  { id: "family", label: "가족" },
];

export const themes = [
  { id: "nature", label: "자연" },
  { id: "city", label: "도시" },
  { id: "food", label: "맛집" },
  { id: "culture", label: "문화" },
];

export function labelOf(list, id) {
  return list.find((item) => item.id === id)?.label ?? id;
}
