# jtmath 웹플랫폼 — 프로젝트 개요

고등학교 수학 강의 플랫폼. 학생이 강의를 구매하고, 영상을 시청하며, 관리자가 수강 권한을 관리한다.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 14 (App Router, TypeScript) |
| 인증 / DB | Supabase (PostgreSQL + Auth) |
| 스타일링 | Tailwind CSS (다크 브랜드 디자인 시스템) |
| 결제 | Toss Payments (payment-widget-sdk) |
| 영상 스트리밍 | Bunny.net (iframe 플레이어) |
| 이메일 | Resend |
| 배포 | Vercel |

---

## 폴더 구조

```
src/
├── app/
│   ├── (marketing)/           # 공개 페이지 그룹 (레이아웃 공유)
│   │   ├── page.tsx           # 홈 (/)
│   │   ├── courses/page.tsx   # 강의 목록 & 수강 신청
│   │   ├── login/             # 로그인 (page + actions)
│   │   └── signup/            # 회원가입 (page + actions)
│   │
│   ├── dashboard/             # 학생 강의실 (로그인 필요)
│   │   ├── page.tsx           # 내 강의 목록 + 진도율
│   │   ├── courses/[id]/      # 강의 뷰어 (영상 + PDF)
│   │   ├── ot/page.tsx        # 오리엔테이션 페이지
│   │   └── layout.tsx         # 사이드바 네비게이션
│   │
│   ├── checkout/
│   │   ├── [courseId]/        # 결제 페이지 (Toss 위젯)
│   │   ├── success/           # 결제 완료 → 수강 권한 자동 부여
│   │   └── fail/              # 결제 실패
│   │
│   ├── admin/                 # 관리자 대시보드 (이메일 게이트)
│   │   ├── page.tsx           # 수강생/결제/통계 탭
│   │   ├── actions.ts         # 수강 권한 부여/삭제 Server Action
│   │   └── AdminUserRow.tsx   # 학생 행 컴포넌트
│   │
│   ├── forgot-password/       # 비밀번호 찾기
│   ├── reset-password/        # 비밀번호 재설정
│   ├── auth/callback/         # Supabase OAuth 콜백
│   │
│   └── api/
│       ├── check-email/       # 이메일 중복 확인
│       ├── progress/          # 영상 시청 진도 저장/조회
│       ├── setup-test/        # 테스트 계정 생성 (개발용)
│       └── seed-students/     # 테스트 학생 5명 대량 생성 (개발용)
│
├── components/
│   ├── MainHeader.tsx         # 상단 네비게이션 헤더
│   └── BunnyVideoPlayer.tsx   # Bunny.net 영상 플레이어
│
└── utils/supabase/
    ├── client.ts              # 브라우저용 Supabase 클라이언트
    ├── server.ts              # 서버용 Supabase 클라이언트 (SSR)
    └── admin.ts               # 서비스 롤 클라이언트 (admin 전용)
```

---

## 페이지 라우트

| 경로 | 접근 | 설명 |
|------|------|------|
| `/` | 공개 | 홈 (히어로, CTA) |
| `/courses` | 공개 | 과목별 강의 목록, 결제 버튼 |
| `/login` | 공개 | 이메일/비밀번호 로그인 |
| `/signup` | 공개 | 회원가입 (이름, 학교, 연락처 등) |
| `/forgot-password` | 공개 | 비밀번호 재설정 이메일 발송 |
| `/reset-password` | 공개 | 새 비밀번호 입력 (이메일 링크 경유) |
| `/dashboard` | 로그인 필요 | 내 강의 목록 + 진도율 |
| `/dashboard/courses/[id]` | 로그인 + 수강 중 | 강의 영상 시청, PDF 다운로드 |
| `/dashboard/ot` | 로그인 필요 | 오리엔테이션 (앱 설정 가이드) |
| `/checkout/[courseId]` | 로그인 필요 | Toss 결제 위젯 |
| `/checkout/success` | 로그인 필요 | 결제 완료 처리 + 수강 권한 부여 |
| `/checkout/fail` | 로그인 필요 | 결제 실패 안내 |
| `/admin` | 관리자 이메일만 | 수강생 관리, 결제 내역, 통계 |

---

## 데이터베이스 스키마 (PostgreSQL / Supabase)

> RLS 현재 전체 비활성화 상태 (개발 중)

```
auth.users (Supabase 기본)
    └── profiles           id, name, school, birth_date, phone_student, phone_parent, assignment_email
            └── enrollments    user_id, course_id, valid_until, source
            └── purchases      user_id, product_id, amount, toss_order_id, status

subjects                   slug, name, sort_order  (7개 과목)
    └── courses            subject_id, delta_level, title, is_active
            └── lessons    course_id, week_number, lesson_number, title, bunny_video_id, pdf_*_url
            └── lesson_progress  user_id, lesson_id, position_secs, duration_secs, completed
    └── products           subject_id, slug, name, price, duration_weeks, included_modules
```

### 주요 테이블 설명

**profiles** — Supabase auth.users를 확장한 학생 프로필. 가입 시 자동 생성.

**courses** — 실제 강의 묶음. delta_level로 구분: `delta-0`(개념), `delta-1`(유형분석), `delta-final`(실전), `delta-2`(심화)

**products** — 결제 단위 상품. 하나의 상품이 여러 course를 포함할 수 있음 (`included_modules: ["delta-1", "delta-final"]`).

