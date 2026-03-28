# jtmath 웹 플랫폼 — 프로젝트 전체 명세서

> 수학 과외 선생님(고창언)이 운영하는 온라인 수학 강의 플랫폼.
> 현재 네이버 스마트스토어에서 결제 → 구글 폼 등록 → 자동 계정 생성 → 강의 열람 흐름으로 운영 중.
> 장기적으로는 자체 결제까지 이 플랫폼 안으로 통합 예정.

---

## 1. 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router, Server Components, Server Actions) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS (커스텀 다크 디자인 시스템) |
| 인증/DB | Supabase (Auth + PostgreSQL) |
| 영상 스트리밍 | Bunny.net Stream |
| 결제 (예정) | Toss Payments |
| 이메일 (예정) | Resend |
| 배포 | Vercel |
| 도메인 | jtmath-web.vercel.app |
| 소스 코드 | github.com/gomath777/jtmath-web |

---

## 2. 디자인 시스템

다크 모드 기반 커스텀 브랜드 컬러:

```
brand-dark   : 배경 (#0D0D0D 계열)
brand-blue   : 주요 포인트 컬러
brand-mint   : 보조 포인트 컬러
brand-orange : 경고/강조
```

공통 카드 클래스: `.brand-card` (다크 배경 + 테두리)

---

## 3. 디렉토리 구조

```
src/
├── app/
│   ├── (marketing)/          # 비로그인 마케팅 페이지 (공통 헤더)
│   │   ├── page.tsx          # 랜딩 페이지
│   │   ├── courses/          # 강의 목록 (현재 시즌 상품 노출)
│   │   ├── login/            # 로그인
│   │   └── signup/           # 회원가입 (이메일 중복 확인 포함)
│   │
│   ├── forgot-password/      # 비밀번호 찾기
│   ├── reset-password/       # 비밀번호 재설정 (이메일 링크 도달 후)
│   │
│   ├── dashboard/            # 수강생 대시보드 (로그인 필요)
│   │   ├── page.tsx          # 수강 중인 강의 목록 + 진도율
│   │   ├── ot/               # OT 영상 페이지
│   │   └── courses/[id]/     # 강의 상세 (영상 목록 + 수강)
│   │
│   ├── admin/                # 어드민 페이지 (ADMIN_EMAILS 인증)
│   │   ├── page.tsx          # 수강생 관리 / 결제 내역 / 현황 요약 탭
│   │   ├── AdminUserRow.tsx  # 수강생 행 컴포넌트 (권한 부여/회수)
│   │   └── actions.ts        # 서버 액션: grantEnrollment, revokeEnrollment
│   │
│   ├── checkout/             # 결제 플로우 (Toss Payments, 미완성)
│   │   ├── [courseId]/       # 결제 페이지
│   │   ├── success/          # 결제 성공
│   │   └── fail/             # 결제 실패
│   │
│   ├── auth/callback/        # Supabase OAuth 콜백
│   │
│   └── api/
│       ├── register-from-sheet/  # ★ 구글 시트 연동 자동 계정 생성
│       ├── check-email/          # 이메일 중복 확인
│       ├── progress/             # 강의 진도 업데이트
│       ├── setup-test/           # 테스트 계정 생성 (개발용)
│       └── seed-students/        # 테스트 학생 일괄 생성 (개발용)
│
├── components/
│   ├── BunnyVideoPlayer.tsx      # Bunny.net 영상 플레이어
│   ├── MainHeader.tsx            # 마케팅 페이지 공통 헤더
│   └── PasswordChangeBanner.tsx  # 초기 비밀번호 변경 유도 배너
│
└── utils/supabase/
    ├── client.ts   # 브라우저용 Supabase 클라이언트
    ├── server.ts   # 서버용 Supabase 클라이언트 (쿠키 기반)
    └── admin.ts    # 서버전용 Admin 클라이언트 (service_role key)
```

---

## 4. 데이터베이스 스키마 (Supabase PostgreSQL)

### profiles
수강생 프로필 (Supabase Auth의 users와 1:1 연결)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | auth.users.id와 동일 |
| name | text | 학생 이름 |
| school | text | 재학 중인 학교 |
| birth_date | text | 생년월일 (yyyy-mm-dd) |
| phone_student | text | 학생 핸드폰 |
| phone_parent | text | 학부모 핸드폰 |
| assignment_email | text | 이메일 (로그인 이메일) |
| created_at | timestamptz | 생성일 |

### courses
강의 정보

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| title | text | 강의명 |
| subject_id | uuid (FK) | subjects 테이블 참조 |
| is_active | boolean | 현재 판매/노출 여부 |
| price | integer | 가격 (원) |
| created_at | timestamptz | |

