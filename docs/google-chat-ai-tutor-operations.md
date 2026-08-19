# Google Chat AI Tutor operations runbook

Status: preview-only until the operator approves an external-change manifest. Do not push `main`, enable production, or message real students without a deployment window and rollback confirmation.

## Architecture and data flow

Google Chat sends a verified Workspace add-on request to `/api/google-chat`. The route verifies Google first, parses the event, rejects non-DM tutoring, pairs a stable Chat user to a student profile, claims one inbound message resource, loads only released/published curriculum and recent completed tutor turns, optionally normalizes one raster image, calls Gemini through the provider port, persists the final result, and only then returns the Chat message.

## Dashboard-owned configuration names

Never paste values into evidence. Record only names and PASS/FAIL.

- Vercel Preview/Production: `AI_TUTOR_ENABLED`, all `AI_TUTOR_*` runtime caps/retention names, `AI_TUTOR_PAIRING_HMAC_SECRET`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
- Google Cloud / Chat app: `GOOGLE_CHAT_ENDPOINT_URL`, `GOOGLE_CHAT_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_CHAT_MEDIA_CLIENT_EMAIL`, `GOOGLE_CHAT_MEDIA_PRIVATE_KEY`, app media auth with `https://www.googleapis.com/auth/chat.bot`.
- Operator preflight controls: `AI_TUTOR_PAID_BILLING_CONFIRMED=true`, `GOOGLE_CHAT_MEDIA_AUTH_READY=true`, `AI_TUTOR_PRIVATE_STORAGE_READY=true`.

`AI_TUTOR_PAID_BILLING_CONFIRMED` means Gemini API billing is enabled for the Cloud project. ChatGPT Plus/Pro or Google AI Pro is not the same thing as Gemini API billing.

## Activation gates

1. Run local checks: `npm run test:ai-tutor`, `npx tsc -p tsconfig.ai-tutor.json --noEmit`, then the broader release gates in Todo 15.
2. Run preflight names-only: `node --import tsx scripts/qa/ai-tutor-preflight.ts --mode local --names-only`.
3. Apply only additive Supabase SQL after explicit approval.
4. Set Preview env names without displaying values.
5. Keep production `AI_TUTOR_ENABLED=false`.
6. Trusted-tester DM pilot only: pairing code, one text question, one image question, unsupported attachment, named-space DM-only response.

Emergency disable: set `AI_TUTOR_ENABLED=false` in the affected Vercel environment and redeploy/rollback that preview. The disabled route returns the deterministic connection-test response and does not construct enabled dependencies.

## Rollback

- Runtime: set `AI_TUTOR_ENABLED=false`.
- Vercel env mistake: remove or correct only the tutor-owned env names in Preview.
- Supabase preview migration: use `sql/rollback_ai_tutor_mvp.sql` only after confirming the private bucket is empty or after separately preserving needed objects.
- Google Chat app issue: point the trusted tester app back to a disabled/known endpoint or remove the preview deployment URL from the app config.

## Retention and teacher review

- Review queue: `npx tsx scripts/admin/ai-tutor-review.ts --limit 25`.
- Cleanup dry-run only: `npx tsx scripts/admin/ai-tutor-cleanup.ts --raw-cutoff <iso> --image-cutoff <iso> --metadata-cutoff <iso> --limit <n>`.
- Cleanup apply requires the exact dry-run scope: add `--apply --confirm-scope <count>:<sha256-of-sorted-ids>`.

Review output is redacted: turn UUID, hashed student reference, timestamp, subject/concepts, confidence, and escalation only.

## Cost formulas

Do not hardcode model prices. Before launch, copy current official Gemini API text/image rates plus Vercel/Supabase overage rates into a local preflight invocation:

`node --import tsx scripts/qa/ai-tutor-preflight.ts --mode preview --names-only --text-input-rate <rate> --text-output-rate <rate> --image-input-rate <rate> --storage-gb-rate <rate> --vercel-request-rate <rate> --supabase-gb-rate <rate>`

For 5, 30, and 100 students, estimate:

- text input cost = monthly text turns × average input tokens ÷ 1,000,000 × current input rate
- text output cost = monthly text turns × average output tokens ÷ 1,000,000 × current output rate
- image cost = monthly image turns × current image input unit rate
- storage/infra cost = private image GB-month + Vercel request overage + Supabase storage/egress overage

For the current 10-student pilot, stay Preview-only and watch provider usage before assuming a Supabase or Gemini paid tier is necessary.

## Known limits

External personal-account availability is not proven. Marketplace visibility/review and external membership are deferred. Class-space tutoring is deferred; named spaces receive only the DM-first notice.
