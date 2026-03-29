# MathGo Web - 프로젝트 인수인계 문서

> 최종 업데이트: 2026-03-28
> 작성 기준: 코드베이스 직접 탐색 결과

---

## 1. 프로젝트 개요

### 서비스 이름 및 목적
- **서비스명:** jtmath. (MathGo Web)
- **목적:** 고등학교 수학 학원(JT수학)의 온라인 학습 플랫폼
- 학생별 학습지(PDF) 배정, 해설 영상 시청, 진도 추적, 결제를 하나의 웹앱에서 제공

### 타겟 사용자
| 역할 | 설명 |
|------|------|
| **학생** | 고1~고2 수학 수강생. 배정된 학습지를 다운로드하고 해설영상을 시청 |
| **관리자(선생님)** | 커리큘럼 생성, 학습지 업로드, 학생 배정, 진도 확인 |
| **비회원** | 마케팅 페이지에서 강좌 정보 확인 후 결제/가입 |

### 핵심 기능 요약
1. **커리큘럼 기반 학습 관리** — 차시별 블록(PDF + 힌트북 + 해설영상 + 안내텍스트) 구성
2. **해설영상 자동매칭** — Claude API로 PDF에서 문제 메타데이터 추출 → exam_videos DB에서 영상 매칭
3. **학생 대시보드** — 달력 기반 학습 배정 확인 → 차시별 세션 페이지 → 영상 시청 진도 추적
4. **결제 시스템** — Toss Payments 연동, 결제 완료 시 자동 수강 등록
5. **관리자 패널** — 수강생 관리, 결제 내역, 커리큘럼 편집기, 콘텐츠 라이브러리

---

## 2. 기술 스택

### 프레임워크 / 언어 / 런타임
| 항목 | 버전 |
|------|------|
| Next.js | 14.2.35 |
| React | ^18 |
| TypeScript | ^5 |
| Node.js | (명시적 지정 없음, Next.js 14 호환 버전 필요) |
| Tailwind CSS | ^3.4.1 |

### 주요 라이브러리
| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@supabase/supabase-js` | ^2.99.1 | DB, Auth, Storage |
| `@supabase/ssr` | ^0.9.0 | 서버사이드 Supabase 클라이언트 |
| `@tosspayments/payment-sdk` | ^1.9.2 | 결제 SDK |
| `@tosspayments/payment-widget-sdk` | ^0.12.1 | 결제 위젯 |
| `@anthropic-ai/sdk` | ^0.80.0 | Claude API (PDF 파싱) |
| `lucide-react` | ^0.577.0 | 아이콘 |
| `resend` | ^6.9.3 | 이메일 발송 |
| `uuid` | ^13.0.0 | UUID 생성 |

### 외부 서비스
| 서비스 | 용도 | 비고 |
|--------|------|------|
| **Supabase** | PostgreSQL DB + Auth + Storage(PDF) | 핵심 백엔드 |
| **Bunny.net Stream** | 영상 CDN (2개 라이브러리) | Library 566809(강의), 622509(기출해설) |
| **Toss Payments** | 결제 | 테스트 키 하드코딩 상태 |
| **Anthropic Claude** | PDF 문제 파싱 + 영상 매칭 | claude-sonnet-4-6 모델 사용 |
| **Resend** | 이메일 발송 | 가입 인증 등 |
| **Vercel** | 배포 | 추정 (vercel.json 미존재) |

---

## 3. 환경 설정

### 필수 환경변수 (.env.local)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Bunny.net
BUNNY_LIBRARY_ID=
BUNNY_API_KEY=
NEXT_PUBLIC_BUNNY_CDN_HOSTNAME=
BUNNY_EXAM_LIBRARY_ID=

# Anthropic
ANTHROPIC_API_KEY=

# Admin
ADMIN_EMAILS=               # 쉼표 구분, 기본값 'admin@jtmath.com'

# Toss Payments
NEXT_PUBLIC_TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=

# Misc
NEXT_PUBLIC_SITE_URL=       # 기본값 http://localhost:3000
SHEET_SYNC_SECRET=          # Google Apps Script 연동용
```

