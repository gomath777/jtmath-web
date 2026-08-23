import {
  TutorProviderResultSchema,
  buildReviewResult,
  type TutorGroundedProblem,
  type TutorProviderResult,
} from './contracts';

const methodMarkerPattern = /^\s*\[\[method:\s*([^\]\r\n]{1,80})\]\]\s*/u;
const groundedReviewText = '사용한 풀이법 확인이 필요해 선생님 검토로 넘길게요.';

export function applyGroundedMethodPolicy(
  result: TutorProviderResult,
  problem: TutorGroundedProblem | undefined,
): TutorProviderResult {
  const marker = readMethodMarker(result.answerText);
  if (problem === undefined || !hasMethodPolicy(problem)) {
    return marker === null
      ? result
      : TutorProviderResultSchema.parse({ ...result, answerText: marker.answerText });
  }
  if (marker === null) return groundedHintFallbackResult(problem);
  if (methodViolatesPolicy(marker.method, marker.answerText, problem)) {
    return groundedMethodReviewResult();
  }
  return TutorProviderResultSchema.parse({ ...result, answerText: marker.answerText });
}

function hasMethodPolicy(problem: TutorGroundedProblem): boolean {
  return problem.allowedMethods.length > 0 || problem.disallowedMethods.length > 0;
}

function readMethodMarker(answerText: string): { readonly method: string; readonly answerText: string } | null {
  const match = methodMarkerPattern.exec(answerText);
  const method = match?.[1] === undefined ? '' : normalizeMethod(match[1]);
  if (match === null || method === '') return null;
  return { method, answerText: answerText.slice(match[0].length).trim() || groundedReviewText };
}

function methodViolatesPolicy(method: string, answerText: string, problem: TutorGroundedProblem): boolean {
  if (matchesAny(method, problem.disallowedMethods) || textContainsAnyMethod(answerText, problem.disallowedMethods)) {
    return true;
  }
  return problem.allowedMethods.length > 0 && !matchesAny(method, problem.allowedMethods);
}

function matchesAny(method: string, methods: readonly string[]): boolean {
  return methods.some((candidate) => normalizeMethod(candidate) === method);
}

function textContainsAnyMethod(answerText: string, methods: readonly string[]): boolean {
  const normalizedAnswer = normalizeMethod(answerText);
  return methods.some((candidate) => {
    const normalizedCandidate = normalizeMethod(candidate);
    return normalizedCandidate !== '' && normalizedAnswer.includes(normalizedCandidate);
  });
}

function normalizeMethod(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('ko-KR');
}

function groundedMethodReviewResult(): TutorProviderResult {
  return buildReviewResult({
    reason: 'disallowed_method',
    errorType: null,
    answerText: groundedReviewText,
  });
}

function groundedHintFallbackResult(problem: TutorGroundedProblem): TutorProviderResult {
  const hint = problem.hints.start ?? problem.hints.concept ?? problem.hints.decisive ?? '문제 조건을 먼저 정리해 보세요.';
  return TutorProviderResultSchema.parse({
    answerText: `힌트: ${hint}`,
    confidence: 0.95,
    subjectSlug: null,
    conceptTags: problem.allowedMethods.map(toConceptTag).filter((tag) => tag.length > 0).slice(0, 8),
    errorType: null,
    needsTeacherReview: false,
    escalationReason: null,
  });
}

function toConceptTag(method: string): string {
  return method
    .replace(/\s+/g, '-')
    .replace(new RegExp('[^\\p{L}\\p{N}_:-]+', 'gu'), '')
    .toLocaleLowerCase('ko-KR');
}