### subjects
과목 (공수1, 공수2, 대수, 미적분1, 기하 등)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| name | text | 과목명 |
| slug | text | URL용 식별자 (예: common-math-1) |

### enrollments
수강 권한 (어떤 학생이 어떤 강의를 언제까지 들을 수 있는지)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK) | profiles.id |
| course_id | uuid (FK) | courses.id |
| valid_until | timestamptz | 수강 만료일 |
| source | text | 권한 출처 ('manual', 'sheet_sync', 'payment') |
| created_at | timestamptz | |

### lessons
강의 내 개별 영상

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| course_id | uuid (FK) | |
| title | text | 강의 제목 |
| bunny_video_id | text | Bunny.net 영상 ID |
| order_index | integer | 순서 |
| is_published | boolean | 공개 여부 |

### lesson_progress
수강생별 강의 진도

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| lesson_id | uuid (FK) | |
| completed | boolean | 완료 여부 |

### purchases
결제 내역 (Toss Payments 연동용, 현재 미사용)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| amount | integer | 결제 금액 |
| status | text | 'DONE' / 'CANCELED' / 'PENDING' |
| toss_order_id | text | Toss 주문번호 |
| created_at | timestamptz | |

---

## 5. 환경 변수

### 로컬 (.env.local) 및 Vercel 모두 설정 필요

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=eyJhbGci...   # service_role key (서버 전용, 절대 노출 금지)

# Bunny.net 강의 영상
BUNNY_LIBRARY_ID=566809
BUNNY_API_KEY=...
NEXT_PUBLIC_BUNNY_CDN_HOSTNAME=vz-xxxxxxxx.b-cdn.net

# Bunny.net 기출 영상
BUNNY_EXAM_LIBRARY_ID=622509

# 어드민 이메일 (쉼표로 여러 개 가능)
ADMIN_EMAILS=gochangeon@gmail.com

# 구글 시트 연동 시크릿 (Apps Script와 동일 값)
SHEET_SYNC_SECRET=jtmath-sheet-sync-2026

# 사이트 URL (비밀번호 재설정 이메일 링크용) ★ Vercel에 반드시 설정
NEXT_PUBLIC_SITE_URL=https://jtmath-web.vercel.app
```

---

## 6. 주요 기능 및 흐름

### 6-1. 구글 폼 → 자동 계정 생성 (현재 핵심 플로우)

```
학생: 네이버 스마트스토어 결제
  → 구글 폼 작성 (이름, 이메일, 생년월일, 수강 옵션 등)
  → 구글 시트에 응답 저장
  → Google Apps Script (onFormSubmit 트리거) 자동 실행
  → POST /api/register-from-sheet 호출 (Bearer SHEET_SYNC_SECRET)
  → Supabase Auth 계정 생성 (이메일 + 초기 비밀번호 123456)
  → profiles 테이블 insert
  → enrollments 테이블 insert (수강 옵션 → subject slug 매핑, 기본 6개월)
  → 시트 M/N/O열에 처리 결과 기록 (✅ 성공 / ❌ 실패)
