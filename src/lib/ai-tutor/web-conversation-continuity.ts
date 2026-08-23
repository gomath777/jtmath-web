import type {
  WebConversation,
  WebConversationRepository,
  WebRecentTurn,
} from './web-conversation-repository';

const maxRecentTurns = 6;

export type WebTutorServerTarget = {
  readonly contextKey: string;
  readonly materialKey: string;
  readonly problemNumber: number;
};

export type WebTutorServerContinuity = {
  readonly activeTarget?: WebTutorServerTarget;
  readonly recentTurns: readonly { readonly role: 'student' | 'tutor'; readonly text: string }[];
};

export type WebTutorContinuityRepository = Pick<WebConversationRepository, 'readRecentTurns'>;

export type LoadWebTutorServerContinuityInput = {
  readonly repository: WebTutorContinuityRepository;
  readonly profileId: string;
  readonly assignmentId: string;
  readonly conversation: WebConversation;
};

export type LoadWebTutorServerContinuityResult =
  | { readonly kind: 'ok'; readonly continuity: WebTutorServerContinuity }
  | { readonly kind: 'invalid_active_target' }
  | { readonly kind: 'unavailable' };

export async function loadWebTutorServerContinuity(
  input: LoadWebTutorServerContinuityInput,
): Promise<LoadWebTutorServerContinuityResult> {
  if (
    input.conversation.profileId !== input.profileId
    || input.conversation.assignmentId !== input.assignmentId
  ) {
    return { kind: 'invalid_active_target' };
  }
  const activeTarget = toActiveTarget(input.conversation);
  if (activeTarget.kind === 'invalid') return { kind: 'invalid_active_target' };
  const recent = await input.repository.readRecentTurns({
    profileId: input.profileId,
    assignmentId: input.assignmentId,
    conversationId: input.conversation.id,
      limit: maxRecentTurns,
  });
  if (!recent.ok) return { kind: 'unavailable' };
  return {
    kind: 'ok',
    continuity: {
      ...(activeTarget.target === undefined ? {} : { activeTarget: activeTarget.target }),
      recentTurns: toPromptTurns(recent.value),
    },
  };
}

function toActiveTarget(
  conversation: WebConversation,
): { readonly kind: 'ok'; readonly target?: WebTutorServerTarget } | { readonly kind: 'invalid' } {
  if (conversation.activeMaterialKey === null && conversation.activeProblemKey === null) {
    return { kind: 'ok' };
  }
  if (conversation.activeMaterialKey === null || conversation.activeProblemKey === null) {
    return { kind: 'invalid' };
  }
  const match = /^problem:([1-9][0-9]{0,2})$/u.exec(conversation.activeProblemKey);
  if (match === null) return { kind: 'invalid' };
  const problemNumber = Number(match[1]);
  if (!Number.isSafeInteger(problemNumber) || problemNumber > 999) return { kind: 'invalid' };
  return {
    kind: 'ok',
    target: {
      contextKey: conversation.contextKey,
      materialKey: conversation.activeMaterialKey,
      problemNumber,
    },
  };
}

function toPromptTurns(
  turns: readonly WebRecentTurn[],
): readonly { readonly role: 'student' | 'tutor'; readonly text: string }[] {
  return turns.slice(-maxRecentTurns).map(({ role, text }) => ({ role, text }));
}
