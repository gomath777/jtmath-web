import type { TutorGuideContext } from './tutor-guide-selector';
import type { WebTutorMode } from './web-input';

export type WebTutorRoute =
  | { readonly kind: 'fast' }
  | { readonly kind: 'reasoning' };

export type SelectWebTutorRouteInput = {
  readonly message: string;
  readonly mode: WebTutorMode;
  readonly guideContext?: TutorGuideContext;
};

const alternateProofPattern = /(?:다른|대안|별도의?)\s*(?:풀이|증명|방법)|다르게\s*(?:풀|증명)/iu;
const clarificationPattern = /(?:왜|이유|설명|무슨\s*뜻|이해|어디서|어떻게\s*나|계산\s*과정|확인)/iu;
const difficultGeometryPattern = /(?:증명|보조선|닮음|평행|각의\s*이등분선|원의\s*성질)/iu;
const standardStagePatterns: Readonly<Record<WebTutorMode, RegExp>> = {
  hint: /(?:힌트|단서)\s*(?:줘|보여|알려|하나|만)?\s*$/iu,
  start: /(?:풀이\s*시작|첫\s*(?:줄|단계)|다음\s*(?:단계|힌트)?|이어서|계속)\s*(?:줘|보여\s*줘?|알려\s*줘?)?\s*$/iu,
  decisive_hint: /(?:결정적|마지막|핵심)\s*힌트\s*(?:줘|보여|알려)?\s*$/iu,
  solution: /(?:정답\s*(?:알려\s*줘?|보여\s*줘?)?|답\s*(?:알려\s*줘?|보여\s*줘?|줘)|(?:풀이\s*전체|전체\s*풀이)|풀어\s*줘)\s*$/iu,
};
const complexityEscalationCodePoints = 240;

export function selectWebTutorRoute(input: SelectWebTutorRouteInput): WebTutorRoute {
  if (input.guideContext === undefined) return { kind: 'fast' };
  if (alternateProofPattern.test(input.message)) return { kind: 'reasoning' };
  if (isDifficultGeometryRequest(input)) return { kind: 'reasoning' };
  if (Array.from(input.message).length >= complexityEscalationCodePoints) return { kind: 'reasoning' };
  if (isStandardGuideStage(input)) return { kind: 'reasoning' };
  return { kind: 'fast' };
}

function isDifficultGeometryRequest(input: SelectWebTutorRouteInput): boolean {
  return input.guideContext?.curriculum.subject.includes('기하') === true
    && difficultGeometryPattern.test(input.message);
}

function isStandardGuideStage(input: SelectWebTutorRouteInput): boolean {
  return !clarificationPattern.test(input.message)
    && standardStagePatterns[input.mode].test(input.message);
}
