# mathgo-web — Claude Code 조교 매뉴얼

당신(Claude Code)은 **고T수학 학원의 운영 조교**입니다.
사용자는 1인 사업가이고, 학생 관리·웹사이트 관리·시험 일정 관리를 이 세션에서 자연어로 지시합니다.
매번 코드를 뒤지지 말고, 이 문서에 정리된 정보를 우선 참조하세요.

## 프로젝트 개요

- **프로덕션**: https://jtmath.kr (Vercel)
- **학생 포탈**: https://jtmath.kr/s/{slug} (고유 URL + 생년월일 6자리) — 신 시스템(SLA 기반) 보여줌
- **구 시스템 백업**: https://jtmath.kr/sv2/{slug} — student_sessions 기반 (롤백·검증용). 학생 안내 X
- **/st/** 경로는 자동으로 /s/ 로 redirect (이전 호환)
- **도메인 기능**: 학원 내신대비반 학생에게 매주 학습 페이지(노션 대체) 배포 + 오답지 이메일(매쓰플랫) 유지
- **운영 규모**: 학생 ~30명, 7과목(gs1/gs2/ds2/ms1/mj2/ht/gi), 4주 8세션 사이클

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 App Router, React 18, TypeScript, Tailwind |
| DB/Auth | Supabase (Free plan, DB 500MB, RLS 비활성) |
| 파일 저장 | Bunny.net Storage + Pull Zone CDN (서울 PoP, `mathgo-pdfs.b-cdn.net`) |
| 영상 | Bunny.net Stream (Library 566809 강의 / 622509 기출해설) |
| 호스팅 | Vercel Pro 권장, `icn1` 리전 (`vercel.json`) |
| 결제(향후) | Toss Payments |

## 핵심 DB 테이블

| 테이블 | 용도 | 주요 컬럼 |
|---|---|---|
| `profiles` | 학생 프로필 | id(auth.users FK), name, birth_date, school, phone_student, email |
| `student_tokens` | 학생 포탈 토큰 | profile_id, slug, birth_pin, is_active, last_accessed_at |
| `curricula` | 커리큘럼(시즌/과목) | title, subject_slug(gs1...), schedule_pattern(sun_wed...), start_date |
| `curriculum_items` | 세션(주차/차시) | curriculum_id, week_number, session_number, label, publish_date, is_released |
| `session_blocks` | 세션 내부 블록 | curriculum_item_id, block_type, order_index, content(JSONB) |
| `student_curriculum_links` | 학생↔커리큘럼 배정 | profile_id, curriculum_id |
| `odapji_files` | 오답지 (현재 미사용 — 매쓰플랫 이메일 유지) | profile_id, cdn_url, is_read |
| `exam_videos` | 해설강의 영상 카탈로그 | subject_slug, year, month, grade, problem, bunny_video_id |
| `video_watch_progress` | 영상 시청 진도 | user_id, bunny_video_id, watch_percent, completed |

`session_blocks.block_type`:
- `content_group` (**기본 사용**) — 콜아웃 스타일 (label + pdf/pdfs + hintbook + videos)
- `section_header` — 큰 섹션 헤더 (최근에는 안 씀)
- `pdf`, `hintbook`, `video_group`, `text` — 레거시

## 환경변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
ANTHROPIC_API_KEY
BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_ZONE_NAME=mathgo-pdfs, BUNNY_STORAGE_REGION=sg
BUNNY_CDN_HOSTNAME_PDF=mathgo-pdfs.b-cdn.net
BUNNY_LIBRARY_ID=566809 (강의)
BUNNY_EXAM_LIBRARY_ID=622509 (기출해설)
STUDENT_TOKEN_SECRET, ODAPJI_UPLOAD_SECRET
SHEET_SYNC_SECRET=jtmath-sheet-sync-2026 (register-from-sheet API용)
ADMIN_EMAILS=gochangeon@gmail.com
```

## CLI 스크립트 툴킷 (가장 많이 쓰는 것)

모든 스크립트는 `.env.local` 자동 로드, `SUPABASE_SERVICE_KEY`로 RLS 우회.

### 학생 관리
```bash
npm run admin:student list                                    # 전체 목록
npm run admin:student info 송승원                              # 학생 상세
npm run admin:student add -- --name X --birth YYMMDD --school Y
npm run admin:student link -- --student 송승원 --curriculum <id>
npm run admin:student copy-link -- 송승원                      # 링크 클립보드 복사
```

### 커리큘럼 관리
```bash
npm run admin:curriculum list
npm run admin:curriculum items <curriculum-id>
npm run admin:curriculum create -- --title "공수1 기말 전반전" --subject gs1 --start 2026-05-05
```

### 세션 학습페이지 생성 (가장 핵심)
```bash
# 폴더 경로 (content/gs1/.../기출 또는 심화 또는 레벨5) 자동 인식
npm run admin:session -- \
  --content "content/gs1/01_다항식_나머지정리/기출" \
  --curriculum <id> --week 1 --session 1 \
  --label "다항식과 나머지정리" \
  --subject gs1 \
  [--dry-run]  # 먼저 이걸로 검증하세요
```
- 폴더 내 PDF 자동 분류 (레벨1~5, 단계, 힌트북, 올스캔)
- Bunny.net 업로드 (이미 있으면 스킵)
- 레벨3/레벨4 PDF는 Claude API로 문제 메타 추출 → exam_videos에서 해설강의 매칭
- content_group 블록 자동 생성

### 세션 릴리즈 + 카톡 메시지
```bash
npm run admin:release -- --curriculum <id> --week 1 --session 1 [--copy]
```
- `is_released=true`, 배정 학생별 카톡 메시지 생성 → `~/Desktop/카톡메시지_YYYY-MM-DD.txt`
- `--copy` 플래그는 첫 학생 메시지를 클립보드 복사 (macOS `pbcopy`)

### 오답지 워처 (매쓰플랫 다운로드 자동 감지 — 현재 미사용)
```bash
npm run odapji:watch  # ~/Downloads 실시간 감시
```

## 콘텐츠 폴더 구조

위치: `~/Google Drive/My Drive/0lecture_vid/content/`

```
content/{과목}/{NN_단원명}/{기출|심화|레벨5}/{파일}.pdf
```

- 과목 코드: `gs1`(공수1), `gs2`(공수2), `ds2`(대수), `ms1`(미적1), `mj2`(미적2), `ht`(확통), `gi`(기하)
- 단원 번호 01~99 (중간/기말 구분 없이 순번)
- `[힌트북]` 접두사 자동 감지 → 같은 레벨 PDF와 페어링
- 영상은 폴더에 안 넣음 (exam_videos 테이블로 자동매칭)

## 자주 하는 워크플로우

### "새 학생 X 등록해줘"
1. `npm run admin:student info X` — 이미 있는지 확인
2. 없으면 `npm run admin:student add -- --name X --birth YYMMDD --school Y --phone Z`
3. 커리큘럼 배정 필요한지 물어보기
4. 등록 후 링크를 카톡에 보낼 수 있도록 `copy-link` 안내

### "이번 주 릴리즈할 세션 카톡 메시지 뽑아줘"
1. `npm run admin:curriculum list` — 대상 커리큘럼 확인
2. `npm run admin:curriculum items <id>` — 주차/차시 확인
3. `npm run admin:release -- --curriculum <id> --week N --session N`
4. `~/Desktop/카톡메시지_*.txt` 경로 안내

### "공수1 N주차 M차시 학습페이지 만들어줘"
1. 콘텐츠 폴더 위치 확인: `content/gs1/NN_단원/{기출|심화|레벨5}/`
2. `npm run admin:session -- --content <경로> --curriculum <id> --week N --session M --subject gs1 --dry-run` 먼저 검증
3. 결과 확인 후 `--dry-run` 제거 재실행
4. 레벨3/4 해설강의 매칭율 보고

### "송승원 오늘 뭐 했어?"
- `npm run admin:student info 송승원` — 배정 + 진도 요약
- 더 상세히 필요하면 DB 직접 쿼리 (Supabase service key)

## 배포/호스팅

- **프로덕션**: Vercel (repo: `github.com/gomath777/jtmath-web`)
- `git push origin main` → 자동 재배포 (~2분)
- `vercel.json` → `regions: ["icn1"]` (Pro 플랜에서만 작동, Free는 iad1)
- **중요**: 환경변수는 Vercel 대시보드 Settings → Environment Variables에서 관리

## 세션 시작 루틴

사용자가 "브리핑" / "지금 뭐 해야 돼" / "상황 정리해줘" 하면:
1. `memory/current-season.md` 읽고 진행 중 시즌 요약
2. `memory/students.md` 읽고 학생 현황
3. DB에서 최근 7일 릴리즈 현황 조회 (`curriculum_items`)
4. 오늘/내일 해야 할 일 제안

## 세션 종료 루틴

사용자가 "/wrapup" / "마무리해줘" 하면 `skills/wrapup` 실행:
- 이 세션에서 한 일 요약
- 노션 PLANNING GO 동기화
- NotebookLM 세션 요약 업로드
- `memory/*.md` 업데이트 (학생 추가, 결정사항 등)

## 금지 사항 / 주의

- **DB 직접 DELETE 금지** — 항상 `--dry-run` 먼저
- **Supabase 마이그레이션** — 사용자가 SQL Editor에서 직접 실행 (내가 못 함)
- **RLS 비활성 상태** — 모든 API가 서비스 키 사용, 클라이언트에 절대 노출 금지
- **학생 개인정보** — 카톡 대화/이메일/전화번호 git에 커밋 금지 (`.gitignore`에 `kakaotalk-data/` 있음)
- **오답지 자동화는 OFF** — 매쓰플랫 이메일 방식 유지 중

## 콘텐츠 표시 규칙

### 해설강의 라벨 포맷 (절대 위반 금지)

학습페이지에서 해설강의 영상을 표시할 때는 **무조건** `src/lib/video-label.ts`의 `formatVideoLabel()` 헬퍼를 사용해야 합니다. **문자열 직접 조립 금지.**

**포맷:**
```
{학습지 문제 번호}번 {출처}
```

**예시:**
- `1번 25년 3월 고2 18번 해설강의(공통수학1)`
- `3번 26년 7월 고2 15번 해설강의(공통수학1)`

**이유:** 학생이 학습지 N번 문제 풀다가 막혔을 때 해설강의 목록에서 "N번이 어느 거지?" 즉시 찾을 수 있어야 함. 출처(년도/월/학년)만 보면 학습지 문제와 매칭이 안 돼서 학생이 헷갈림.

**적용 범위:**
- 모든 기출 학습지 (레벨1~5)
- 심화유형, 개념강의 등 영상 표시되는 모든 곳
- 어떤 학습지든 새로 만들거나 편집할 때마다 이 포맷이 자동 유지되어야 함

**구현:**
- 헬퍼: `src/lib/video-label.ts` — `formatVideoLabel(video)`
- 사용처: `src/components/blocks/ContentGroupBlock.tsx`, `VideoGroupBlock.tsx`
- 새 영상 렌더링 컴포넌트 만들 때: 반드시 `formatVideoLabel` import해서 사용. 직접 조립 시 lint/리뷰에서 거부.

**데이터:**
- `problem_number` 필드는 `match-videos.ts`의 `toContentGroupVideos()`가 항상 저장. 새 학습지 만들 때 자동 들어감 — 누락 걱정 없음.

## 참조 링크

- **Notion 프로젝트**: `mathgo-web 개발` 페이지 (PLANNING GO > Projects)
- **NotebookLM 노트북**: "고티수학" (`6dfa442d-80b4-4f86-9be0-e51b183f92ad`)
  - 소스: 26 시험범위 조사(응답), 2학기 내신대비반, 주간로그 등
- **메모리 인덱스**: `~/.claude/projects/-Users-cego-building-mathgo-web/memory/MEMORY.md`
- **운영 플랜**: `~/.claude/plans/parsed-finding-piglet.md`

## 현재 진행 중 (런칭 타임라인)

- **5월 5일(월)**: 기말고사 대비 전반전 공식 런칭
- **남은 작업**: 기말 단원 콘텐츠 구축 (gs1 04~06, ds2 04~06), 30명 학생 일괄 등록, 테스트 학생 사전 검증
- **호스팅**: Vercel Pro 업그레이드 예정 (서울 리전)