```

**수강 옵션 → subject slug 매핑:**
| 폼 입력값 | slug |
|-----------|------|
| 공수1, 공통수학1 | common-math-1 |
| 공수2, 공통수학2 | common-math-2 |
| 대수 | algebra |
| 미적1, 미적분1 | calculus-1 |
| 기하 | geometry |
| 기타 | 수동 처리 (어드민에서 직접 권한 부여) |

**초기 비밀번호:** `123456` (첫 로그인 시 변경 유도 배너 표시)

### 6-2. 어드민 관리 (/admin)

- 접근 조건: `ADMIN_EMAILS`에 등록된 이메일로 로그인
- **수강생 관리 탭**: 전체 회원 목록, 수강 권한 현황, 권한 부여(강의 선택 + 기간)/회수
- **결제 내역 탭**: purchases 테이블 조회 (Toss 결제 내역, 현재는 비어있음)
- **현황 요약 탭**: 총 회원수, 총 수강 권한, 누적 매출, 강의별 수강생 수

### 6-3. 인증 (Auth)

- Supabase Auth (이메일/비밀번호)
- 계정 생성 시 이메일 확인 없이 즉시 로그인 가능 (email_confirm: true)
- 회원가입 시 이메일 중복 확인 (`/api/check-email`)
- 비밀번호 찾기 → 이메일 링크 → `/reset-password`에서 변경
- 소셜 로그인 없음

### 6-4. 수강 대시보드 (/dashboard)

- 로그인 필요, 미인증 시 `/login` redirect
- 유효한 enrollments만 조회 (`valid_until > now`)
- 강의별 진도율 계산 (lesson_progress 기준)
- 첫 로그인 시 비밀번호 변경 유도 배너 (PasswordChangeBanner)

### 6-5. 강의 시청 (/dashboard/courses/[id])

- Bunny.net Stream 영상 플레이어 (BunnyVideoPlayer)
- 강의 완료 시 `/api/progress` 호출 → lesson_progress 업데이트

---

## 7. 교육과정 및 상품 구조

자세한 내용: `design/curr.md`

**현재 활성 과목 (5개):** 공통수학1, 공통수학2, 대수, 미적분1, 기하

**상품 구조:**
| 상품 | 기간 | 가격 |
|------|------|------|
| Δ0 Regular | 8주 (겨울방학) | 560,000원 |
| Δ0 Fast | 5주 (여름방학) | 350,000원 |
| Δ1 + Δ FINAL 풀패키지 | 8주 (학기중) | 560,000원 |
| Δ FINAL 단과 | 4주 (시험직전) | 280,000원 |

> Δ1은 단독 판매 없음. 반드시 풀패키지로만 결제.

**현재 시즌 (2026년 3월):** 학기중-중간 → Δ1+FINAL 풀패키지 + FINAL 단과 노출

---

## 8. 개발 현황 및 로드맵

### 완료된 기능
- [x] 랜딩 페이지, 강의 목록 페이지
- [x] 회원가입 / 로그인 (이메일 중복 확인 포함)
- [x] 비밀번호 찾기 / 재설정
- [x] 수강 대시보드 (실제 DB 연동, 진도율 표시)
- [x] 강의 상세 페이지 (Bunny.net 영상 스트리밍)
- [x] 어드민 페이지 (수강생 관리, 권한 부여/회수, 결제 내역, 현황 요약)
- [x] 구글 폼 → 자동 계정 생성 API (`/api/register-from-sheet`)
- [x] Google Apps Script 연동 (`scripts/google-apps-script.js`)
- [x] OT 영상 페이지

### 미완성 / 예정
- [ ] **NEXT_PUBLIC_SITE_URL** Vercel 환경변수 추가 필요 (비밀번호 재설정 이메일 링크가 localhost로 가는 버그)
- [ ] Toss Payments 결제 연동 (checkout 폴더 존재, 미완성)
- [ ] 이메일 발송 (Resend 연동 — 권한 부여 알림, 결제 확인 등)
- [ ] RLS(Row Level Security) 정책 설정 (현재 미설정, 보안 취약)
- [ ] 네이버 스마트스토어 → 자체 결제로 단계적 전환
- [ ] PDF 자료 다운로드 기능
- [ ] 기출문제 영상 섹션 (BUNNY_EXAM_LIBRARY_ID 준비됨)

---

## 9. 개발 환경 세팅

```bash
git clone https://github.com/gomath777/jtmath-web.git
cd jtmath-web
npm install
# .env.local 파일 생성 후 위 환경 변수 섹션 참고하여 입력
npm run dev
# → http://localhost:3001 (3000 포트 사용 중일 경우)
```

**테스트 계정 생성:**
```
GET http://localhost:3001/api/setup-test
→ test@jtmath.com / test1234! 계정 + 강의 권한 자동 생성
```

**어드민 접근:**
`ADMIN_EMAILS`에 등록된 이메일로 로그인 후 `/admin`

---

## 10. Google Apps Script 연동

`scripts/google-apps-script.js` 파일 참고.

구글 시트 → 확장프로그램 → Apps Script에 코드 붙여넣기 후:
1. `WEBHOOK_URL` = `https://jtmath-web.vercel.app/api/register-from-sheet`
2. `SECRET_KEY` = Vercel의 `SHEET_SYNC_SECRET` 값과 동일하게 설정
3. 트리거: `onFormSubmit` / 스프레드시트에서 / 양식 제출 시

처리 결과는 시트 M(상태), N(상세), O(처리시각) 열에 자동 기록.

---

## 11. 알아두면 좋은 것들

- **RLS 미설정**: 현재 Supabase 테이블에 Row Level Security가 없음. 빠른 개발을 위해 비활성화 상태. 실제 서비스 전 반드시 설정 필요.
- **어드민 인증**: Supabase RLS 대신 `ADMIN_EMAILS` 환경변수로 서버 사이드에서 체크. 단순하지만 효과적.
- **수강 권한 source 필드**: `manual`(어드민 직접), `sheet_sync`(구글 폼 자동), `payment`(결제) 세 가지로 출처 구분 가능.
- **Bunny.net**: 영상 라이브러리가 강의용(`BUNNY_LIBRARY_ID`)과 기출용(`BUNNY_EXAM_LIBRARY_ID`) 두 개로 분리되어 있음.
