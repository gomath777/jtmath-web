import { randomUUID } from 'node:crypto';
import type { WebTutorEngineMetadata } from './web-tutor-engine';
import type { WebTutorMode, WebTutorTarget } from './web-input';
import type { WebTutorServerContinuity } from './web-conversation-continuity';
import { loadWebTutorServerContinuity } from './web-conversation-continuity';
import type { WebConversation, WebConversationRepository, WebTurn } from './web-conversation-repository';
import { responseProviderMetadata } from './web-handler-responses';
import type { WebLessonAssignment } from './web-lesson-context';

export type WebTutorServerContinuityPort = {
  load(input: {
    readonly profileId: string;
    readonly lessonSlug: string;
    readonly contextKey: string;
  }): Promise<WebTutorServerContinuity>;
};

export async function loadServerContinuity(input: {
  readonly port: WebTutorServerContinuityPort | undefined;
  readonly repository: WebConversationRepository | undefined;
  readonly profileId: string;
  readonly assignmentId: string;
  readonly lessonSlug: string;
  readonly contextKey: string;
  readonly now: Date;
}): Promise<
  | { readonly kind: 'ok'; readonly continuity: WebTutorServerContinuity; readonly conversation?: WebConversation }
  | { readonly kind: 'unavailable' }
> {
  if (input.repository !== undefined) {
    const conversation = await input.repository.upsertConversation({
      profileId: input.profileId,
      assignmentId: input.assignmentId,
      contextKey: input.contextKey,
      activeMaterialKey: null,
      activeProblemKey: null,
      activeStage: null,
      seenAt: input.now.toISOString(),
    });
    if (!conversation.ok) return { kind: 'unavailable' };
    const continuity = await loadWebTutorServerContinuity({
      repository: input.repository,
      profileId: input.profileId,
      assignmentId: input.assignmentId,
      conversation: conversation.value,
    });
    return continuity.kind === 'ok'
      ? { kind: 'ok', continuity: continuity.continuity, conversation: conversation.value }
      : { kind: 'unavailable' };
  }
  if (input.port === undefined) return { kind: 'ok', continuity: { recentTurns: [] } };
  try {
    return {
      kind: 'ok',
      continuity: await input.port.load({
        profileId: input.profileId,
        lessonSlug: input.lessonSlug,
        contextKey: input.contextKey,
      }),
    };
  } catch (error) {
    if (error instanceof Error) return { kind: 'unavailable' };
    throw error;
  }
}

export type PersistentTurnClaim =
  | { readonly kind: 'disabled' }
  | { readonly kind: 'claimed'; readonly turn: WebTurn }
  | { readonly kind: 'duplicate_completed'; readonly turn: WebTurn }
  | { readonly kind: 'duplicate_processing'; readonly turn: WebTurn }
  | { readonly kind: 'unavailable' };

export async function claimPersistentTurn(input: Readonly<{
  readonly repository: WebConversationRepository | undefined;
  readonly request: Request;
  readonly requestIdFactory: (() => string) | undefined;
  readonly profileId: string;
  readonly assignment: WebLessonAssignment;
  readonly conversation: WebConversation | undefined;
  readonly target: WebTutorTarget;
  readonly mode: WebTutorMode;
  readonly message: string;
  readonly now: Date;
}>): Promise<PersistentTurnClaim> {
  if (input.repository === undefined || input.conversation === undefined) return { kind: 'disabled' };
  const conversation = await input.repository.upsertConversation({
    profileId: input.profileId,
    assignmentId: input.assignment.id,
    contextKey: input.target.contextKey,
    activeMaterialKey: input.target.materialKey,
    activeProblemKey: `problem:${input.target.problemNumber}`,
    activeStage: input.mode,
    seenAt: input.now.toISOString(),
  });
  if (!conversation.ok) return { kind: 'unavailable' };
  const claim = await input.repository.claimRequest({
    profileId: input.profileId,
    assignmentId: input.assignment.id,
    conversationId: conversation.value.id,
    requestId: requestId(input),
    questionText: input.message,
    targetMaterialKey: input.target.materialKey,
    targetProblemKey: `problem:${input.target.problemNumber}`,
    targetStage: input.mode,
    mode: toStoredMode(input.mode),
    receivedAt: input.now.toISOString(),
  });
  if (!claim.ok) return { kind: 'unavailable' };
  if (claim.value.kind === 'claimed') return { kind: 'claimed', turn: claim.value.turn };
  return claim.value.turn.status === 'completed' && claim.value.turn.answerText !== null
    ? { kind: 'duplicate_completed', turn: claim.value.turn }
    : { kind: 'duplicate_processing', turn: claim.value.turn };
}

export async function markPersistentCompleted(input: Readonly<{
  readonly repository: WebConversationRepository | undefined;
  readonly persistence: PersistentTurnClaim;
  readonly profileId: string;
  readonly assignmentId: string;
  readonly answerText: string;
  readonly metadata: WebTutorEngineMetadata;
  readonly now: Date;
}>): Promise<boolean> {
  if (input.repository === undefined || input.persistence.kind !== 'claimed') return true;
  const provider = responseProviderMetadata(input.metadata);
  const completed = await input.repository.markCompleted({
    profileId: input.profileId,
    assignmentId: input.assignmentId,
    turnId: input.persistence.turn.id,
    answerText: input.answerText,
    provider: provider.modelAlias === 'none' ? 'none' : 'gemini',
    modelAlias: provider.modelAlias,
    promptVersion: 'web-tutor-v1',
    inputTokens: provider.tokenCounts.input,
    outputTokens: provider.tokenCounts.output,
    totalTokens: provider.tokenCounts.total,
    latencyMs: provider.latencyMs ?? 0,
    completedAt: input.now.toISOString(),
  });
  return completed.ok;
}

export async function markPersistentFailure(input: Readonly<{
  readonly repository: WebConversationRepository | undefined;
  readonly persistence: PersistentTurnClaim;
  readonly profileId: string;
  readonly assignmentId: string;
  readonly answerText: string;
  readonly errorCategory: string;
  readonly now: Date;
}>): Promise<void> {
  if (input.repository === undefined || input.persistence.kind !== 'claimed') return;
  await input.repository.markFailed({
    profileId: input.profileId,
    assignmentId: input.assignmentId,
    turnId: input.persistence.turn.id,
    answerText: input.answerText,
    errorCategory: input.errorCategory,
    completedAt: input.now.toISOString(),
  });
}

function toStoredMode(mode: WebTutorMode): 'hint' | 'start' | 'decisive' | 'solution' {
  switch (mode) {
    case 'hint':
    case 'start':
    case 'solution':
      return mode;
    case 'decisive_hint':
      return 'decisive';
    default:
      return assertNever(mode);
  }
}

function requestId(input: Readonly<{ readonly request: Request; readonly requestIdFactory: (() => string) | undefined }>): string {
  return input.request.headers.get('x-ai-tutor-request-id') ?? input.requestIdFactory?.() ?? randomUUID();
}

function assertNever(value: never): never {
  throw new Error(`Unexpected web tutor persistence state: ${String(value)}`);
}
