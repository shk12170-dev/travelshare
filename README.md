# travelshare

혼자·친구·연인·가족과 떠나는 여행을 위한 반응형 여행 공유 웹앱입니다.

- 사진·영상(숏츠) 게시
- 동행 유형 × 테마별 여행 코스 추천
- 여행 로그와 팁 공유
- 댓글, 좋아요(코스 찜), 통합 검색
- 이메일 회원가입·로그인, 소셜 로그인(Google·카카오, 키 설정 시), 비밀번호 재설정, 프로필 수정

## 배포 주소

**https://travelshare-shk.vercel.app**

과제 제출용 데모 사이트입니다(Vercel + Turso + Vercel Blob, 무료 플랜). 회원가입으로 새 계정을 만들면 모든 기능을 써 볼 수 있습니다.
실제 개인정보는 입력하지 마세요.

이메일 회원가입·로그인을 지원하며, 로그인한 사용자만 로그 작성과 미디어 업로드를 할 수 있고 본인 글만 수정·삭제할 수 있습니다.
개발 환경에서는 로컬 SQLite 파일에, 배포 환경에서는 Turso(DB)와 Vercel Blob(사진·영상)에 저장됩니다.
진행 상황과 단계별 계획은 [작업계획.md](작업계획.md), 과제 제출 자료는 [docs/aleph](docs/aleph)를 참고하세요.

## 기술 스택

- Next.js 16 (App Router), React 19
- Tailwind CSS 4
- Prisma 7 + SQLite(개발) / Turso(배포), libSQL 어댑터
- Cloudflare R2(배포 시 사진·영상 저장), Vercel(호스팅)
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
| `npm run db:backup` | DB·업로드 파일 백업 (서버가 켜져 있어도 안전. Turso면 SQL로 내려받기) |
| `npm run db:migrate:remote` | 마이그레이션을 Turso에 적용 |
| `npm run db:seed:remote` | Turso에 샘플 데이터·평가자 계정 입력 (DEMO_PASSWORD 필요) |
| `npm run db:backup:remote` | Turso DB를 SQL 파일로 백업 |
| `npm run db:seed:courses` | 코스 데이터만 입력 (운영 DB용) |
| `npm run check:services` | Turso·R2 연결 점검 |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run test:e2e` | 브라우저 E2E·접근성 테스트 (Playwright). 먼저 `npm run build` 필요 |

## 배포 (Vercel + Turso + Cloudflare R2, 무료 범위)

서버리스 구조라 서버를 직접 관리하지 않습니다. 구성: **Vercel**(앱) + **Turso**(DB) + **Cloudflare R2**(사진·영상).
계정 가입과 키 발급은 각 서비스에서 직접 해야 합니다.

> **주의**: Vercel 무료(Hobby) 플랜은 **비상업적·개인 용도**만 허용합니다. 광고·결제 등 수익 활동을 하려면 유료 플랜이 필요합니다.
> R2는 가입할 때 결제 수단 등록이 필요할 수 있습니다(무료 범위 안에서는 청구되지 않음).

### 1. Turso 만들기
1. https://turso.tech 가입 → 데이터베이스 생성 (위치는 도쿄 `aws-ap-northeast-1` 권장)
2. 데이터베이스 주소(`libsql://...`)와 토큰(Create Token)을 복사해 `.env`에 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`으로 저장
3. 테이블 만들기와 데이터 넣기:
   ```bash
   npm run db:migrate:remote
   npm run db:seed:remote     # 샘플 코스·로그·미디어 + 평가자 체험 계정 (.env의 DEMO_PASSWORD 필요)
   # 또는 코스만: npm run db:seed:courses -- --remote
   ```
   원격 DB에서는 저장소에 공개된 개발용 비밀번호를 쓰지 않습니다. `DEMO_PASSWORD`(12자 이상)를 `.env`에 넣어야 체험 계정이 만들어집니다.

### 2. 사진·영상 저장소 만들기 — Vercel Blob (권장, 결제 수단 불필요)
1. Vercel 대시보드 → 프로젝트 → **Storage** → **Create** → **Blob**
2. 접근 방식은 **Public** 선택 (브라우저가 사진 주소로 바로 볼 수 있어야 함)
3. 프로젝트에 연결하면 `BLOB_READ_WRITE_TOKEN` 환경 변수가 자동으로 추가됩니다.
4. PC에서 점검하려면 같은 토큰을 `.env`의 `BLOB_READ_WRITE_TOKEN`에 넣습니다(Storage → Blob → `.env.local` 탭에서 복사).

무료(Hobby) 한도: 저장 1GB, 업로드 월 2,000회, 전송 월 10GB. 한도를 넘어도 청구되지 않고 30일간 사용이 멈춥니다.
사진은 브라우저에서 줄여 올리고 영상은 20MB까지라 과제·시연 용도로는 충분합니다.

