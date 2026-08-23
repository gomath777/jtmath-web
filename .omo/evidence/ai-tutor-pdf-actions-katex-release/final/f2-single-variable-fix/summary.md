# F2 Single Variable Math Fix Evidence

## Scope

- Fixed `TutorMathText` classification so safe standalone inline variables render with KaTeX.
- Intended renderable cases: `$x$`, `$a$`, `$y$`, `$x_1$`.
- Preserved literal fallback for Korean prose, ambiguous English prose, instruction-like text, HTML/script-like fragments, blocked trust commands, macros, file/external commands, and unknown commands.
- No live provider, deploy, DB, Bunny, or environment writes were performed.

## Changed Files

- `src/components/ai-tutor/TutorMathText.logic.ts`
- `src/components/ai-tutor/TutorMathText.test.tsx`
- `src/components/ai-tutor/TutorMathText.browser-test-support.ts`
- `src/components/ai-tutor/TutorMathText.browser-probe-result.ts`

## Evidence

- Red scenario: `npx tsx --test src/components/ai-tutor/TutorMathText.test.tsx`
  - Artifact: `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f2-single-variable-fix/red-tutor-math-text.log`
  - Observable: failed on `classifyTutorLatex renders safe single-variable inline math without opening prose fallback`; actual `{ kind: 'literal', reason: 'malformed' }`.
- Focused green run 1: `npx tsx --test src/components/ai-tutor/TutorMathText.test.tsx`
  - Artifact: `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f2-single-variable-fix/focused-test-run-1.log`
  - Observable: 14/14 passed; browser probe asserted `singleVariableKatexCount === 4` and `singleVariableLiteralCount === 0`.
- Focused green run 2: `npx tsx --test src/components/ai-tutor/TutorMathText.test.tsx`
  - Artifact: `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f2-single-variable-fix/focused-test-run-2.log`
  - Observable: 14/14 passed.
- Full web tutor suite: `npm run test:web-ai-tutor`
  - Artifact: `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f2-single-variable-fix/test-web-ai-tutor.log`
  - Observable: server suite 118/118 passed; client suite 38/38 passed.
- Scoped TypeScript: `npx tsc -p tsconfig.web-ai-tutor.json --noEmit`
  - Artifact: `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f2-single-variable-fix/tsc-web-ai-tutor.log`
  - Observable: exit code 0.
- Production build: `npm run build`
  - Artifact: `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f2-single-variable-fix/build.log`
  - Observable: `Compiled successfully`; Next build completed.
- Diff check: `git diff --check -- src/components/ai-tutor/TutorMathText.logic.ts src/components/ai-tutor/TutorMathText.test.tsx src/components/ai-tutor/TutorMathText.browser-test-support.ts src/components/ai-tutor/TutorMathText.browser-probe-result.ts`
  - Artifact: `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f2-single-variable-fix/diff-check.log`
  - Observable: exit code 0.
- Size check: per-file pure LOC
  - Artifact: `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f2-single-variable-fix/line-count.log`
  - Observable: `TutorMathText.logic.ts` remained at 250 pure LOC.
- Independent code review: `codex review --uncommitted`
  - Artifact: `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f2-single-variable-fix/independent-code-review.log`
  - Observable: reviewer reported the change is narrowly scoped, preserves prose and unsafe-command rejection, and is covered by unit and browser-probe assertions.
- Stale final F3 blocker cleanup:
  - Artifact: `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f2-single-variable-fix/stale-blocker-cleanup.log`
  - Observable: removed only `.omo/evidence/ai-tutor-pdf-actions-katex-release/final/f3-manual-browser/BLOCKER.txt`; retained `manualQa.json`.
