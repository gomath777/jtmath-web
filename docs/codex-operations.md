# Codex Operations Playbook

This playbook is for operating `/Users/cego/building/mathgo-web` after the Claude-to-Codex handoff. It intentionally contains no secret values and no student PII.

## Current Operating Posture

- `jtmath.kr` is production. Assume every code, database, Vercel, Supabase, Bunny, payment, email, and cron change can affect students.
- The root checkout is on `main`, ahead of `origin/main`, and already has many dirty files. Preserve existing tracked and untracked work.
- Do not push `main`. Pushing can trigger Vercel deployment.
- Product code and production config changes require a separate task, explicit scope, and verification plan. For the migration docs phase, edit only `AGENTS.md` and `docs/codex-operations.md`.
- Build success is not enough because `next.config.mjs` ignores build-time TypeScript and ESLint errors.

## Session Start Briefing

1. Read `AGENTS.md`, this playbook, and the relevant control-tower evidence before acting.
2. Check `git status --short --branch` and preserve unrelated dirty files.
3. For operational requests, identify whether the work touches local files, Supabase, Bunny, Vercel, Anthropic, Resend, Toss, Google Drive/Notion, or student-facing routes.
4. Before any data-changing command, run the safest available read-only or `--dry-run` version and report only counts, statuses, IDs when safe, and file paths.
5. Do not include student identifiers, raw messages, `.env.local` values, API key values, token values, service-role key values, or dashboard secret values in responses or artifacts.

## Daily Operations

- Student and curriculum lookup starts with read-only admin commands.
- Weekly lesson/page work should dry-run first, then run the mutating command only after the operator confirms the target students, subject, slug/session, and release date.
- New session page generation can upload PDFs/videos and call Anthropic for parsing/matching. Confirm cost and target folder before running without `--dry-run`.
- Release support should confirm whether the target is the legacy session release flow or the SLA lesson release flow.
- Wrapup should summarize changed files, data writes, generated files, command evidence, unresolved risks, and any next verification needed.

## Command Matrix

| Category | Examples | Rule |
|---|---|---|
| Read-only local | `git status --short --branch`, `git branch -vv`, `git worktree list`, `npm run lint`, `npm run build` | Safe to run when useful. Remember build does not guarantee type/lint safety here. |
| Read-only admin | `npm run admin:student list`, `npm run admin:student info <student>`, `npm run admin:curriculum list`, `npm run admin:curriculum items <id>`, `npm run admin:assign-lesson -- pages`, `npm run admin:assign-lesson -- roster` | Safe only if outputs are not copied verbatim when they contain PII. Summarize without student identifiers unless the operator explicitly needs local-only viewing. |
| Dry-run safe | `npm run admin:session -- --dry-run ...`, `npm run admin:release-lesson -- --dry-run ...`, `npm run admin:migrate-sla -- --dry-run ...` | Run before writes when supported. Check whether files, uploads, or API calls still occur despite `--dry-run` before treating a new script as safe. |
| Mutating, confirmation required | `npm run admin:release`, `npm run admin:release-lesson` without `--dry-run`, `npm run admin:assign-lesson -- assign ...`, `npm run admin:student add ...`, `npm run admin:migrate`, `npm run admin:rebuild-migrate`, Supabase SQL writes, Bunny uploads, Vercel config changes | Require explicit target confirmation and rollback note. Use precise IDs/filters. |
| Cost-incurring, confirmation required | Anthropic PDF parsing/matching, runtime AI calls, bulk Bunny uploads/storage, Resend email sends, Toss payment actions | Confirm before running and record cost-sensitive scope. |
| Forbidden without explicit approval | `git push origin main`, destructive git cleanup/reset/checkout, branch switching with dirty work, deleting `.claude/worktrees`, printing `.env.local`, exposing secrets or PII, production release commands without rollback note | Stop and ask one narrow question if needed. |

`npm run admin:release` should be treated as mutating unless a script-level dry-run mode is verified. Do not assume it is equivalent to `admin:release-lesson -- --dry-run`.

## Env And Integration Matrix

Local Codex can use existing `.env.local` through scripts that load it, but do not print values. Production behavior depends on external services:

| Area | Local source | Production/external source | Verify before relying on |
|---|---|---|---|
| Supabase client/server | `.env.local` variable names | Supabase project and Vercel env | URL, anon key, service-role key presence, RLS risk, Management API token validity |
| Bunny Stream/Storage/CDN | `.env.local` variable names | Bunny dashboard/account | Correct library/storage IDs, separate lecture and exam video credentials, CDN hostnames |
| Vercel | repo config and dashboard | Vercel project settings | Environment variable names, cron registration, deployment target, rollback deployment |
| Anthropic | local variable name | Anthropic account billing/key status | API key validity and billing independent of Claude subscription |
| Notion/Drive | local token/account access | Notion/Google account | Access to source folders and docs before download/import workflows |
| Resend | dashboard/env if enabled | Resend account | Whether production email is intentionally live or fallback/test-only |
| Toss | dashboard/env if enabled | Toss dashboard | Whether payment keys are production or test/fallback-only |

## Release And Rollback Notes

- For documentation-only changes, rollback is a normal revert of `AGENTS.md` and/or `docs/codex-operations.md`.
- For Vercel deployments, record the deployment URL/version before and after. Rollback normally means redeploying the last known-good Vercel deployment or reverting the triggering commit, but the operator must confirm the path.
- For Supabase writes, record the exact table, filter, row count, and reversible update strategy before running. Avoid broad `DELETE`, `DROP`, `TRUNCATE`, and unfiltered updates.
- For Bunny uploads or generated public URLs, record the target library/storage zone and generated asset count. Do not delete assets without separate confirmation.

## Claude Cancellation Readiness

Codex-only operation is not ready merely because these docs exist. Before canceling Claude or relying solely on Codex, complete an overlap period and verify:

- Codex can run daily briefing and wrapup without exposing secrets or PII.
- Codex can perform read-only student/curriculum checks safely.
- Codex can run at least one dry-run lesson/session workflow and interpret the result.
- Vercel production env names and cron state are verified names-only.
- Anthropic API billing/key status is verified separately from Claude subscription status.
- Supabase, Bunny, Notion/Drive, Resend, and Toss boundaries are understood and still valid where used.
- Dirty root work and Claude worktrees are classified as deploy, keep WIP, or discard later.

## Evidence Sources

- Control-tower migration plan: `/Users/cego/new-building/control-tower/.omo/plans/mathgo-web-codex-migration.md`
- Dirty state evidence: `/Users/cego/new-building/control-tower/.omo/evidence/mathgo-web-codex-migration/T2-dirty-state.md`
- Env/integration inventory: `/Users/cego/new-building/control-tower/.omo/evidence/mathgo-web-codex-migration/T3-env-inventory.md`
- Sanitized Claude handoff: `/Users/cego/new-building/control-tower/.omo/evidence/mathgo-web-codex-migration/T4-claude-export.md`
