import 'server-only';

import type { TutorEngine } from './engine';
import type { WebTutorRequest } from './web-input';
import type { WebPdfFetchPort } from './web-material';
import type { WebProblemImageStore } from './web-problem-image';
import type { WebTutorGuideStore } from './web-tutor-guide-store';
import type { WebTutorRoutedProvider } from './web-provider-routing';
import type { WebConversation, WebConversationRepository } from './web-conversation-repository';
import type { WebTutorServerContinuity } from './web-conversation-continuity';
import type { WebTutorModelConfig } from './web-config';
import { resolveWebTutorAttachment } from './web-tutor-material';
import { runWebTutorEngine } from './web-tutor-engine';
import type {
  WebLessonContextResult,
  WebLessonMaterialAuthorizationResult,
  WebLessonMaterialDescriptor,
} from './web-lesson-context';
import { getWebLessonAssignment } from './web-lesson-context';
import type { WebTutorParseResult } from './web-input';
import {
  appendRenewedWebTutorCookie,
  duplicateCompletedWebTutorResponse,
  isProviderUnavailable,
  jsonResponse as json,
  responseProviderMetadata,
} from './web-handler-responses';
import {
  claimPersistentTurn,
  markPersistentCompleted,
  markPersistentFailure,
} from './web-handler-persistence';

const retryableProviderMessage = '답변 생성이 끊겼어요. 같은 문제로 다시 보내면 이어서 도와줄게요.';

type WebAiTutorTurnDependencies = {
  readonly studentTokenSecret: string;
  readonly provider?: WebTutorRoutedProvider;
  readonly engine?: TutorEngine;
  readonly fetchPort?: WebPdfFetchPort;
  readonly problemImageStore?: WebProblemImageStore;
  readonly guideStore?: WebTutorGuideStore;
  readonly conversationRepository?: WebConversationRepository;
  readonly requestIdFactory?: () => string;
  readonly secureCookie?: boolean;
};

