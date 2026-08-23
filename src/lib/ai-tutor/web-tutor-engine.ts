import 'server-only';

import { buildReviewResult, type TutorProviderRequest, type TutorProviderResult, type TutorRecentTurn } from './contracts';
import { createTutorEngine, sanitizeTutorProviderRequest, type TutorEngine, type TutorEngineMetadata } from './engine';
import type { AiTutorTokenCounts } from './observability';
import type { TutorGuideContext } from './tutor-guide-selector';
import type { WebTutorModelConfig } from './web-config';
import type { TutorAttachment } from './web-tutor-material';
import { selectWebTutorRoute } from './web-tutor-routing';
import type { WebTutorMode, WebTutorTarget } from './web-input';
import type { WebLessonContextResult } from './web-lesson-context';
import type { WebTutorProviderRouteMetadata, WebTutorRoutedProvider } from './web-provider-routing';

const zeroTokenCounts: AiTutorTokenCounts = { input: 0, output: 0, total: 0 };

export type WebTutorEngineMetadata =
  | ({ readonly kind: 'provider' } & WebTutorProviderRouteMetadata)
  | { readonly kind: 'provider'; readonly attemptCount: 1 | 2; readonly tokenCounts: AiTutorTokenCounts; readonly failureCategory: TutorProviderResult['errorType']; readonly model: TutorEngineMetadata | null };

export type WebTutorEngineAnswer = {
  readonly result: TutorProviderResult;
  readonly metadata: WebTutorEngineMetadata;
};

export type RunWebTutorEngineInput = {
  readonly engine?: TutorEngine;
  readonly provider?: WebTutorRoutedProvider;
  readonly models: {
    readonly fast: WebTutorModelConfig;
    readonly reasoning: WebTutorModelConfig;
    readonly fallback: WebTutorModelConfig;
  };
  readonly lessonSlug: string;
  readonly message: string;
  readonly mode: WebTutorMode;
  readonly target: WebTutorTarget;
  readonly result: Extract<WebLessonContextResult, { readonly ok: true }>;
  readonly recentTurns: readonly { readonly role: 'student' | 'tutor'; readonly text: string }[];
  readonly attachment: TutorAttachment;
  readonly guideContext?: TutorGuideContext;
};

export async function runWebTutorEngine(input: RunWebTutorEngineInput): Promise<WebTutorEngineAnswer> {
  const guideContext = input.guideContext === undefined ? undefined : projectGuideContext(input.guideContext, input.mode);
  const scopedInput = { ...input, ...(guideContext === undefined ? {} : { guideContext }) };
  const route = selectWebTutorRoute({ message: input.message, mode: input.mode, guideContext });
  const request = sanitizeTutorProviderRequest(createProviderRequest(scopedInput));
  return answerProvider({ input: scopedInput, request, route });
}

async function answerProvider(input: {
  readonly input: RunWebTutorEngineInput;
  readonly request: TutorProviderRequest;
  readonly route: ReturnType<typeof selectWebTutorRoute>;
}): Promise<WebTutorEngineAnswer> {
  const routed = input.input.provider?.answerWithRoute;
  if (routed !== undefined) {
    const primaryModel = input.route.kind === 'fast' ? input.input.models.fast : input.input.models.reasoning;
    const answer = await routed({ request: input.request, primaryModel, fallbackModel: input.input.models.fallback });
    return { result: answer.result, metadata: { kind: 'provider', ...answer.metadata } };
  }
  const engine = input.input.engine ?? (input.input.provider === undefined ? undefined : createTutorEngine({ provider: input.input.provider }));
  if (engine === undefined) return { result: providerErrorFallback(), metadata: { kind: 'provider', attemptCount: 1, tokenCounts: zeroTokenCounts, failureCategory: 'provider_error', model: null } };
  const answer = await engine.answerWithMetadata(input.request);
  return {
    result: answer.result,
    metadata: {
      kind: 'provider',
      attemptCount: answer.metadata?.attemptCount ?? 1,
      tokenCounts: answer.metadata?.tokenCounts ?? zeroTokenCounts,
      failureCategory: answer.result.errorType,
      model: answer.metadata,
    },
  };
}

function projectGuideContext(guideContext: TutorGuideContext, mode: WebTutorMode): TutorGuideContext {
  const base = {
    curriculum: guideContext.curriculum,
    officialApproach: guideContext.officialApproach,
    alternatives: guideContext.alternatives,
  };
  switch (mode) {
    case 'hint':
      return { ...base, hints: { concept: guideContext.hints.concept } };
    case 'start':
      return 'start' in guideContext.hints
        ? { ...base, hints: { concept: guideContext.hints.concept, start: guideContext.hints.start } }
        : { ...base, hints: { concept: guideContext.hints.concept } };
    case 'decisive_hint':
      return 'decisive' in guideContext.hints && 'start' in guideContext.hints
        ? { ...base, hints: { concept: guideContext.hints.concept, start: guideContext.hints.start, decisive: guideContext.hints.decisive } }
        : projectGuideContext(guideContext, 'start');
    case 'solution':
      return 'solution' in guideContext && 'decisive' in guideContext.hints && 'start' in guideContext.hints
        ? { ...base, hints: { concept: guideContext.hints.concept, start: guideContext.hints.start, decisive: guideContext.hints.decisive }, solution: guideContext.solution }
        : projectGuideContext(guideContext, 'decisive_hint');
    default:
      return assertNever(mode);
  }
}

function createProviderRequest(input: RunWebTutorEngineInput): TutorProviderRequest {
  return {
    input: { kind: 'text', messageText: composeStudentMessage(input.message, input.mode, input.target) },
    context: {
      gradeLabel: '고등',
      releasedCurriculum: [{
        subjectSlug: input.result.context.subjectSlug,
        conceptTags: [],
        title: input.result.context.lessonTitle,
        summary: '현재 선택한 문제의 확인된 안내만 사용합니다.',
      }],
      recentTurns: input.recentTurns.map(toTutorRecentTurn),
      repeatedConceptSignal: false,
      ...(input.guideContext === undefined ? {} : { guideContext: input.guideContext }),
    },
    ...(input.attachment.kind === 'image'
      ? { image: { mimeType: 'image/png' as const, bytes: copyBytes(input.attachment.bytes), sha256Hex: input.attachment.sha256Hex } }
      : { document: { mimeType: 'application/pdf' as const, bytes: copyBytes(input.attachment.bytes), sha256Hex: input.attachment.sha256Hex } }),
  };
}

function providerErrorFallback(): TutorProviderResult {
  return buildReviewResult({
    reason: 'provider_error',
    errorType: 'provider_error',
    answerText: '답변 생성이 끊겼어요. 같은 문제로 다시 물어보면 힌트부터 이어서 도와줄게요.',
  });
}

function composeStudentMessage(message: string, mode: WebTutorMode, target: WebTutorTarget): string {
  return `대상 문제: ${target.problemNumber}번. 요청 단계: ${mode}. 학생 질문: ${message}`;
}

function toTutorRecentTurn(turn: { readonly role: 'student' | 'tutor'; readonly text: string }): TutorRecentTurn {
  return { role: turn.role, text: turn.text, conceptTags: [] };
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

function assertNever(value: never): never {
  throw new Error(`Unexpected web tutor mode: ${String(value)}`);
}
