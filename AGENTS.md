# mathgo-web Codex Operating Rules

Scope: this file applies to the whole repository.

## Production Safety

- Treat this repository as the production `jtmath.kr` service. Real students use the `/s/{slug}` portal.
- Do not move, rename, archive, clean, reset, rebase, pull, switch branches, remove worktrees, or delete files unless the operator explicitly asks.
- The root checkout and `.claude/worktrees/` contain parked work. Preserve unrelated dirty files and work around them.
- Never push `main` unless the operator explicitly confirms the deployment window and rollback path. A push can trigger Vercel production deployment.

## Secrets And PII

- Never print, paste, commit, or summarize `.env.local` values, API keys, tokens, cookies, auth headers, service-role key values, student names, phone numbers, birth dates, emails, portal slugs, raw Kakao messages, or raw student records.
- `.env.local` may be used by existing local scripts on this Mac, but only variable presence or variable names may be recorded.
- Supabase service-role access bypasses RLS. Run read-only checks first, then `--dry-run` where supported, before any write.
- Student-facing or DB-changing work must use explicit IDs/filters and a short rollback note.

## Integration Boundary

- Keys are not migrated from Claude to Codex. Local `.env.local` remains local, while Vercel, Supabase, Bunny, Notion/Drive, Resend, Toss, and Anthropic settings live in their own external dashboards/accounts.
- Verify Vercel environment variable names before relying on production runtime behavior. Local `.env.local` does not automatically prove Vercel is configured.
- Verify Anthropic API key and billing separately from the Claude subscription before assuming runtime AI calls will continue after Claude cancellation.
- Hermes, plugins, MCP servers, and new automation wrappers are deferred until Codex operating overlap is proven useful.

## Command Discipline

- Safe starting checks: `git status --short --branch`, `npm run lint`, `npm run build`, and read-only admin/list commands.
- Prefer dry-run commands before writes, especially `npm run admin:session -- --dry-run`, `npm run admin:release-lesson -- --dry-run`, and `npm run admin:migrate-sla -- --dry-run`.
- Treat `npm run admin:release`, `npm run admin:release-lesson` without `--dry-run`, upload scripts, migration scripts, Vercel changes, Supabase writes, Bunny uploads, Resend sends, Toss actions, and Anthropic parsing calls as confirmation-required.
- `next.config.mjs` currently allows build-time TypeScript/ESLint errors to be ignored, so a green build is not enough evidence.

## GS2 Renewal Assets

- For 공수2, the renewed concept course is the default. Old 공수2 assets must never be used for `/5wsummer/gs2`, renewed concept pages, or student-facing GS2 links unless the operator explicitly says "old", "올드", or `gs2-old`.
- Treat `(개념노트)/1_공수2` and `(공수2) 개념강의` as the active source folders. Treat `(개념노트)/99_공수2`, `content/gs2_concept`, `gs2-concept-pdfs-raw`, `concept/gs2-old`, and files prefixed like `하99_` as archive/legacy-only.
- Before any GS2 upload or link change, compare file size, page count or duration, modified time, and hash against the currently linked asset. If the active and old sources conflict, stop and ask instead of guessing.
- When replacing a GS2 PDF at Bunny, archive the old object under an old/archive path first, then link the renewed object with a fresh filename or cache-busting URL and verify the public CDN response.

## Student Learning Page AI Tutor

- Every new or rebuilt student-facing `/lesson/[slug]` page that contains worksheet PDFs must include the page-local Web AI Tutor unless the operator explicitly opts that page out.
- A page is not Tutor-ready merely because `AiTutorWidget` is mounted globally. Before release, register the exact subject, lesson slug, assigned variant, PDF material keys/hashes, problem ranges, verified guide catalog, and private problem/solution/guide assets. Missing or mismatched material must fail closed.
- Build Tutor context from the student's actual released assignment and `session_blocks`; never replace individual DS2 schedules or create duplicate pages/assignments just to enable Tutor.
- Keep the Tutor above the worksheet blocks. Preserve both PDF `열기` and `다운로드`, keep graph generation off, render math with the shared KaTeX path, and do not reuse Google Chat routing or UX.
- Before release, run the Web Tutor scoped typecheck/tests, synthetic browser QA at mobile/tablet/desktop and 200% zoom, names-only config preflight, material/catalog/hash checks, and a preview smoke. Record the previous Vercel deployment as rollback.
- Detailed creation and handoff steps live in `docs/codex-operations.md` under “Future Learning Page AI Tutor Workflow”.

## Handoff

- Keep repo-level guidance short. Put detailed operating steps in `docs/codex-operations.md`.
- After operational work, record what changed, what was verified, what remains risky, and whether anything can affect Vercel, Supabase, Bunny, Anthropic, payments, email, or student portals.
