# travelshare

혼자·친구·연인·가족과 떠나는 여행을 위한 반응형 여행 공유 웹앱입니다.

- 사진·영상(숏츠) 게시
- 동행 유형 × 테마별 여행 코스 추천
- 여행 로그와 팁 공유

로그 작성과 미디어 업로드가 SQLite DB에 저장됩니다. 로그인은 아직 없어 샘플 사용자(바다고양이)로 작성됩니다. 진행 상황과 단계별 계획은 [작업계획.md](작업계획.md)를 참고하세요.

## 기술 스택

- Next.js 16 (App Router), React 19
- Tailwind CSS 4
- Prisma 7 + SQLite (better-sqlite3)
- ESLint 9

## 시작하기

Node.js 20 이상이 필요합니다.

```bash
npm ci                      # 패키지 설치 (Prisma 클라이언트도 자동 생성)
npm run db:deploy           # DB 파일 생성과 테이블 적용
npm run db:seed             # 샘플 데이터 입력
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | 코드 검사 |
| `npm run db:migrate` | 스키마 변경 후 마이그레이션 생성·적용 |
| `npm run db:deploy` | 기존 마이그레이션 적용 |
| `npm run db:seed` | 샘플 데이터 입력 (여러 번 실행해도 안전) |
| `npm run db:studio` | DB 내용을 브라우저에서 보기 |

## 폴더 구조

```
app/              화면과 API
  api/media/      미디어 업로드(POST), 파일 제공(GET /api/media/[id]/file)
  log/actions.js  로그 저장 Server Action
components/       공통 컴포넌트
data/options.js   동행 유형·테마·지역 등 선택지
lib/              DB 연결, 조회, 입력 검증, 파일 저장
prisma/           스키마, 마이그레이션, 샘플 데이터(seed)
storage/uploads/  업로드된 파일 (Git 제외)
generated/        Prisma가 생성한 코드 (Git 제외)
```
