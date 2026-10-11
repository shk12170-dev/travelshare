# travelshare

혼자·친구·연인·가족과 떠나는 여행을 위한 반응형 여행 공유 웹앱입니다.

- 사진·영상(숏츠) 게시
- 동행 유형 × 테마별 여행 코스 추천
- 여행 로그와 팁 공유
- 댓글, 좋아요(코스 찜), 통합 검색
- 이메일 회원가입·로그인, 소셜 로그인(Google·카카오, 키 설정 시), 비밀번호 재설정, 프로필 수정

이메일 회원가입·로그인을 지원하며, 로그인한 사용자만 로그 작성과 미디어 업로드를 할 수 있고 본인 글만 수정·삭제할 수 있습니다. 데이터는 SQLite DB에 저장됩니다. 진행 상황과 단계별 계획은 [작업계획.md](작업계획.md)를 참고하세요.

## 기술 스택

- Next.js 16 (App Router), React 19
- Tailwind CSS 4
- Prisma 7 + SQLite (better-sqlite3)
- Better Auth (이메일·비밀번호 로그인)
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

- 데모 계정: `seacat@sample.travelshare.test` (비밀번호는 `prisma/seed-data/users.mjs`의 `demoAccount` 참고). 회원가입으로 새 계정을 만들어도 됩니다.
- 환경 변수는 선택입니다. 개발 중에는 `.env` 없이도 동작하며, 바꾸고 싶을 때만 `.env.example`을 `.env`로 복사해 수정하세요.
- **운영 배포 시** `BETTER_AUTH_SECRET`(32자 이상 무작위 값)과 `BETTER_AUTH_URL`(실제 사이트 주소)을 반드시 설정하세요.
- 선택 기능(`.env.example` 참고):
  - **비밀번호 재설정 메일**: `RESEND_API_KEY`, `MAIL_FROM`. 없으면 재설정 링크가 서버 콘솔에 출력됩니다.
  - **소셜 로그인**: `GOOGLE_CLIENT_ID/SECRET`, `KAKAO_CLIENT_ID/SECRET`. 키를 넣은 서비스만 로그인 화면에 버튼이 나타납니다.
    각 개발자 콘솔에 리디렉션 URI `{BETTER_AUTH_URL}/api/auth/callback/google`(또는 `kakao`)을 등록하세요.
    카카오는 이메일 제공 동의 항목이 필요합니다.
- E2E 테스트는 PC에 설치된 Edge를 사용합니다(`PW_CHANNEL=chrome`으로 변경 가능). 개발 DB와 별개인 `prisma/e2e.db`를 매번 새로 만듭니다.
- DB 구조(스키마)를 바꾼 뒤에는 개발 서버를 다시 시작하세요. 실행 중인 서버는 이전 DB 연결을 계속 사용합니다.

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | 코드 검사 |
| `npm run db:migrate` | 스키마 변경 후 마이그레이션 생성·적용 |
| `npm run db:deploy` | 기존 마이그레이션 적용 |
| `npm run db:seed` | 샘플 데이터 입력 (여러 번 실행해도 안전) |
| `npm run db:studio` | DB 내용을 브라우저에서 보기 |
| `npm run db:backup` | DB·업로드 파일 백업 (서버가 켜져 있어도 안전) |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run test:e2e` | 브라우저 E2E·접근성 테스트 (Playwright). 먼저 `npm run build` 필요 |

## 운영 시 알아 둘 것

- **백업**: `npm run db:backup`을 하루 한 번 자동 실행하세요. DB는 `backups/db/`에 최근 14개를 남기고,
  업로드 파일은 `backups/uploads/`에 새 파일만 복사합니다. 서버 디스크가 고장 나도 남도록 `BACKUP_DIR`을
  다른 디스크나 클라우드 동기화 폴더로 지정하는 것을 권장합니다.
  - Linux(cron): `0 4 * * * cd /srv/travelshare && npm run db:backup >> backups/backup.log 2>&1`
  - Windows(작업 스케줄러): 매일 실행할 프로그램 `npm`, 인수 `run db:backup`, 시작 위치는 프로젝트 폴더
  - 복구: 서버를 끄고 백업 파일을 `prisma/dev.db`(또는 `DATABASE_URL` 위치)로 복사, `backups/uploads/`를 `storage/uploads/`로 복사
- **횟수 제한**: 로그인(계정별 15분 10회), 가입, 비밀번호 재설정, 글·댓글·좋아요·업로드에 제한이 있습니다(`lib/rateLimit.js`).
  서버 메모리에 기록하므로 서버를 다시 시작하면 초기화되며, 서버 한 대 기준입니다.
- **앞단 프록시**: 운영 서버는 nginx·Caddy·Cloudflare 같은 프록시 뒤에 두세요. HTTPS 처리와 함께, IP별 횟수 제한에 쓰는
  `X-Forwarded-For` 헤더를 프록시가 설정해야 위조를 막을 수 있습니다.
- **업로드**: 파일은 한 개씩 요청 본문 그대로 받아 디스크에 바로 씁니다(메모리 사용 일정). 사진 10MB, 영상 50MB까지.
- **DB**: SQLite를 WAL 모드로 사용합니다(쓰는 중에도 읽기 가능). `prisma/*.db-wal`, `*.db-shm` 파일도 DB의 일부이니 직접 복사하지 말고 백업 명령을 쓰세요.
- **규모가 커지면**: 서버 여러 대, 대용량 영상이 필요해지는 시점에 PostgreSQL과 클라우드 저장소(S3·R2 등)로 옮기는 것을 권장합니다.

## 폴더 구조

```
app/              화면과 API
  api/media/      미디어 업로드(POST), 파일 제공(GET /api/media/[id]/file)
  api/auth/       로그인·가입 API (Better Auth)
  (auth)/         로그인·회원가입 화면과 Server Action
  log/actions.js  로그 작성·수정·삭제 Server Action (작성자 확인)
components/       공통 컴포넌트
data/options.js   동행 유형·테마·지역 등 선택지
lib/              DB 연결, 인증·세션, 조회, 입력 검증, 파일 저장, 메일
tests/unit/       단위 테스트
tests/e2e/        브라우저 E2E·접근성 테스트
prisma/           스키마, 마이그레이션, 샘플 데이터(seed)
scripts/          백업 등 운영 스크립트
storage/uploads/  업로드된 파일 (Git 제외)
generated/        Prisma가 생성한 코드 (Git 제외)
```
