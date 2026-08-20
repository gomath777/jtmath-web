import { handleGoogleChatEvent, type GoogleChatEvent, type GoogleChatResponse } from '../google-chat/add-on';
import type { TutorContext, TutorImageInput, TutorProviderResult } from './contracts';
import { buildReviewResult } from './contracts';
import type { TutorEngine } from './engine';
import { createGoogleChatIdentityPairing, type GoogleChatIdentityPairingResult } from './identity';
import type { AiTutorMediaReviewOutcome } from './chat-media';
import type { AiTutorRepository } from './repository';

export type AiTutorImageProcessor = {
  readonly process: (event: Extract<GoogleChatEvent, { readonly kind: 'message' }>, profileId: string, turnId: string) => Promise<
    | { readonly ok: true; readonly image?: TutorImageInput }
    | { readonly ok: false; readonly outcome: AiTutorMediaReviewOutcome }
  >;
};

export type AiTutorContextProvider = {
  readonly load: (profileId: string) => Promise<TutorContext>;
};

export type GoogleChatAiTutorOrchestratorOptions = {
  readonly repository: AiTutorRepository;
  readonly engine: TutorEngine;
  readonly contextProvider: AiTutorContextProvider;
  readonly imageProcessor: AiTutorImageProcessor;
  readonly hmacSecret: string;
  readonly now?: () => Date;
};

export function createGoogleChatAiTutorOrchestrator(
  options: GoogleChatAiTutorOrchestratorOptions,
): (event: GoogleChatEvent) => Promise<GoogleChatResponse> {
  return async (event) => {
    if (event.kind !== 'message') return handleGoogleChatEvent(event);
    if (event.space.channel !== 'direct_message') {
      return createMessage('수학 질문 봇은 지금 1:1 DM에서만 답변해요. DM으로 질문을 보내주세요.');
    }

    const now = options.now?.() ?? new Date();
    const identity = await createGoogleChatIdentityPairing({
      repository: options.repository,
      chatUserName: event.userName,
      hmacSecret: options.hmacSecret,
      now,
    });
    if (identity.kind !== 'linked') return createMessage(identityMessage(identity));

    const conversation = await options.repository.upsertConversation({
      profileId: identity.profileId,
      identityId: identity.identityId,
      chatSpaceName: event.space.name,
      chatThreadName: event.threadName ?? null,
      channelType: 'dm',
      seenAt: now.toISOString(),
    });
    if (!conversation.ok) return createMessage(repositoryFallback().answerText);

    const claimed = await options.repository.claimInboundTurn({
      profileId: identity.profileId,
      conversationId: conversation.value.id,
      inboundMessageName: event.messageName,
      questionText: event.text,
      receivedAt: now.toISOString(),
    });
    if (!claimed.ok) return createMessage(repositoryFallback().answerText);
    if (claimed.value.kind === 'duplicate_completed') return createMessage(claimed.value.answer.answerText);
    if (claimed.value.kind === 'duplicate_fallback') return createMessage(claimed.value.fallback.answerText);

    const turnId = claimed.value.turn.id;
    const image = event.hasAttachment ? await options.imageProcessor.process(event, identity.profileId, turnId) : { ok: true as const };
    if (!image.ok) {
      await options.repository.markTurnFailed({
        profileId: identity.profileId,
        turnId,
        errorType: 'unsupported_attachment',
        escalationReason: 'unsupported_attachment',
        answerText: image.outcome.reviewResult.answerText,
        completedAt: now.toISOString(),
      });
      return createMessage(image.outcome.reviewResult.answerText);
    }

    const context = await options.contextProvider.load(identity.profileId);
    const result = await options.engine.answer({
      input: { kind: 'text', messageText: event.text || '이미지 질문' },
      context,
      ...(image.image === undefined ? {} : { image: image.image }),
    });
    await persistResult(options.repository, identity.profileId, turnId, result, now);
    return createMessage(result.answerText);
  };
}

async function persistResult(
  repository: AiTutorRepository,
  profileId: string,
  turnId: string,
  result: TutorProviderResult,
  now: Date,
): Promise<void> {
  if (result.errorType === null) {
    await repository.markTurnCompleted({
      profileId,
      turnId,
      result,
      provider: 'gemini',
      modelAlias: 'runtime',
      promptVersion: 'runtime',
      latencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      completedAt: now.toISOString(),
    });
    return;
  }
  await repository.markTurnFailed({
    profileId,
    turnId,
    errorType: result.errorType,
    escalationReason: result.escalationReason ?? 'provider_error',
    answerText: result.answerText,
    completedAt: now.toISOString(),
  });
}

function identityMessage(identity: Exclude<GoogleChatIdentityPairingResult, { readonly kind: 'linked' }>): string {
  switch (identity.kind) {
    case 'pairing_created':
      return `수학 질문 봇 연결 코드: ${identity.pairingCode}\n15분 안에 선생님에게 이 코드를 알려주세요.`;
    case 'pending_exists':
      return '이미 연결 코드가 발급되어 있어요. 새 코드가 필요하면 선생님에게 요청해주세요.';
    case 'revoked':
      return '이 Chat 계정은 연결이 해제되어 있어요. 선생님에게 다시 연결을 요청해주세요.';
    case 'invalid_identity':
    case 'repository_error':
      return '계정을 안전하게 확인하지 못했어요. 선생님 확인이 필요합니다.';
    default:
      return assertNever(identity);
  }
}

function repositoryFallback(): TutorProviderResult {
  return buildReviewResult({
    reason: 'provider_error',
    errorType: 'provider_error',
    answerText: '질문을 안전하게 저장하지 못해 선생님 확인이 필요합니다.',
  });
}

function createMessage(text: string): GoogleChatResponse {
  return {
    hostAppDataAction: {
      chatDataAction: {
        createMessageAction: {
          message: { text },
        },
      },
    },
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected AI tutor state: ${JSON.stringify(value)}`);
}