### 로컬 실행 방법
```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local   # (현재 .env.example 파일 없음 - 위 키 목록 참고)

# 3. 개발 서버 실행
npm run dev                   # http://localhost:3000

# 4. (선택) 영상 업로드 스크립트
npm run upload
```

### 배포 환경
- **추정: Vercel** (Next.js 프로젝트, vercel.json은 미존재)
- `next.config.mjs`에서 빌드 시 ESLint/TypeScript 에러 무시 설정됨:
  ```js
  eslint: { ignoreDuringBuilds: true }
  typescript: { ignoreBuildErrors: true }
  ```

---

## 4. 폴더 구조

```
mathgo-web/
├── src/
│   ├── app/
│   │   ├── (marketing)/          # 공개 마케팅 페이지
│   │   │   ├── page.tsx          # 랜딩 페이지 (/)
│   │   │   ├── courses/          # 강좌 소개 (/courses)
│   │   │   ├── login/            # 로그인 (/login)
│   │   │   └── signup/           # 회원가입 (/signup)
│   │   ├── admin/                # 관리자 패널
│   │   │   ├── page.tsx          # 수강생/결제/현황 (/admin)
│   │   │   ├── curriculum/       # 커리큘럼 편집기 (/admin/curriculum)
│   │   │   └── content-library/  # 콘텐츠 라이브러리 (/admin/content-library)
│   │   ├── dashboard/            # 학생 대시보드 (인증 필요)
│   │   │   ├── page.tsx          # 메인 대시보드 (/dashboard)
│   │   │   ├── learning/         # 학습 배정 달력 (/dashboard/learning)
│   │   │   │   └── session/[item_id]/  # 차시별 세션 페이지
│   │   │   ├── courses/[id]/     # 강좌 뷰어 (구 시스템)
│   │   │   ├── practice/[subject]/ # 기출 해설영상 브라우저
│   │   │   ├── supplements/      # 보충자료
│   │   │   └── ot/               # 오리엔테이션
│   │   ├── checkout/             # 결제 플로우
│   │   │   ├── [courseId]/       # 결제 페이지
│   │   │   ├── success/          # 결제 성공
│   │   │   └── fail/             # 결제 실패
│   │   ├── auth/callback/        # OAuth 콜백
│   │   └── api/                  # API 라우트 (아래 상세)
│   ├── components/
│   │   ├── BunnyVideoPlayer.tsx  # 범용 Bunny 영상 플레이어
│   │   ├── LearningVideoPlayer.tsx # 학습용 영상 플레이어 (진도 추적)
│   │   └── MainHeader.tsx        # 공용 헤더
│   └── utils/supabase/
│       ├── client.ts             # 클라이언트용 Supabase
│       └── server.ts             # 서버용 Supabase (SSR)
├── scripts/
│   ├── auto-match-and-assign.ts  # PDF→영상 자동매칭 + 학생 배정 스크립트
│   ├── build-sessions.ts         # 차시 블록 일괄 생성 스크립트
│   ├── upload-pdfs.js            # PDF 일괄 업로드
│   └── upload-videos.mjs         # Bunny.net 영상 업로드
├── schema.sql                    # 메인 DB 스키마
├── supabase_migration_session_blocks.sql  # session_blocks 마이그레이션
├── add_lesson_progress_table.sql # lesson_progress 테이블
└── seed_algebra_delta0.sql       # 대수 시드 데이터
```

