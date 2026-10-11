# travelshare

혼자·친구·연인·가족과 떠나는 여행을 위한 반응형 여행 공유 웹앱입니다.

- 사진·영상(숏츠) 게시
- 동행 유형 × 테마별 여행 코스 추천
- 여행 로그와 팁 공유

현재는 샘플 데이터로 동작하는 프로토타입입니다. 진행 상황과 단계별 계획은 [작업계획.md](작업계획.md)를 참고하세요.

## 기술 스택

- Next.js 16 (App Router), React 19
- Tailwind CSS 4
- ESLint 9

## 시작하기

Node.js 20 이상이 필요합니다.

```bash
npm ci
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | 코드 검사 |

## 폴더 구조

```
app/          화면(라우트): /, /course, /course/[id], /media, /log, /log/[id], /log/new, /profile
components/   공통 컴포넌트
data/         샘플 데이터 (5단계에서 DB로 교체 예정)
public/       정적 파일
```
