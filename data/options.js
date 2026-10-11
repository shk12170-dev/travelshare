// 화면과 검증에 공통으로 쓰는 선택지 목록
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

export const mediaTypes = [
  { id: "photo", label: "사진" },
  { id: "video", label: "영상" },
  { id: "shorts", label: "숏츠" },
];

export const regions = ["서울", "부산", "제주", "강원", "경북", "전북", "기타"];

export function labelOf(list, id) {
  return list.find((item) => item.id === id)?.label ?? id;
}
