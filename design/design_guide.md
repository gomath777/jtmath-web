# jtmath 브랜드 디자인 가이드

> **고티수학 / gomath777 / jtmath 통합 브랜드 패밀리의 일부.**
> 초기 브리프(Dark Neon SaaS, Electric Blue)는 폐기되었고,
> 현재는 cardnews(인스타 @gomath777) + jtmath.kr(웹) + YouTube가
> **하나의 Claude 웜 팔레트**로 통합되어 있음.
>
> 이 문서는 jtmath.kr 웹 런타임이 실제로 쓰는 토큰을 기준으로 작성.
> 변경 이력: 2026-04-16 — 초기 "Dark Neon SaaS" 방향을 폐기하고
> cardnews 기반 웜 팔레트로 전면 개정.

---

## 0. 통합 브랜드 패밀리 (Source of Truth)

| 프로젝트 | 맥락 | Surface | 주요 브랜드 문서 |
|---|---|---|---|
| `mathgo-cardnews` (인스타 @gomath777) | 2~3초 피드 훑기 | Light Parchment `#F5F4ED` | [`mathgo-cardnews/DESIGN.md`](../../mathgo-cardnews/DESIGN.md) (**1차 소스**) |
| `mathgo-web` (jtmath.kr, 이 프로젝트) | 학생·학부모 결제·학습 포탈 | Light Parchment `#F5F4ED` + Ivory 카드 | 이 문서 + [`tailwind.config.ts`](../tailwind.config.ts) (**런타임 진실**) |
| `youtube-edu` | 3~10분 집중 시청 | Dark Ink `#141413` (같은 팔레트의 다크 변형) | [`youtube-edu/src/tokens.ts`](../../youtube-edu/src/tokens.ts) |

**핵심 규칙**
- 색·폰트·radius·shadow의 authoritative source는 `mathgo-cardnews/DESIGN.md`
- 이 문서에 적힌 값이 cardnews와 다르면 **cardnews가 승리** (이 문서가 틀린 것)
- jtmath.kr 런타임이 cardnews와 다르면 **코드가 틀린 것** — 리매핑 필요
  (예: 과거 `brand.blue`는 이미 `terracotta`로 리매핑 완료 — `tailwind.config.ts:75-82` 참고)

---

## 1. 브랜드 정체성 (Brand Identity)

* **브랜드명:** jtmath (제이티매쓰)
* **도메인:** jtmath.kr (프로덕션 웹)
* **슬로건:** **"상위권의 시간은 다르게 흐른다"** (2026-04 업데이트)
  * 구 슬로건 "Data-Driven Mathematics"는 폐기 — SaaS 톤 → 교육 브랜드 톤으로 전환
* **핵심 가치:** #상위권 #내신 #특목고광역자사고 #데이터기반 #차분한전문성
* **서비스 성격:** 특목고·광역자사고 상위권 내신대비반 중심의 **프리미엄 오프라인 + 학습 포탈**.
  SaaS 소프트웨어가 목적이 아니라, 오프라인 수업의 운영을 도와주는 **개인 교사의 디지털 확장**.

---

## 2. 디자인 컨셉 & 톤앤매너

