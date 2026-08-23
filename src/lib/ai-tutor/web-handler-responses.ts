import type { TutorProviderResult } from './contracts';
import type { WebTutorEngineMetadata } from './web-tutor-engine';
import type { WebLessonContextResult } from './web-lesson-context';
import type { parseWebTutorInput, WebTutorTarget } from './web-input';
import type { WebTurn } from './web-conversation-repository';
import { buildRenewedWebStudentCookie, signStrictWebStudentToken } from './web-auth';

export type WebTutorResponseProviderMetadata = {
  readonly attemptCount: number;
  readonly tokenCounts: { readonly input: number; readonly output: number; readonly total: number };
  readonly failureCategory: string | null;
  readonly modelAlias: string;
  readonly latencyMs?: number;
};

export function isProviderUnavailable(result: TutorProviderResult): boolean {
  return result.errorType === 'provider_error' || result.errorType === 'timeout';
}

export function mapLessonFailure(result: Extract<WebLessonContextResult, { readonly ok: false }>): Response {
  switch (result.reason) {
    case 'not_found':
    case 'wrong_lesson':
    case 'revoked_token':
    case 'expired_token':
    case 'unassigned':
    case 'unreleased':
      return jsonResponse({ status: 'forbidden', message: '이 수업에서는 AI 튜터를 사용할 수 없습니다.' }, 403);
    case 'missing_pdf':
    case 'duplicate_pdf':
    case 'source_error':
      return jsonResponse({ status: 'material_unavailable', message: '학습 자료를 확인할 수 없습니다.' }, 503);
    default:
      return assertNever(result.reason);
  }
}

export function mapTargetFailure(result: Exclude<ReturnType<typeof parseWebTutorInput>, { readonly kind: 'ok' }>): Response {
  switch (result.kind) {
    case 'ambiguous_material':
      return jsonResponse({ status: 'ambiguous_material', message: '학습지를 선택해 주세요.' }, 422);
    case 'stale_target':
      return jsonResponse({ status: 'stale_target', message: '문제를 다시 선택해 주세요.' }, 422);
    case 'malformed_input':
    case 'unsupported_material':
      return jsonResponse({ status: 'invalid_request', message: '현재 학습지의 문제 번호를 확인해 주세요.' }, 422);
    default:
      return assertNever(result);
  }
}

export function responseProviderMetadata(metadata: WebTutorEngineMetadata): WebTutorResponseProviderMetadata {
  if ('model' in metadata) {
    return {
      attemptCount: metadata.attemptCount,
      tokenCounts: metadata.tokenCounts,
      failureCategory: metadata.failureCategory,
      modelAlias: metadata.model?.modelAlias ?? 'unknown',
    };
  }
  return {
    attemptCount: metadata.attemptCount,
    tokenCounts: metadata.tokenCounts,
    failureCategory: metadata.failureCategory,
    modelAlias: metadata.modelAlias,
    latencyMs: metadata.latencyMs,
  };
}

export function duplicateCompletedWebTutorResponse(input: Readonly<{
  readonly turn: WebTurn;
  readonly target: WebTutorTarget;
  readonly contextKey: string;
}>): Response {
  return jsonResponse({
    status: 'answered',
    message: input.turn.answerText ?? '이전 답변을 찾았습니다.',
    resolvedTarget: input.target,
    meta: {
      contextKey: input.contextKey,
      problemNumber: input.target.problemNumber,
      materialKind: 'image',
      materialSizeBucket: 0,
      needsTeacherReview: input.turn.needsTeacherReview,
      provider: {
        attemptCount: input.turn.attemptCount,
        tokenCounts: {
          input: input.turn.inputTokens ?? 0,
          output: input.turn.outputTokens ?? 0,
          total: input.turn.totalTokens ?? 0,
        },
        failureCategory: input.turn.errorCategory,
        modelAlias: input.turn.modelAlias ?? 'unknown',
        ...(input.turn.latencyMs === null ? {} : { latencyMs: input.turn.latencyMs }),
      },
    },
  }, 200);
}

export async function appendRenewedWebTutorCookie(input: Readonly<{
  readonly response: Response;
  readonly identity: { readonly profileId: string; readonly slug: string; readonly isMaster?: boolean };
  readonly studentTokenSecret: string;
  readonly secureCookie: boolean;
  readonly now: Date;
}>): Promise<Response> {
  const renewed = await signStrictWebStudentToken({
    payload: {
      profileId: input.identity.profileId,
      slug: input.identity.slug,
      ...(input.identity.isMaster === true ? { isMaster: true } : {}),
    },
    secret: input.studentTokenSecret,
    nowSeconds: Math.floor(input.now.getTime() / 1000),
  });
  input.response.headers.append('Set-Cookie', buildRenewedWebStudentCookie({ token: renewed, secure: input.secureCookie }));
  return input.response;
}

export function jsonResponse(body: unknown, status: number, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}

function assertNever(value: never): never {
  throw new Error(`Unexpected web AI tutor response state: ${String(value)}`);
}
