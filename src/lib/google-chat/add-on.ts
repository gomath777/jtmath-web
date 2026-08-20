import { z } from 'zod';

const MAX_TEXT_LENGTH = 8_000;
const MAX_RESOURCE_NAME_LENGTH = 256;
const MAX_CONTENT_NAME_LENGTH = 180;
const MAX_CONTENT_TYPE_LENGTH = 100;
const MAX_ANNOTATIONS = 20;
const MAX_ATTACHMENTS = 8;

const SpaceChannel = {
  DirectMessage: 'direct_message',
  GroupSpace: 'group_space',
  NamedSpace: 'named_space',
} as const;

export type GoogleChatSpaceChannel = (typeof SpaceChannel)[keyof typeof SpaceChannel];

const cappedString = (maxLength: number) =>
  z.string().min(1).transform((value) => value.slice(0, maxLength));
const cappedArray = <Item extends z.ZodType>(schema: Item, maxLength: number) =>
  z.array(schema).transform((value) => value.slice(0, maxLength));

const ChatUserSchema = z.object({
  name: cappedString(MAX_RESOURCE_NAME_LENGTH).optional(),
  displayName: z.string().min(1).optional(),
}).loose();
const RequiredChatUserSchema = z.object({
  name: cappedString(MAX_RESOURCE_NAME_LENGTH),
}).loose();
const ChatSpaceSchema = z.object({
  name: cappedString(MAX_RESOURCE_NAME_LENGTH),
  type: cappedString(MAX_CONTENT_TYPE_LENGTH).optional(),
}).loose();
const ChatThreadSchema = z.object({ name: cappedString(MAX_RESOURCE_NAME_LENGTH) }).loose();
const ChatAnnotationSchema = z.object({
  type: cappedString(MAX_CONTENT_TYPE_LENGTH).optional(),
  startIndex: z.number().int().nonnegative().optional(),
  length: z.number().int().positive().optional(),
  userMention: z.object({
    user: z.object({
      name: cappedString(MAX_RESOURCE_NAME_LENGTH).optional(),
    }).loose().optional(),
    type: cappedString(MAX_CONTENT_TYPE_LENGTH).optional(),
  }).loose().optional(),
}).loose();
const ChatAttachmentSchema = z.object({
  name: cappedString(MAX_RESOURCE_NAME_LENGTH).optional(),
  contentName: cappedString(MAX_CONTENT_NAME_LENGTH).optional(),
  contentType: cappedString(MAX_CONTENT_TYPE_LENGTH).optional(),
  attachmentDataRef: z.object({
    resourceName: cappedString(MAX_RESOURCE_NAME_LENGTH),
  }).loose(),
}).loose();
const ChatMessageSchema = z.object({
  name: cappedString(MAX_RESOURCE_NAME_LENGTH),
  text: z.string().transform((value) => value.slice(0, MAX_TEXT_LENGTH)).optional(),
  space: ChatSpaceSchema,
  thread: ChatThreadSchema.optional(),
  annotations: cappedArray(ChatAnnotationSchema, MAX_ANNOTATIONS).optional(),
  attachment: cappedArray(ChatAttachmentSchema, MAX_ATTACHMENTS).optional(),
}).loose();

const MessageEventSchema = z
  .object({
    chat: z
      .object({
        user: RequiredChatUserSchema,
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
        addedToSpacePayload: z.object({ space: ChatSpaceSchema }).loose(),
      })
      .loose(),
  })
  .loose();

const RemovedFromSpaceEventSchema = z
  .object({
    chat: z
      .object({
        removedFromSpacePayload: z.object({ space: ChatSpaceSchema }).loose(),
      })
      .loose(),
  })
  .loose();

export type GoogleChatSpace = { readonly name: string; readonly type?: string; readonly channel: GoogleChatSpaceChannel };
export type GoogleChatAnnotation = { readonly type?: string; readonly startIndex?: number; readonly length?: number; readonly userMentionName?: string; readonly userMentionType?: string };
export type GoogleChatAttachment = { readonly name?: string; readonly contentName?: string; readonly contentType?: string; readonly attachmentDataRef: { readonly resourceName: string } };

export type GoogleChatEvent =
  | {
      readonly kind: 'message';
      readonly userName: string;
      readonly messageName: string;
      readonly space: GoogleChatSpace;
      readonly threadName?: string;
      readonly text: string;
      readonly annotations: readonly GoogleChatAnnotation[];
      readonly attachments: readonly GoogleChatAttachment[];
      readonly hasAttachment: boolean;
    }
  | {
      readonly kind: 'added_to_space';
      readonly userName?: string;
      readonly displayName?: string;
      readonly space: GoogleChatSpace;
    }
  | {
      readonly kind: 'removed_from_space';
      readonly space: GoogleChatSpace;
    };