### API 라우트 구조
```
api/
├── admin/
│   ├── assignments/route.ts       # GET/POST/DELETE 배정 관리
│   ├── curricula/route.ts         # GET/POST 커리큘럼 CRUD
│   ├── curricula/assign/route.ts  # POST 커리큘럼 일괄배정
│   ├── learning-sets/route.ts     # GET/POST 콘텐츠 라이브러리
│   ├── parse-pdf/route.ts         # POST Claude PDF 파싱
│   ├── session-blocks/route.ts    # GET/POST 블록 CRUD
│   ├── session-blocks/[id]/route.ts       # PUT/DELETE 개별 블록
│   ├── session-blocks/reorder/route.ts    # POST 블록 순서 변경
│   ├── session-blocks/upload-pdf/route.ts # POST PDF 업로드+자동매칭
│   └── students-courses/route.ts  # GET 학생/강좌 목록
├── student/
│   ├── assignments/route.ts       # GET 학생 배정 목록
│   ├── session/[item_id]/route.ts # GET 차시 블록 데이터
│   └── watch-progress/route.ts    # POST 영상 시청 진도 저장
├── exam-videos/route.ts           # GET 기출 영상 목록
└── progress/route.ts              # GET/POST 레거시 레슨 진도
```

---

## 5. DB 스키마

### 테이블 목록

#### profiles (사용자 프로필)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | auth.users(id) FK, ON DELETE CASCADE |
| name | TEXT NOT NULL | 학생 이름 |
| school | TEXT NOT NULL | 학교 |
| birth_date | TEXT NOT NULL | 생년월일 |
| phone_student | TEXT NOT NULL | 학생 전화번호 |
| phone_parent | TEXT NOT NULL | 학부모 전화번호 |
| assignment_email | TEXT NOT NULL | 과제 이메일 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### subjects (과목)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| slug | TEXT UNIQUE | e.g. "common-math-1" |
| name | TEXT | e.g. "공통수학 1" |
| sort_order | INTEGER | 정렬 순서 |
| is_active | BOOLEAN | 활성 여부 |

**시드 데이터:** 공통수학 1-2, 대수, 미적분 1-2, 기하, 확률과 통계 (7개)

#### courses (강좌/모듈)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| subject_id | UUID FK → subjects | |
| delta_level | TEXT | delta-0, delta-1, delta-2, delta-final |
| title | TEXT | |
| description | TEXT | |
| is_active | BOOLEAN | |

#### products (구매 상품)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| subject_id | UUID FK → subjects | |
| slug | TEXT UNIQUE | e.g. "algebra-delta-0-regular" |
| name | TEXT | |
| product_type | TEXT | delta-0-regular, delta-0-fast, delta-1-final-bundle, delta-final-only |
| season | TEXT | 방학, 학기중 |
| price | INTEGER | 원 단위 |
| duration_weeks | INTEGER | |
| included_modules | TEXT[] | ["delta-0"] 등 |
| features | TEXT[] | 기능 목록 |
| has_guide | BOOLEAN | 생기부 가이드 포함 여부 |
| is_active | BOOLEAN | |
| sort_order | INTEGER | |

#### lessons (레슨 - 구 시스템)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| course_id | UUID FK → courses | |
| week_number | INTEGER | 주차 |
| lesson_number | INTEGER | 차시 |
| title | TEXT | |
| bunny_video_id | TEXT | Bunny.net 영상 ID |
| pdf_level_1_url | TEXT | 레벨1 PDF |
| pdf_level_2_url | TEXT | 레벨2 PDF |
| is_published | BOOLEAN | |

#### enrollments (수강 등록)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → profiles | |
| course_id | UUID FK → courses | |
| product_id | UUID FK → products | 구매 상품 |
| valid_until | TIMESTAMPTZ | 수강 만료일 |
| source | TEXT | toss_payment, naver_manual, admin_grant |
| UNIQUE | (user_id, course_id) | |

#### purchases (결제 내역)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → profiles | |
| product_id | UUID FK → products | |
| amount | INTEGER | 결제 금액 |
| toss_order_id | TEXT | Toss 주문 ID |
| toss_payment_key | TEXT | Toss 결제 키 |
| status | TEXT | pending, DONE, CANCELED |

#### curricula (커리큘럼)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| title | TEXT | e.g. "공수1 델타1 기말범위" |
| description | TEXT | |
| subject_slug | TEXT | e.g. "gs1" |
| schedule_pattern | TEXT | e.g. "sun_wed" |
| start_date | TIMESTAMPTZ | |