### 2-1. (선택) Cloudflare R2 만들기 — 결제 수단 등록 필요, R2_* 를 넣으면 Blob 대신 R2를 사용
1. https://dash.cloudflare.com → R2 → 버킷 만들기 (이름 예: `travelshare-media`, 위치 힌트: 아시아 태평양)
2. **API 토큰**: R2 → API 토큰 관리 → 권한 "객체 읽기 및 쓰기", 대상은 위 버킷만 → Access Key ID / Secret Access Key 복사
3. `.env`에 `R2_ACCOUNT_ID`(대시보드 오른쪽 계정 ID), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` 저장
4. **CORS 설정** (브라우저에서 직접 올리려면 필요): 버킷 → 설정 → CORS 정책에 아래를 붙여넣고 `AllowedOrigins`를 실제 사이트 주소로 바꿉니다.
   ```json
   [
     {
       "AllowedOrigins": ["https://travelshare-shk.vercel.app", "http://localhost:3000"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
5. **임시 파일 자동 삭제** (권장): 버킷 → 설정 → 객체 수명 주기 규칙 → 접두사 `pending/` 객체를 1일 후 삭제.
   (업로드만 하고 게시하지 않은 파일이 쌓이지 않게 합니다.)

### 3. 연결 점검
```bash
npm run check:services
```
Turso 접속·테이블, R2 업로드·형식 제한·복사·Range 읽기·삭제를 실제로 시험하고 문제가 있으면 해결 방법을 알려 줍니다.

### 4. Vercel 배포
1. https://vercel.com 가입 → GitHub 저장소(`travelshare`) 가져오기
2. Environment Variables에 `.env`의 `TURSO_*`, `R2_*`와 아래 값을 추가
   - `BETTER_AUTH_SECRET`: 32자 이상 무작위 값 (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
   - (선택) `RESEND_API_KEY`, `MAIL_FROM`, 소셜 로그인 키
3. Deploy. 사이트 주소(예: `https://travelshare-shk.vercel.app`)는 자동으로 인식됩니다(`BETTER_AUTH_URL` 불필요).
4. 배포된 주소를 R2의 CORS `AllowedOrigins`에 넣기
5. 코드를 GitHub에 push하면 자동으로 다시 배포됩니다. DB 구조를 바꿨다면 push 전에 `npm run db:migrate:remote`를 먼저 실행하세요.

### PC와 배포 환경의 구분 (실제 데이터 보호)
- `.env`에 Turso·Blob·R2 키가 있어도 **PC의 개발 서버·테스트는 항상 로컬 파일 DB와 로컬 폴더**를 씁니다.
- 클라우드는 **Vercel에서 실행될 때**, 또는 이름이 `:remote`로 끝나는 명령(`--remote`)을 실행할 때만 사용합니다.
- Vercel에서 Turso 주소가 없으면 로컬로 넘어가지 않고 오류를 냅니다(잘못된 설정을 바로 알 수 있게).

### 외부 서비스를 연결하지 않았을 때
- **메일(Resend)이 없으면**: 비밀번호 찾기 화면이 "메일 발송을 연결하지 않았다"는 안내로 바뀌고 로그인 화면의 링크도 숨겨집니다.
- **R2가 없으면(Vercel)**: 미디어 화면에 "사진·영상 올리기는 준비 중" 안내가 나옵니다. 둘러보기 등 다른 기능은 그대로 동작합니다.
- 모든 화면 위에 "과제 제출용 데모 사이트" 안내가 표시됩니다(`components/DemoNotice.js`).

### 운영 중 알아 둘 것
- **백업**: `npm run db:backup:remote`는 Turso DB 전체를 SQL 파일로 내려받습니다(`backups/db/`). 사진·영상은 R2가 보관합니다.
  Turso 무료 플랜의 복구 기능(하루 전까지)도 있지만 별도로 주기적으로 백업해 두세요.
- **횟수 제한**은 DB에 기록되어 여러 서버가 나뉘어 돌아도 함께 적용됩니다. IP 확인에는 Vercel이 붙이는 `X-Forwarded-For`를 사용합니다.
- **영상**은 변환 없이 원본 그대로 보여 주며 20MB까지입니다(무료 저장소 1GB 고려). 사진은 브라우저에서 긴 변 2048px로 줄여 올립니다(위치 정보도 제거됨).
- **무료 한도**: R2 저장 10GB·읽기 월 1,000만 회, Turso 저장 5GB·읽기 월 5억 행, Vercel 전송 월 100GB. 한도에 가까워지면 각 대시보드에서 확인하세요.

## 운영 시 알아 둘 것 (자체 서버로 운영하는 경우)

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
- **업로드**: 파일은 한 개씩 요청 본문 그대로 받아 디스크에 바로 씁니다(메모리 사용 일정). 사진 10MB, 영상 20MB까지.
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