export async function answerWebTutorTurn(input: Readonly<{
  readonly request: Request;
  readonly tutorRequest: WebTutorRequest;
  readonly identity: { readonly profileId: string; readonly slug: string };
  readonly dependencies: WebAiTutorTurnDependencies;
  readonly models: {
    readonly fast: WebTutorModelConfig;
    readonly reasoning: WebTutorModelConfig;
    readonly fallback: WebTutorModelConfig;
  };
  readonly lessonResult: Extract<WebLessonContextResult, { readonly ok: true }>;
  readonly materials: readonly WebLessonMaterialDescriptor[];
  readonly authorizedMaterial: Extract<WebLessonMaterialAuthorizationResult, { readonly ok: true }>;
  readonly serverContinuity: {
    readonly continuity: WebTutorServerContinuity;
    readonly conversation?: WebConversation;
  };
  readonly target: Extract<WebTutorParseResult, { readonly kind: 'ok' }>;
  readonly now: Date;
}>): Promise<Response> {
  const assignment = getWebLessonAssignment(input.lessonResult);
  const persistence = await claimPersistentTurn({
    repository: input.dependencies.conversationRepository,
    request: input.request,
    requestIdFactory: input.dependencies.requestIdFactory,
    profileId: input.identity.profileId,
    assignment,
    conversation: input.serverContinuity.conversation,
    target: input.target.target,
    mode: input.target.mode,
    message: input.tutorRequest.message,
    now: input.now,
  });
  if (persistence.kind === 'unavailable') {
    return json({ status: 'continuity_unavailable', message: '학습 상태를 확인할 수 없습니다.' }, 503);
  }
  if (persistence.kind === 'duplicate_completed') {
    return appendRenewedWebTutorCookie({
      response: duplicateCompletedWebTutorResponse({
        turn: persistence.turn,
        target: input.target.target,
        contextKey: input.lessonResult.context.contextKey,
      }),
      identity: input.identity,
      studentTokenSecret: input.dependencies.studentTokenSecret,
      secureCookie: input.dependencies.secureCookie ?? false,
      now: input.now,
    });
  }
  if (persistence.kind === 'duplicate_processing') {
    return json({ status: 'rate_limited', message: '이미 답변을 만들고 있습니다.' }, 429, { 'Retry-After': '1' });
  }

  const material = await resolveWebTutorAttachment({
    lessonSlug: input.lessonResult.context.lessonSlug,
    materials: input.materials,
    materialKey: input.target.target.materialKey,
    level: legacyServerLevel(input.authorizedMaterial.descriptor),
    problemNumber: input.target.target.problemNumber,
    mode: input.target.mode,
    fetchPort: input.dependencies.fetchPort,
    problemImageStore: input.dependencies.problemImageStore,
    guideStore: input.dependencies.guideStore,
  });
  if (!material.ok) {
    const message = material.reason === 'registered_guide_unavailable'
      ? '학습 자료를 확인할 수 없습니다. 선생님 확인이 필요합니다.'
      : '학습 자료를 확인할 수 없습니다.';
    await markPersistentFailure({
      repository: input.dependencies.conversationRepository,
      persistence,
      profileId: input.identity.profileId,
      assignmentId: assignment.id,
      answerText: message,
      errorCategory: 'material_unavailable',
      now: input.now,
    });
    return json({ status: 'material_unavailable', message }, 503);
  }

  const engineAnswer = await runWebTutorEngine({
    engine: input.dependencies.engine,
    provider: input.dependencies.provider,
    models: input.models,
    lessonSlug: input.lessonResult.context.lessonSlug,
    message: input.tutorRequest.message,
    mode: input.target.mode,
    target: input.target.target,
    result: input.lessonResult,
    recentTurns: input.serverContinuity.continuity.recentTurns,
    attachment: material.attachment,
    ...(material.guideContext === undefined ? {} : { guideContext: material.guideContext }),
  });
  if (isProviderUnavailable(engineAnswer.result)) {
    await markPersistentFailure({
      repository: input.dependencies.conversationRepository,
      persistence,
      profileId: input.identity.profileId,
      assignmentId: assignment.id,
      answerText: retryableProviderMessage,
      errorCategory: engineAnswer.result.errorType ?? 'provider_error',
      now: input.now,
    });
    return json({ status: 'provider_unavailable', message: retryableProviderMessage, resolvedTarget: input.target.target }, 503);
  }

  const completed = await markPersistentCompleted({
    repository: input.dependencies.conversationRepository,
    persistence,
    profileId: input.identity.profileId,
    assignmentId: assignment.id,
    answerText: engineAnswer.result.answerText,
    metadata: engineAnswer.metadata,
    now: input.now,
  });
  if (!completed) return json({ status: 'continuity_unavailable', message: '학습 상태를 저장할 수 없습니다.' }, 503);

  const response = json(
    {
      status: engineAnswer.result.needsTeacherReview ? 'teacher_review' : 'answered',
      message: engineAnswer.result.answerText,
      resolvedTarget: input.target.target,
      meta: {
        contextKey: input.lessonResult.context.contextKey,
        problemNumber: input.target.target.problemNumber,
        materialKind: material.attachment.kind,
        materialSizeBucket: material.attachment.coarseSizeBytes,
        needsTeacherReview: engineAnswer.result.needsTeacherReview,
        provider: responseProviderMetadata(engineAnswer.metadata),
      },
    },
    200,
  );
  return appendRenewedWebTutorCookie({
    response,
    identity: input.identity,
    studentTokenSecret: input.dependencies.studentTokenSecret,
    secureCookie: input.dependencies.secureCookie ?? false,
    now: input.now,
  });
}

function legacyServerLevel(descriptor: Extract<WebLessonMaterialAuthorizationResult, { readonly ok: true }>['descriptor']): number {
  return descriptor.level;
}