type CreateMessageResponse = { readonly hostAppDataAction: { readonly chatDataAction: { readonly createMessageAction: { readonly message: { readonly text: string } } } } };

export type GoogleChatResponse = CreateMessageResponse | Readonly<Record<string, never>>;

export class InvalidGoogleChatEventError extends Error {
  readonly name = 'InvalidGoogleChatEventError';

  constructor(readonly issueCount: number) {
    super(`Unsupported Google Chat event payload (${issueCount} schema issues)`);
  }
}

function normalizeSpaceChannel(type: string | undefined): GoogleChatSpaceChannel {
  switch (type) {
    case 'DM':
    case 'DIRECT_MESSAGE':
      return SpaceChannel.DirectMessage;
    case 'GROUP_CHAT':
    case 'GROUP_SPACE':
      return SpaceChannel.GroupSpace;
    default:
      return SpaceChannel.NamedSpace;
  }
}

function toSpace(space: z.infer<typeof ChatSpaceSchema>): GoogleChatSpace {
  const channel = normalizeSpaceChannel(space.type);
  return space.type ? { name: space.name, type: space.type, channel } : { name: space.name, channel };
}

function toAnnotations(
  annotations: readonly z.infer<typeof ChatAnnotationSchema>[] | undefined,
): readonly GoogleChatAnnotation[] {
  return (annotations ?? []).map((annotation) => ({
    ...(annotation.type ? { type: annotation.type } : {}),
    ...(annotation.startIndex !== undefined ? { startIndex: annotation.startIndex } : {}),
    ...(annotation.length !== undefined ? { length: annotation.length } : {}),
    ...(annotation.userMention?.user?.name
      ? { userMentionName: annotation.userMention.user.name }
      : {}),
    ...(annotation.userMention?.type ? { userMentionType: annotation.userMention.type } : {}),
  }));
}

function toAttachments(
  attachments: readonly z.infer<typeof ChatAttachmentSchema>[] | undefined,
): readonly GoogleChatAttachment[] {
  return (attachments ?? []).map((attachment) => ({
    ...(attachment.name ? { name: attachment.name } : {}),
    ...(attachment.contentName ? { contentName: attachment.contentName } : {}),
    ...(attachment.contentType ? { contentType: attachment.contentType } : {}),
    attachmentDataRef: { resourceName: attachment.attachmentDataRef.resourceName },
  }));
}

function trimLeadingMention(text: string, annotations: readonly GoogleChatAnnotation[]): string {
  const leadingMention = annotations.find(
    (annotation) =>
      annotation.startIndex === 0 &&
      annotation.length !== undefined &&
      (annotation.type === 'USER_MENTION' || annotation.userMentionName !== undefined),
  );
  if (leadingMention?.length !== undefined) return text.slice(leadingMention.length).trim();

  return text.replace(/^<users\/[^>\s]+>\s*/, '').trim();
}

export function parseGoogleChatEvent(input: unknown): GoogleChatEvent {
  const messageEvent = MessageEventSchema.safeParse(input);
  if (messageEvent.success) {
    const message = messageEvent.data.chat.messagePayload.message;
    const annotations = toAnnotations(message.annotations);
    const attachments = toAttachments(message.attachment);
    const threadName = message.thread?.name;
    return {
      kind: 'message',
      userName: messageEvent.data.chat.user.name,
      messageName: message.name,
      space: toSpace(message.space),
      ...(threadName ? { threadName } : {}),
      text: trimLeadingMention(message.text ?? '', annotations),
      annotations,
      attachments,
      hasAttachment: attachments.length > 0,
    };
  }

  const addedToSpaceEvent = AddedToSpaceEventSchema.safeParse(input);
  if (addedToSpaceEvent.success) {
    const userName = addedToSpaceEvent.data.chat.user?.name;
    const displayName = addedToSpaceEvent.data.chat.user?.displayName;
    return {
      kind: 'added_to_space',
      ...(userName ? { userName } : {}),
      ...(displayName ? { displayName } : {}),
      space: toSpace(addedToSpaceEvent.data.chat.addedToSpacePayload.space),
    };
  }

  const removedFromSpaceEvent = RemovedFromSpaceEventSchema.safeParse(input);
  if (removedFromSpaceEvent.success) {
    return {
      kind: 'removed_from_space',
      space: toSpace(removedFromSpaceEvent.data.chat.removedFromSpacePayload.space),
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
