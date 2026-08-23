import { z } from 'zod';

const ChatUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    displayName: z.string().min(1).optional(),
  })
  .loose();

const ChatSpaceSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().optional(),
  })
  .loose();

const ChatThreadSchema = z
  .object({
    name: z.string().min(1).optional(),
  })
  .loose();

const ChatAttachmentSchema = z
  .object({
    name: z.string().optional(),
    contentName: z.string().optional(),
    contentType: z.string().optional(),
    attachmentDataRef: z
      .object({
        resourceName: z.string(),
      })
      .loose(),
  })
  .loose();

const ChatMessageSchema = z
  .object({
    name: z.string().min(1).optional(),
    text: z.string().optional(),
    annotations: z.array(z.unknown()).optional(),
    attachment: z.array(ChatAttachmentSchema).optional(),
    attachments: z.array(ChatAttachmentSchema).optional(),
    space: ChatSpaceSchema.optional(),
    thread: ChatThreadSchema.optional(),
  })
  .loose();

const MessageEventSchema = z
  .object({
    chat: z
      .object({
        user: ChatUserSchema.optional(),
        messagePayload: z
          .object({
            message: ChatMessageSchema,
          })
          .loose(),
      })
      .loose(),
  })
  .loose();

const AddedToSpaceEventSchema = z
  .object({
    chat: z
      .object({
        user: ChatUserSchema.optional(),
        addedToSpacePayload: z
          .object({
            space: z.object({ name: z.string().min(1) }).loose(),
          })
          .loose(),
      })
      .loose(),
  })
  .loose();

const RemovedFromSpaceEventSchema = z
  .object({
    chat: z
      .object({
        removedFromSpacePayload: z
          .object({
            space: z.object({ name: z.string().min(1) }).loose(),
          })
          .loose(),
      })
      .loose(),
  })
  .loose();

export type GoogleChatEvent =
  | {
      readonly kind: 'message';
      readonly userName: string;
      readonly messageName: string;
      readonly space: {
        readonly name: string;
        readonly type: string;
        readonly channel: 'direct_message' | 'named_space';
      };
      readonly threadName?: string | null;
      readonly text: string;
      readonly annotations: readonly unknown[];
      readonly attachments: readonly GoogleChatAttachment[];
      readonly hasAttachment: boolean;
    }
  | {
      readonly kind: 'added_to_space';
      readonly displayName?: string;
    }
  | {
      readonly kind: 'removed_from_space';
      readonly space?: {
        readonly name: string;
        readonly channel: 'direct_message' | 'named_space';
      };
    };

export type GoogleChatAttachment = Readonly<{
  readonly name?: string;
  readonly contentName?: string;
  readonly contentType?: string;
  readonly attachmentDataRef: Readonly<{ readonly resourceName: string }>;
}>;

type CreateMessageResponse = {
  readonly hostAppDataAction: {
    readonly chatDataAction: {
      readonly createMessageAction: {
        readonly message: {
          readonly text: string;
        };
      };
    };
  };
};

export type GoogleChatResponse = CreateMessageResponse | Readonly<Record<string, never>>;

export class InvalidGoogleChatEventError extends Error {
  readonly name = 'InvalidGoogleChatEventError';

  constructor(readonly issueCount: number) {
    super(`Unsupported Google Chat event payload (${issueCount} schema issues)`);
  }
}

export function parseGoogleChatEvent(input: unknown): GoogleChatEvent {
  const messageEvent = MessageEventSchema.safeParse(input);
  if (messageEvent.success) {
    const message = messageEvent.data.chat.messagePayload.message;
    const attachments = message.attachments ?? message.attachment ?? [];
    const space = message.space ?? { name: 'spaces/unknown', type: 'DM' };
    return {
      kind: 'message',
      userName: messageEvent.data.chat.user?.name ?? 'users/unknown',
      messageName: message.name ?? 'spaces/unknown/messages/unknown',
      space: {
        name: space.name,
        type: space.type ?? 'DM',
        channel: space.type === 'ROOM' || space.type === 'SPACE' ? 'named_space' : 'direct_message',
      },
      threadName: message.thread?.name ?? null,
      text: message.text?.trim() ?? '',
      annotations: message.annotations ?? [],
      attachments,
      hasAttachment: attachments.length > 0,
    };
  }

  const addedToSpaceEvent = AddedToSpaceEventSchema.safeParse(input);
  if (addedToSpaceEvent.success) {
    const displayName = addedToSpaceEvent.data.chat.user?.displayName;
    return displayName
      ? { kind: 'added_to_space', displayName }
      : { kind: 'added_to_space' };
  }

  const removedFromSpaceEvent = RemovedFromSpaceEventSchema.safeParse(input);
  if (removedFromSpaceEvent.success) {
    return {
      kind: 'removed_from_space',
      space: {
        name: removedFromSpaceEvent.data.chat.removedFromSpacePayload.space.name,
        channel: 'named_space',
      },
    };
  }

  throw new InvalidGoogleChatEventError(
    messageEvent.error.issues.length +
      addedToSpaceEvent.error.issues.length +
      removedFromSpaceEvent.error.issues.length,
  );
}

function createMessage(text: string): CreateMessageResponse {
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
  throw new InvalidGoogleChatEventError(Object.keys(value).length);
}

export function handleGoogleChatEvent(event: GoogleChatEvent): GoogleChatResponse {
  switch (event.kind) {
    case 'message':
      return createMessage(
        event.hasAttachment && event.text.length === 0
          ? '연결 테스트 성공! 첨부파일을 정상적으로 받았어요.\n이미지 분석은 다음 단계에서 연결할게요.'
          : '연결 테스트 성공! 메시지를 정상적으로 받았어요.\n다음 단계에서 수학 AI 답변을 연결할게요.',
      );
    case 'added_to_space':
      return createMessage(
        '안녕하세요! Mathgo AI Tutor 테스트 버전입니다.\n수학 질문을 보내면 연결 상태를 확인해드려요.',
      );
    case 'removed_from_space':
      return {};
    default:
      return assertNever(event);
  }
}
