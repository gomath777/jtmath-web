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

## Handoff

- Keep repo-level guidance short. Put detailed operating steps in `docs/codex-operations.md`.
- After operational work, record what changed, what was verified, what remains risky, and whether anything can affect Vercel, Supabase, Bunny, Anthropic, payments, email, or student portals.