#### curriculum_items (차시)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| curriculum_id | UUID FK → curricula | |
| set_id | UUID FK → learning_sets (nullable) | |
| week_number | INTEGER | |
| session_number | INTEGER | |
| label | TEXT | 차시 라벨 |
| publish_date | TIMESTAMPTZ | 공개일 |
| order_index | INTEGER | |

#### session_blocks (세션 블록)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| curriculum_item_id | UUID FK → curriculum_items, ON DELETE CASCADE | |
| block_type | TEXT CHECK | section_header, pdf, video_group, text, hintbook |
| order_index | INTEGER | 순서 |
| content | JSONB | 블록 내용 (타입별 구조 다름) |

**block_type별 content 구조:**
- `section_header`: `{ title: string, color: "green"|"blue"|"red"|"dark"|... }`
- `pdf`: `{ url: string, original_name: string }`
- `hintbook`: `{ url: string, original_name: string }`
- `video_group`: `{ videos: [{ bunny_video_id, title, problem_number, raw_text }] }`
- `text`: `{ body: string }`

#### assignments (배정)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| set_id | UUID FK → learning_sets | |
| user_id | UUID FK → profiles (nullable) | 개별 배정 |
| course_id | UUID (nullable) | 강좌 전체 배정 |
| curriculum_id | UUID FK → curricula (nullable) | |
| curriculum_item_id | UUID FK → curriculum_items (nullable) | |
| label | TEXT | |
| week_number | INTEGER | |
| session_number | INTEGER | |
| published_at | TIMESTAMPTZ | |

#### learning_sets (콘텐츠 라이브러리)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| title | TEXT | |
| description | TEXT | |
| subject_slug | TEXT | |
| pdf_url | TEXT | |
| pdf_filename | TEXT | |

#### learning_set_videos (학습세트 영상)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| set_id | UUID FK → learning_sets | |
| exam_video_id | UUID FK → exam_videos | |
| problem_number | INTEGER | |
| bunny_video_id | TEXT | |
| title | TEXT | |
| is_matched | BOOLEAN | |
| order_index | INTEGER | |

#### exam_videos (기출 해설영상 라이브러리)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| bunny_video_id | TEXT UNIQUE | |
| file_code | TEXT | 파일 코드 |
| title | TEXT | e.g. "25년 9월 고1 15번 해설강의(공통수학1)" |
| subject_slug | TEXT | |
| chapter_folder | TEXT | 단원 분류 |
| year | INTEGER | 출제 연도 |
| month | INTEGER | 출제 월 |
| grade | INTEGER | 학년 |
| problem | TEXT | 문제 번호 |
| sequence | INTEGER | |
| is_published | BOOLEAN | |

#### video_watch_progress (영상 시청 진도)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → profiles | |
| bunny_video_id | TEXT | |
| watch_percent | INTEGER | 0-100 |
| completed | BOOLEAN | 80% 이상 시 true |
| last_watched_at | TIMESTAMPTZ | |

#### lesson_progress (레슨 진도 - 구 시스템)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → profiles, ON DELETE CASCADE | |
| lesson_id | UUID FK → lessons, ON DELETE CASCADE | |
| position_secs | INTEGER | 마지막 재생 위치(초) |
| duration_secs | INTEGER | 영상 전체 길이(초) |
| completed | BOOLEAN | 90% 이상 시 true |
| last_watched | TIMESTAMPTZ | |
| UNIQUE | (user_id, lesson_id) | |