* **컨셉:** Claude(Anthropic) / 책 / 편집 매거진 스타일 — **"Literary Salon"**
  * 참고: [anthropic.com](https://www.anthropic.com), Substack, Stripe Press
  * 폐기된 참고: Vercel, Nomad Coders, Coding Apple (SaaS 개발자 톤 — 교육 브랜드에 부적합)
* **시각적 방향:**
  * **Warm Parchment Base:** 따뜻한 크림색 배경 (`#F5F4ED`). 차가운 순백 금지.
  * **Terracotta Accent:** 흙·토기 느낌의 브랜드 컬러 (`#C96442`). 채도 높은 네온 금지.
  * **Editorial Pacing:** 잡지 스프레드처럼 여백을 과감히 쓴다. 콘텐츠는 40% 이하.
  * **Minimalism:** 불필요한 장식(연필, 책, 학사모 등)을 배제. 타이포그래피 중심.
* **안티패턴:**
  * ❌ 학원 전단지 톤 (빨강 + 검정 + 노랑)
  * ❌ 차가운 테크 미니멀리즘 (블루-그레이, 네온 라인)
  * ❌ 그라데이션·드롭섀도우 남용
  * ❌ 4종 이상의 font-weight 혼용

---

## 3. 브랜드 컬러 팔레트 (런타임 검증된 값)

> 이 표의 값은 `tailwind.config.ts`와 1:1 일치. 디자인 상 변경 시 **반드시** tailwind에도 함께 반영.

### Brand Primary / Accent

| 역할 | Name | HEX | Tailwind 토큰 | 용도 |
|---|---|---|---|---|
| 브랜드 시그니처 | Terracotta | `#C96442` | `terracotta` / `terracotta.DEFAULT` | 메인 CTA, 핵심 강조 |
| 보조 강조 | Coral | `#D97757` | `terracotta.light` | 텍스트 악센트, 호버 |
| 경고 / 실수형 | Crimson | `#B53333` | `crimson` | 오답 상태, alert |

### Surface (Light, 웹 기본)

| 역할 | Name | HEX | Tailwind 토큰 | 용도 |
|---|---|---|---|---|
| 메인 배경 | Parchment | `#F5F4ED` | `parchment` | 페이지 배경 |
| 카드 표면 | Ivory | `#FAF9F5` | `ivory` | 카드, 인풋 |
| 버튼 배경 | Warm Sand | `#E8E6DC` | `sand` | 세컨더리 버튼 |

### Text (모두 웜 톤, 차가운 블루-그레이 금지)

| 역할 | Name | HEX | Tailwind 토큰 | 용도 |
|---|---|---|---|---|
| Primary | Near Black | `#141413` | `ink` / `ink.DEFAULT` | 제목, 메인 텍스트 |
| Primary Soft | Ink Soft | `#30302E` | `ink.soft` | 어두운 박스 배경 |
| Secondary | Charcoal | `#4D4C48` | `charcoal` | 강조 부제 |
| Body | Olive Gray | `#5E5D59` | `olive` | 본문, 설명 |
| Tertiary | Stone Gray | `#87867F` | `stone` | 메타, 주석 |
| Muted | Silver | `#B0AEA5` | `silver` | 비활성, placeholder |

### Border / Ring

| 역할 | HEX | Tailwind 토큰 | Shadow 토큰 |
|---|---|---|---|
| Standard | `#F0EEE6` | `border-cream` | — |
| Emphasis | `#E8E6DC` | `border-warm` | — |
| Ring Warm | `#D1CFC5` | `ring-warm` | `shadow-ring-warm` |
| Ring Deep | `#C2C0B6` | `ring-deep` | `shadow-ring-deep` |
| Ring Terracotta | `#C96442` | — | `shadow-ring-terracotta` |

### Dark Mode (YouTube 전용 — 웹에는 미적용)

`youtube-edu/src/tokens.ts`에서 정의. 웹(jtmath.kr)은 현재 dark mode를 제공하지 않음.
향후 웹에 dark mode 도입 시 동일 토큰 체계 재사용 권장.

| 역할 | HEX | 비고 |
|---|---|---|
| BG Ink | `#141413` | `ink.DEFAULT`와 동일 값, 역할만 bg로 바뀜 |
| BG Surface | `#30302E` | `ink.soft`와 동일 |
| Text Primary | `#F5F4ED` | `parchment`와 동일 — 라이트·다크 완전 대칭 |

### Do's & Don'ts

- ✅ Terracotta는 화면당 **주요 CTA 1곳**에만 사용
- ✅ 모든 그레이는 웜 톤 (`olive`, `stone`, `silver`)
- ✅ Crimson은 오답·경고 **상태 표시에만** — 마케팅 카피에 쓰지 않는다
- ❌ `#FFFFFF`(순백) 배경 금지 — 반드시 `parchment` 또는 `ivory`
- ❌ 차가운 블루/그레이/민트/네온 추가 금지 — 이 팔레트 밖의 색을 쓰지 않는다

---

## 4. 타이포그래피

### 폰트 스택

| 역할 | CSS | 파일 | 용도 |
|---|---|---|---|
| **Primary** | `"Pretendard Variable", Pretendard, system-ui, sans-serif` | `@fontsource-variable/pretendard` | 본문·제목·UI 전부 (한글 단일 폰트) |
| **Serif 악센트** | `var(--font-serif), "Gowun Batang", Georgia, serif` | 필요시 | 에디토리얼 인용·제목 악센트 (사용 희박) |
| **Mono** | `ui-monospace, SFMono-Regular, Menlo, monospace` | 시스템 | 코드·과목코드 (`gs1`, `ds2` 등) |

### 한글 타이포 규칙 (cardnews와 공통)

- `word-break: keep-all` **필수** — 한글 단어 중간 줄바꿈 방지
- `overflow-wrap: break-word` — 극단적 케이스 백업
- **Letter-spacing**: 본문 `-0.01em` (`tracking-tight`), 제목 `-0.02em` (`tracking-tightest`)
- **Line-height**: 본문 `1.6` (Claude 에디토리얼 시그니처), 제목 `1.3`
- ❌ 4종 이상 weight 혼용 금지. 일반적으로 400/600/800 세 단계로 운용.

---

## 5. 레이아웃 & 스페이싱

### 8px Base Grid (Claude 시스템)

| Token | 값 | 용도 |
|---|---|---|
| `space-1` | 4px | 타이트한 갭 |
| `space-2` | 8px | 버튼 내부 |
| `space-3` | 12px | 요소 간 |
| `space-4` | 16px | 그룹 내 |
| `space-6` | 24px | 섹션 내부 |
| `space-8` | 32px | 블록 간 |
| `space-12` | 48px | 주요 섹션 구분 |

### Border Radius (Claude generous rounding)

| Token | 값 | 용도 |
|---|---|---|
| `rounded-sm` | `calc(var(--radius) - 4px)` | 세분화 (거의 안 씀) |
| `rounded-md` | `calc(var(--radius) - 2px)` | 인풋, 체크박스 |
| `rounded-lg` | `var(--radius)` | 기본 카드, 버튼 |
| `rounded-xl` | `16px` | Featured 컨테이너 |
| `rounded-2xl` | `24px` | 강조 박스 |
| `rounded-3xl` | `32px` | 히어로 |
| `rounded-full` | `999px` | 배지, pill, 프로필 |

❌ 6px 미만 sharp corner 금지 — softness가 브랜드 정체성

### Shadow (Ring-based signature)

| Token | 값 | 용도 |
|---|---|---|
| `shadow-ring-warm` | `0 0 0 1px #D1CFC5` | 카드 경계 |
| `shadow-ring-deep` | `0 0 0 1px #C2C0B6` | 강조 카드 |
| `shadow-ring-terracotta` | `0 0 0 1px #C96442` | CTA 활성 상태 |
| `shadow-whisper` | `0 4px 24px rgba(0, 0, 0, 0.05)` | 옅은 부양감 |

❌ 무거운 drop shadow 금지 — ring + whisper 조합으로 해결

---

## 6. 제품 계층 (Δ 시스템 — 유지)

디자인 시스템 적용 시, 아래 커리큘럼을 **수학적 기호 + 로마 숫자** 방식으로 시각화:

| 단계 | 심볼 | 설명 | 결제 구조 참고 |
|---|---|---|---|
| Delta Zero | **Δ 0** | 기초·빌드업 (윈터스쿨 / 썸머스쿨) | [`design/curr.md`](./curr.md) |
| Delta One | **Δ 1** | 핵심 실전 (학기중 내신대비) | 풀패키지로만 판매 |
| Delta Two | **Δ 2** | 심화·킬러 (최상위권 히든) | 별도 문의 |
| Delta Final | **Δ FINAL** | 시험 직전 최종 점검 | 단과 가능 |

**타이포 규칙**: Δ 기호는 **Pretendard 그대로** 렌더링 (별도 serif 금지). 숫자는 **ExtraBold(800) + terracotta**로 강조.

---

## 7. 로고

### 현재 (2026-04 기준)
* **형태:** 소문자 워드마크 `jtmath` + Δ 심볼 조합
* **컬러:**
  * Light 배경: `terracotta` (`#C96442`)
  * Dark 배경: `parchment` (`#F5F4ED`)
* **서체:** Pretendard ExtraBold + letter-spacing `-0.02em`
* **용법:** `jtmath.` 처럼 마침표로 완결감 부여 (선택적)

### 금기사항
- ❌ 유치한 일러스트, 학사모·연필 등 전통 학원 그래픽
- ❌ 대문자 `JTMATH` (서비스명은 항상 소문자)
- ❌ 블루·네온·그라데이션 컬러 변형
- ❌ 과거 `brand.blue` `brand.mint` 관련 자산 재사용

---

## 8. 프로젝트 간 일관성 체크리스트

새로운 UI·컴포넌트·페이지를 만들 때 확인:

- [ ] 배경이 `parchment` 또는 `ivory` (웹 기본) / `ink.DEFAULT` (YouTube dark)인가?
- [ ] CTA 컬러가 `terracotta`인가? (화면당 1개)
- [ ] 모든 그레이가 `olive` / `stone` / `silver` 중 하나인가? (blue-gray 금지)
- [ ] 폰트가 Pretendard인가?
- [ ] 한글에 `word-break: keep-all` 적용했는가?
- [ ] 라운딩이 8px 이상인가?
- [ ] Shadow가 ring 기반인가? (drop shadow 금지)
- [ ] cardnews `DESIGN.md`의 "Do's & Don'ts"를 위반하지 않는가?

위 체크를 통과하지 않는 변경은 **브랜드 패밀리에서 이탈**이며, 실제 프로덕션 배포 전에 팔레트 정렬 필요.

---

## 9. 마이그레이션 이력

| 날짜 | 변경 | 이유 |
|---|---|---|
| 2026-03 이전 | 초기 브리프: Dark Neon SaaS (Electric Blue #2979FF + Neon Mint #00E676 + Alert Orange #FF3D00) | Nomad Coders / Vercel 스타일 벤치마킹 |
| 2026-03 | 전면 폐기. Claude 웜 팔레트로 전환. | 교육 브랜드 톤에 SaaS 개발자 톤이 맞지 않음. cardnews와 일관성 필요. |
| 2026-03 | `tailwind.config.ts`의 `brand.blue` → `terracotta`, `brand.mint` → `olive`, `brand.dark` → `parchment` 리매핑 | 기존 코드 호환성 유지하면서 점진적 전환 |
| 2026-04-16 | 이 문서 재작성. `youtube-edu` 프로젝트 런칭 컨텍스트에서 3개 프로젝트 통합 브랜드 패밀리 개념 명문화. | YouTube dark mode 변형 추가에 따른 단일 팔레트 확인 |

---

## 10. 참고 문서

* **1차 소스(팔레트·타이포·Do's&Don'ts)**: [`mathgo-cardnews/DESIGN.md`](../../mathgo-cardnews/DESIGN.md)
* **상세 Claude 디자인 철학**: [`mathgo-cardnews/claude/DESIGN.md`](../../mathgo-cardnews/claude/DESIGN.md)
* **런타임 진실(토큰 구현)**: [`mathgo-web/tailwind.config.ts`](../tailwind.config.ts)
* **YouTube 변형(dark mode)**: [`youtube-edu/src/tokens.ts`](../../youtube-edu/src/tokens.ts)
* **제품 상품 구조**: [`design/curr.md`](./curr.md)
