import 'server-only';

import type { TutorEngine } from './engine';
import { parseWebTutorInput } from './web-input';
import {
  getWebLessonMaterialDescriptors,
  getWebLessonAssignment,
  authorizeWebLessonMaterial,
  resolveWebLessonContext,
  type WebLessonContextQueryPort,
  type VerifiedWebLessonIdentity,
} from './web-lesson-context';
import type { WebPdfFetchPort } from './web-material';
import type { WebProblemImageStore } from './web-problem-image';
import type { WebTutorGuideStore } from './web-tutor-guide-store';
import type { WebConversationRepository } from './web-conversation-repository';
import { resolveWebTutorMaterials } from './web-tutor-material-range';
import type { WebTutorRoutedProvider } from './web-provider-routing';
import { hashWebAdmissionProfileKey, type PreviewWebAdmission } from './web-admission';
import {
  readWebStudentCookie,
  verifyStrictWebStudentToken,
} from './web-auth';
import { parseWebAiTutorConfig, type WebAiTutorEnvironment } from './web-config';
import {
  jsonResponse as json,
  mapLessonFailure,
  mapTargetFailure,
} from './web-handler-responses';
import {
  loadServerContinuity,
  type WebTutorServerContinuityPort,
} from './web-handler-persistence';
import { readWebTutorRequest } from './web-handler-request';
import { answerWebTutorTurn } from './web-handler-turn';

export type WebAiTutorHandlerDependencies = {
  readonly env: WebAiTutorEnvironment;
  readonly studentTokenSecret: string;
  readonly lessonPort: WebLessonContextQueryPort;
  readonly admission: PreviewWebAdmission;
  readonly provider?: WebTutorRoutedProvider;
  readonly engine?: TutorEngine;
  readonly fetchPort?: WebPdfFetchPort;
  readonly problemImageStore?: WebProblemImageStore;
  readonly guideStore?: WebTutorGuideStore;
  readonly serverContinuity?: WebTutorServerContinuityPort;
  readonly conversationRepository?: WebConversationRepository;
  readonly requestIdFactory?: () => string;
  readonly now?: () => Date;
  readonly secureCookie?: boolean;
};

export function createWebAiTutorPost(dependencies: WebAiTutorHandlerDependencies): (request: Request) => Promise<Response> {
  return async (request) => {
    const config = parseWebAiTutorConfig(dependencies.env);
    if (!config.ok || config.config.status !== 'enabled') return json({ status: 'disabled', message: 'AI 튜터를 사용할 수 없습니다.' }, 404);

    const token = readWebStudentCookie(request.headers.get('cookie'));
    if (token === null) return json({ status: 'unauthorized', message: '다시 로그인해 주세요.' }, 401);
    const now = dependencies.now?.() ?? new Date();
    const identity = await verifyStrictWebStudentToken({
      token,
      secret: dependencies.studentTokenSecret,
      nowSeconds: Math.floor(now.getTime() / 1000),
    });
    if (identity === null) return json({ status: 'unauthorized', message: '다시 로그인해 주세요.' }, 401);
    if (identity.isMaster === true) return json({ status: 'forbidden', message: '학생 계정으로만 사용할 수 있습니다.' }, 403);

    const parsedRequest = await readWebTutorRequest(request);
    if (!parsedRequest.ok) return json({ status: 'invalid_request', message: '요청 형식이 올바르지 않습니다.' }, 422);

    const lessonResult = await resolveWebLessonContext({
      port: dependencies.lessonPort,
      identity: toLessonIdentity(identity),
      lessonSlug: parsedRequest.request.lessonSlug,
      now,
    });
    if (!lessonResult.ok) return mapLessonFailure(lessonResult);

    const materials = getWebLessonMaterialDescriptors(lessonResult);
    const resolvedMaterials = resolveWebTutorMaterials({ lessonSlug: lessonResult.context.lessonSlug, descriptors: materials });
    if (!resolvedMaterials.ok) {
      return json({ status: 'material_unavailable', message: '학습 자료를 확인할 수 없습니다.' }, 503);
    }
    const serverContinuity = await loadServerContinuity({
      port: dependencies.serverContinuity,
      repository: dependencies.conversationRepository,
      profileId: identity.profileId,
      assignmentId: getWebLessonAssignment(lessonResult).id,
      lessonSlug: lessonResult.context.lessonSlug,
      contextKey: lessonResult.context.contextKey,
      now,
    });
    if (serverContinuity.kind === 'unavailable') {
      return json({ status: 'continuity_unavailable', message: '학습 상태를 확인할 수 없습니다.' }, 503);
    }
    const target = parseWebTutorInput({
      request: parsedRequest.request,
      serverContextKey: lessonResult.context.contextKey,
      materials: resolvedMaterials.materials,
      serverContinuity: serverContinuity.continuity,
    });
    if (target.kind !== 'ok') return mapTargetFailure(target);
    const authorizedMaterial = authorizeWebLessonMaterial({
      result: lessonResult,
      contextKey: target.target.contextKey,
      materialKey: target.target.materialKey,
    });
    if (!authorizedMaterial.ok) return json({ status: 'stale_target', message: '문제를 다시 선택해 주세요.' }, 422);

    const admissionKey = await hashWebAdmissionProfileKey({
      profileId: identity.profileId,
      secret: dependencies.studentTokenSecret,
    });
    const acquired = dependencies.admission.tryAcquire(admissionKey);
    if (!acquired.accepted) {
      return json(
        { status: 'rate_limited', message: '잠시 후 다시 시도해 주세요.' },
        429,
        { 'Retry-After': String(acquired.retryAfterSeconds) },
      );
    }

    try {
      return await answerWebTutorTurn({
        request,
        tutorRequest: parsedRequest.request,
        identity,
        dependencies,
        models: config.config.models,
        lessonResult,
        materials,
        authorizedMaterial,
        serverContinuity,
        target,
        now,
      });
    } finally {
      acquired.release();
    }
  };
}

function toLessonIdentity(identity: { readonly profileId: string; readonly slug: string; readonly isMaster?: boolean }): VerifiedWebLessonIdentity {
  return { profileId: identity.profileId, slug: identity.slug, ...(identity.isMaster === true ? { isMaster: true } : {}) };
}