### 테이블 간 관계 (ERD)
```
auth.users ──1:1──▸ profiles
profiles ──1:N──▸ enrollments
profiles ──1:N──▸ purchases
profiles ──1:N──▸ video_watch_progress
profiles ──1:N──▸ lesson_progress
profiles ──1:N──▸ assignments (user_id)

subjects ──1:N──▸ courses
subjects ──1:N──▸ products
courses ──1:N──▸ lessons
courses ──1:N──▸ enrollments
products ──1:N──▸ enrollments
products ──1:N──▸ purchases
lessons ──1:N──▸ lesson_progress

curricula ──1:N──▸ curriculum_items
curriculum_items ──1:N──▸ session_blocks
curriculum_items ──1:N──▸ assignments

learning_sets ──1:N──▸ learning_set_videos
learning_sets ──1:N──▸ curriculum_items (set_id)
learning_sets ──1:N──▸ assignments (set_id)
exam_videos ──1:N──▸ learning_set_videos
```

### RLS 정책
| 테이블 | RLS 상태 |
|--------|----------|
| session_blocks | **ENABLED** (service_role이 우회) |
| 그 외 모든 테이블 | **DISABLED** |

> **주의:** 대부분의 API에서 `SUPABASE_SERVICE_KEY`(service role)를 사용하므로 RLS가 사실상 우회됨. Auth 체크는 API 코드 레벨에서 수행.

---

## 6. 완성된 기능

### 마케팅 / 인증
| 기능 | 상태 | 파일 |
|------|------|------|
| 랜딩 페이지 | ✅ | `src/app/(marketing)/page.tsx` |
| 강좌 소개 (시즌별 상품) | ✅ | `src/app/(marketing)/courses/page.tsx` |
| 이메일/비밀번호 회원가입 | ✅ | `src/app/(marketing)/signup/` |
| 로그인 | ✅ | `src/app/(marketing)/login/` |
| OAuth 콜백 | ✅ | `src/app/auth/callback/route.ts` |

### 결제
| 기능 | 상태 | 파일 |
|------|------|------|
| Toss Payments 위젯 결제 | ✅ | `src/app/checkout/[courseId]/` |
| 결제 확인 + 자동 수강등록 | ✅ | `src/app/checkout/success/page.tsx` |
| 결제 실패 처리 | ✅ | `src/app/checkout/fail/page.tsx` |

### 학생 대시보드
| 기능 | 상태 | 파일 |
|------|------|------|
| 메인 대시보드 (수강 강좌 목록) | ✅ | `src/app/dashboard/page.tsx` |
| 달력 기반 학습 배정 보기 | ✅ | `src/app/dashboard/learning/LearningClient.tsx` |
| 차시별 세션 페이지 (블록 렌더링) | ✅ | `src/app/dashboard/learning/session/[item_id]/SessionPageClient.tsx` |
| PDF 다운로드 | ✅ | SessionPageClient 내 PdfBlock |
| 힌트북 다운로드 | ✅ | SessionPageClient 내 HintbookBlock |
| 해설영상 아코디언 (접이식) | ✅ | SessionPageClient 내 VideoGroupBlock |
| 영상 시청 진도 추적/저장 | ✅ | `src/components/LearningVideoPlayer.tsx` + `/api/student/watch-progress` |
| 기출 해설영상 브라우저 | ✅ | `src/app/dashboard/practice/[subject]/page.tsx` |
| 강좌 뷰어 (구 시스템) | ✅ | `src/app/dashboard/courses/[id]/page.tsx` |
| 오리엔테이션 페이지 | ✅ | `src/app/dashboard/ot/page.tsx` |
| 보충자료 페이지 | ✅ | `src/app/dashboard/supplements/` |

### 관리자 패널
| 기능 | 상태 | 파일 |
|------|------|------|
| 수강생 목록/관리 | ✅ | `src/app/admin/page.tsx` |
| 결제 내역 조회 | ✅ | `src/app/admin/page.tsx` (payments 탭) |
| 현황 요약 (통계) | ✅ | `src/app/admin/page.tsx` (stats 탭) |
| 커리큘럼 생성 (자동 날짜 계산) | ✅ | `src/app/admin/curriculum/CurriculumClient.tsx` |
| 세션 블록 편집기 (CRUD + 순서변경) | ✅ | `src/app/admin/curriculum/SessionBlockEditor.tsx` |
| PDF 업로드 + Claude 자동파싱 | ✅ | `/api/admin/session-blocks/upload-pdf` |
| 문제→영상 자동매칭 | ✅ | `/api/admin/parse-pdf` |
| 콘텐츠 라이브러리 (학습세트) | ✅ | `src/app/admin/content-library/` |
| 커리큘럼 일괄 배정 | ✅ | `/api/admin/curricula/assign` |

