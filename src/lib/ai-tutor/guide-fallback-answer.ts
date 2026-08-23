import type { TutorGuideContext } from './tutor-guide-selector';

export type GuideFallbackAnswerInput = {
  readonly guideContext: TutorGuideContext;
  readonly problemNumber: number;
};

export function formatGuideFallbackAnswer(input: GuideFallbackAnswerInput): string {
  const lines = [
    `${input.problemNumber}번은 연결이 잠깐 끊겨도 이어서 볼 수 있게, 확인된 힌트 기준으로 정리해 줄게.`,
    `단원 범위: ${input.guideContext.curriculum.unit}`,
    `핵심 힌트: ${input.guideContext.hints.concept}`,
  ];

  if ('start' in input.guideContext.hints) {
    lines.push(`풀이 시작: ${input.guideContext.hints.start}`);
  }
  if ('decisive' in input.guideContext.hints) {
    lines.push(`결정적 힌트: ${input.guideContext.hints.decisive}`);
  }
  if ('solution' in input.guideContext) {
    lines.push('풀이:');
    input.guideContext.solution.steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
    lines.push(`정답: ${input.guideContext.solution.answer}`);
  }

  lines.push(`주의: ${input.guideContext.curriculum.forbiddenMethods.join(', ')}은 이 풀이에서 쓰지 말자.`);
  return lines.join('\n');
}