**enrollments** — 수강 권한 테이블. `valid_until`이 현재 시각보다 미래면 수강 가능. `source`는 `toss_payment` / `admin_grant` / `naver_manual`.

**lesson_progress** — 영상 시청 위치 저장. 90% 이상 시청 시 `completed = true` 자동 처리.

---

## 주요 기능 흐름

### 1. 회원가입
```
/signup → signupUser() (Server Action)
→ supabase.auth.signUp() → profiles 테이블 insert
→ 이메일 인증 (Supabase 설정에 따라 on/off)
→ /login?registered=true
```
- 이메일 중복 확인: blur 이벤트 → `/api/check-email` (admin 클라이언트로 조회)

### 2. 로그인
```
/login → loginUser() (Server Action)
→ supabase.auth.signInWithPassword()
→ /dashboard
```

### 3. 비밀번호 재설정
```
/forgot-password → sendPasswordReset()
→ supabase.auth.resetPasswordForEmail({ redirectTo: /reset-password })
→ 이메일 클릭 → /reset-password
→ updatePassword() → supabase.auth.updateUser({ password })
→ /login?reset=true
```

### 4. 결제 → 수강 권한 부여
```
/courses → /checkout/[courseId]?product=xxx
→ Toss Payments 위젯 렌더링
→ 결제 완료 → Toss가 /checkout/success?paymentKey=...&orderId=...&amount=... 로 리다이렉트
→ 서버에서 Toss API 결제 승인 (server-to-server)
→ purchases 테이블 insert (status: DONE)
→ enrollments 테이블 insert (valid_until: +1년)
→ 성공 화면
```
orderId 패턴: `MATHGO-{courseId}-{uuid}`

### 5. 강의 시청
```
/dashboard/courses/[id]
→ enrollments 유효성 확인 → 없으면 /courses로 리다이렉트
→ lesson_progress에서 마지막 시청 위치 로드 → Bunny iframe 플레이어
→ 10초마다 + pause/seek/end 이벤트 → /api/progress POST (위치 저장)
→ 90% 시청 시 completed = true 자동 처리
```

### 6. 관리자
```
/admin (ADMIN_EMAILS 환경변수에 등록된 이메일만 접근)
→ 수강생 관리: 수강 권한 부여 (1~12개월) / 삭제
→ 결제 내역: 전체 purchase 목록
→ 통계: 총 회원수, 수강 권한 수, 누적 매출
```
관리자 전용 API는 `createAdminClient()` (service role key) 사용.

---

## 환경 변수

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=          # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # anon/public 키
SUPABASE_SERVICE_KEY=              # service_role 키 (관리자 API용, 서버 전용)

# Bunny.net
BUNNY_LIBRARY_ID=                  # 영상 라이브러리 ID
BUNNY_API_KEY=                     # API 키
NEXT_PUBLIC_BUNNY_CDN_HOSTNAME=    # CDN 호스트명

# Toss Payments
NEXT_PUBLIC_TOSS_CLIENT_KEY=       # 클라이언트 키 (미설정 시 테스트 키 사용)
TOSS_SECRET_KEY=                   # 시크릿 키 (미설정 시 테스트 키 사용)

# 이메일
RESEND_API_KEY=                    # Resend 이메일 발송 키

# 앱 설정
NEXT_PUBLIC_SITE_URL=              # 배포 URL (비밀번호 재설정 이메일 링크용)
ADMIN_EMAILS=                      # 관리자 이메일 (쉼표 구분, 여러 명 가능)
```

---

## 디자인 시스템

다크 모드 기본. CSS 변수 + Tailwind 확장으로 구성.

```
배경     brand-dark     #121212
카드     brand-surface  #1A1A1A
카드(높) brand-elevated #242424
포인트   brand-blue     #2979FF   (주 CTA, 링크)
성공     brand-mint     #00E676   (완료, 가능)
경고     brand-orange   #FF3D00   (오류, 경고)
```

유틸 클래스:
- `.brand-card` — 기본 카드 (surface 배경 + 테두리)
- `.brand-gradient-text` — blue → mint 그라디언트 텍스트
- `.brand-glow-blue` / `.brand-glow-mint` — 글로우 효과

---

## 개발용 유틸리티 API

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/setup-test` | 테스트 계정 생성 (`test@jtmath.com` / `test1234!`) + 수강 권한 부여 |
| `GET /api/seed-students` | 테스트 학생 5명 대량 생성 (비밀번호: `test1234!`) |

> 프로덕션 배포 전에 이 엔드포인트는 삭제하거나 인증 게이트 추가 필요

---

## 현재 상태 / 알려진 사항

- **RLS 비활성화**: 현재 모든 테이블의 Row Level Security가 꺼져 있음. 프로덕션 전 반드시 정책 설정 필요
- **Toss 테스트 모드**: `TOSS_SECRET_KEY` 미설정 시 Toss 공식 테스트 키로 동작 (실제 결제 안 됨)
- **이메일 인증**: Supabase Auth 설정에서 on/off 가능. 개발 중에는 off 권장
- **수강 권한 유효기간**: 결제 시 +1년, 관리자 수동 부여 시 1~12개월 선택
- **강의 컨텐츠**: `is_published = true`인 lesson만 학생에게 노출

---

## 로컬 개발 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.local.example .env.local  # 값 채워넣기

# 3. Supabase에 스키마 적용
# Supabase 대시보드 SQL Editor에서 schema.sql 실행

# 4. 개발 서버 실행
npm run dev

# 5. 테스트 계정 생성
# http://localhost:3000/api/setup-test 접속
```