### 스크립트
| 기능 | 상태 | 파일 |
|------|------|------|
| PDF→영상 자동매칭 + 일괄배정 | ✅ | `scripts/auto-match-and-assign.ts` |
| 차시 블록 일괄 생성 | ✅ | `scripts/build-sessions.ts` |
| PDF 일괄 업로드 | ✅ | `scripts/upload-pdfs.js` |
| Bunny.net 영상 업로드 | ✅ | `scripts/upload-videos.mjs` |

---

## 7. 미완성 / TODO

### 미구현 기능
| 항목 | 설명 |
|------|------|
| **이메일 알림** | Resend 패키지 설치되어 있으나 실제 발송 로직 미확인 |
| **카카오톡 알림** | 결제 성공 시 카카오톡 링크가 플레이스홀더 상태 (`YOUR_LINK_HERE`) |
| **Google Sheets 연동** | `SHEET_SYNC_SECRET` 환경변수는 있으나 실제 연동 코드 미확인 |
| **보충자료 페이지** | `SupplementsClient.tsx` 존재하나 콘텐츠 연결 미확인 |
| **Resend 이메일** | 패키지 설치되어 있으나 실제 사용처 미확인 |

### 하드코딩 / 임시 처리
| 항목 | 위치 | 설명 |
|------|------|------|
| Toss 테스트 키 | `checkout/success/page.tsx:30` | `"test_gsk_docs_Ovk5rk1EwkEbP0W43n07xlzm"` 폴백 |
| Toss 클라이언트 키 | `checkout/[courseId]/CheckoutClient.tsx` | `"test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm"` 폴백 |
| Bunny Library ID | `LearningVideoPlayer.tsx:15` | `'622509'` 하드코딩 |
| Bunny Library ID | `dashboard/courses/[id]/page.tsx:7` | `'566809'` 하드코딩 |
| ADMIN_EMAILS | `admin/page.tsx` 등 | `'admin@jtmath.com'` 기본값 |
| 시즌 설정 | `(marketing)/courses/page.tsx:20` | `CURRENT_SEASON = "spring-final"` 하드코딩 |
| 카카오 링크 | `admin/actions.ts` | `"https://open.kakao.com/o/YOUR_LINK_HERE"` 플레이스홀더 |
| 영상 완료 임계값 | `watch-progress/route.ts` / `progress/route.ts` | 80% / 90% — 두 시스템 불일치 |

### 알려진 이슈
| 항목 | 설명 |
|------|------|
| **RLS 미적용** | 거의 모든 테이블에 RLS DISABLED. service_role 키 사용으로 우회 중 |
| **빌드 에러 무시** | `next.config.mjs`에서 ESLint/TypeScript 에러 무시 설정 |
| **구/신 시스템 공존** | lessons 기반(구)과 curriculum/session_blocks 기반(신) 두 시스템이 공존 |
| **진도 추적 이중화** | `lesson_progress`(구)와 `video_watch_progress`(신) 두 테이블 존재 |

---

## 8. 외부 서비스 연동 현황

### Supabase
| 항목 | 상태 |
|------|------|
| Auth (이메일/비밀번호) | ✅ 완료 |
| PostgreSQL DB | ✅ 완료 |
| Storage (PDF 업로드) | ✅ 완료 (`pdfs` 버킷) |
| RLS 정책 | ⚠️ 대부분 미적용 |

### Toss Payments
| 항목 | 상태 |
|------|------|
| 결제 위젯 연동 | ✅ 완료 |
| 서버사이드 결제 확인 | ✅ 완료 |
| **프로덕션 키** | ⚠️ 테스트 키가 폴백으로 하드코딩 |
| 환불/취소 처리 | ❌ 미구현 |

