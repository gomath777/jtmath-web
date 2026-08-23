import type { TutorRecentTurn } from './contracts';
import { normalizeTags, sanitizeText, timestampOf, truncateText } from './context-sanitization';
import type { AiTutorContextCaps, SourceTutorTurn } from './context-types';

const maxPromptRecentTurns = 6;

export const repeatedConceptWindowDays = 30;
export const repeatedConceptScanLimit = 40;

export function buildRecentTurns(
  turns: readonly SourceTutorTurn[],
  caps: AiTutorContextCaps,
): readonly TutorRecentTurn[] {
  const maxTurns = Math.min(caps.recentTurnCount, maxPromptRecentTurns);
  const sortedTurns = [...turns].sort((left, right) => timestampOf(right.receivedAt) - timestampOf(left.receivedAt));
  const recentTurns: TutorRecentTurn[] = [];
  let usedCharacters = 0;
  for (const turn of sortedTurns) {
    for (const candidate of turnToRecentCandidates(turn, caps.recentTurnCharacters)) {
      const remainingCharacters = caps.recentTotalCharacters - usedCharacters;
      if (recentTurns.length >= maxTurns || remainingCharacters <= 0) {
        return recentTurns;
      }
      const text = truncateText(candidate.text, remainingCharacters);
      if (!text) continue;
      recentTurns.push({ ...candidate, text });
      usedCharacters += text.length;
    }
  }
  return recentTurns;
}

export function hasRepeatedConcept(turns: readonly SourceTutorTurn[], since: Date): boolean {
  const counts = new Map<string, number>();
  for (const turn of turns) {
    if (timestampOf(turn.receivedAt) < since.getTime()) continue;
    for (const tag of Array.from(new Set(normalizeTags(turn.conceptTags)))) {
      const nextCount = (counts.get(tag) ?? 0) + 1;
      if (nextCount >= 3) {
        return true;
      }
      counts.set(tag, nextCount);
    }
  }
  return false;
}

function turnToRecentCandidates(
  turn: SourceTutorTurn,
  characterCap: number,
): readonly TutorRecentTurn[] {
  const conceptTags = normalizeTags(turn.conceptTags).slice(0, 8);
  const question = sanitizeText(turn.questionText, characterCap);
  const answer = sanitizeText(turn.answerText, characterCap);
  const candidates: TutorRecentTurn[] = [];
  if (question) {
    candidates.push({ role: 'student', text: question, conceptTags });
  }
  if (answer) {
    candidates.push({ role: 'tutor', text: answer, conceptTags });
  }
  return candidates;
}