### Bunny.net Stream
| 항목 | 상태 |
|------|------|
| 영상 재생 (iframe embed) | ✅ 완료 |
| 시청 진도 추적 | ✅ 완료 |
| 2개 라이브러리 분리 (강의/기출) | ✅ 완료 |
| 영상 업로드 스크립트 | ✅ 완료 |

### Anthropic Claude API
| 항목 | 상태 |
|------|------|
| PDF 문제 메타데이터 추출 | ✅ 완료 (claude-sonnet-4-6) |
| 문제→영상 자동매칭 | ✅ 완료 |
| **주의:** PDF 파싱 비용 | ⚠️ PDF 크기에 따라 API 비용 발생 |

### Resend (이메일)
| 항목 | 상태 |
|------|------|
| 패키지 설치 | ✅ |
| 실제 발송 로직 | ❓ 미확인 |

---

## 9. 기타 인수인계 메모

### 주요 판단 사항

1. **구/신 시스템 공존 이유**
   - **구 시스템** (`courses` → `lessons`): 초기 강좌 기반 학습. 영상 중심, 주차/차시별 레슨 구조
   - **신 시스템** (`curricula` → `curriculum_items` → `session_blocks`): 블록 기반 커리큘럼. PDF + 힌트북 + 해설영상 + 텍스트를 자유롭게 조합
   - 신 시스템이 현재 주력. 구 시스템은 기존 수강생 호환을 위해 유지 중

2. **영상 매칭 방식**
   - PDF에서 `[YYYY년 MM월 고N NN번/XX점]` 형식의 출처 표기를 Claude API로 추출
   - `exam_videos` 테이블에서 year/month/grade/problem으로 매칭
   - 매칭되지 않는 영상도 있음 (exam_videos에 해당 영상이 없는 경우)

3. **배정 방식의 유연성**
   - `assignments.user_id`가 있으면 개별 학생 배정
   - `assignments.course_id`가 있고 `user_id`가 null이면 해당 강좌 수강생 전체 배정
   - 학생 API에서 두 방식을 모두 조회하여 합침

4. **session_blocks의 JSONB content**
   - 블록 타입별로 content 구조가 다름. TypeScript 타입은 `Record<string, unknown>`으로 느슨하게 정의
   - `video_group`의 videos 배열은 매칭 스크립트가 자동 생성

5. **Toss Payments 키 관리**
   - 현재 테스트 키가 소스코드에 하드코딩되어 있음
   - 프로덕션 전환 시 반드시 환경변수로 교체 필요

6. **관리자 인증**
   - 별도의 역할(role) 시스템 없음
   - `ADMIN_EMAILS` 환경변수에 포함된 이메일만 관리자 접근 허용
   - 미설정 시 기본값 `admin@jtmath.com`

### 다음 개발자가 반드시 알아야 할 내용

1. **`SUPABASE_SERVICE_KEY` 사용 주의** — 거의 모든 API에서 service role 키를 사용. RLS를 우회하므로 API 코드에서 직접 권한 검사 필수
2. **PDF 파싱 비용** — `parse-pdf` API와 `upload-pdf`의 auto_match는 Claude API를 호출. 대량 실행 시 비용 확인 필요
3. **Bunny.net 라이브러리 ID 2개** — 강의용(566809)과 기출 해설용(622509)이 분리되어 있음. `LearningVideoPlayer`는 622509만 사용
4. **빌드 에러 무시 설정** — `next.config.mjs`에서 TypeScript/ESLint 에러를 무시. 잠재적 타입 에러가 빌드를 통과할 수 있음
5. **스크립트 실행 시 환경변수** — `scripts/` 내 스크립트는 `.env.local`을 수동으로 source해야 함 (`source .env.local && npx tsx scripts/...`)
6. **시즌 전환** — `(marketing)/courses/page.tsx`의 `CURRENT_SEASON` 변수를 수동으로 변경해야 강좌 페이지 시즌이 바뀜
