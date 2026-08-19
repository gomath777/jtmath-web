import assert from 'node:assert/strict';
import test from 'node:test';
import { handleGoogleChatEvent, InvalidGoogleChatEventError, parseGoogleChatEvent } from './add-on';

const stableDmPayload = {
  chat: {
    user: { name: 'users/student-1', displayName: '표시 이름은 식별자가 아님' },
    messagePayload: {
      message: {
        name: 'spaces/dm-1/messages/msg-1',
        text: '  <x> + 1 = 3 질문이 있어요  ',
        space: { name: 'spaces/dm-1', type: 'DM' },
      },
    },
  },
};

test('parseGoogleChatEvent preserves stable DM text metadata', () => {
  // Given
  const payload = stableDmPayload;

  // When
  const event = parseGoogleChatEvent(payload);

  // Then
  assert.equal(event.kind, 'message');
  assert.equal(event.userName, 'users/student-1');
  assert.equal(event.messageName, 'spaces/dm-1/messages/msg-1');
  assert.deepEqual(event.space, {
    name: 'spaces/dm-1',
    type: 'DM',
    channel: 'direct_message',
  });
  assert.equal(event.text, '<x> + 1 = 3 질문이 있어요');
  assert.deepEqual(event.annotations, []);
  assert.deepEqual(event.attachments, []);
  assert.equal(event.hasAttachment, false);
});

test('handleGoogleChatEvent returns a connection response when a user sends text', () => {
  // Given
  const event = parseGoogleChatEvent(stableDmPayload);

  // When
  const response = handleGoogleChatEvent(event);

  // Then
  assert.match(JSON.stringify(response), /연결 테스트 성공! 메시지/);
});

test('parseGoogleChatEvent trims a leading bot mention in a named space and retains mention metadata', () => {
  // Given
  const payload = {
    chat: {
      user: { name: 'users/student-2', displayName: '학생 표시 이름' },
      messagePayload: {
        message: {
          name: 'spaces/class-space/messages/msg-2',
          text: '<users/mathgo-bot> 2 < 3이면 부등식 방향은?',
          space: { name: 'spaces/class-space', type: 'SPACE' },
          thread: { name: 'spaces/class-space/threads/thread-1' },
          annotations: [
            {
              type: 'USER_MENTION',
              startIndex: 0,
              length: '<users/mathgo-bot>'.length,
              userMention: {
                user: { name: 'users/mathgo-bot' },
                type: 'MENTION',
              },
            },
          ],
        },
      },
    },
  };

  // When
  const event = parseGoogleChatEvent(payload);

  // Then
  assert.equal(event.kind, 'message');
  assert.equal(event.space.channel, 'named_space');
  assert.equal(event.threadName, 'spaces/class-space/threads/thread-1');
  assert.equal(event.text, '2 < 3이면 부등식 방향은?');
  assert.deepEqual(event.annotations, [
    {
      type: 'USER_MENTION',
      startIndex: 0,
      length: '<users/mathgo-bot>'.length,
      userMentionName: 'users/mathgo-bot',
      userMentionType: 'MENTION',
    },
  ]);
});

test('parseGoogleChatEvent retains one image attachment metadata', () => {
  // Given
  const payload = {
    chat: {
      user: { name: 'users/student-3' },
      messagePayload: {
        message: {
          name: 'spaces/dm-2/messages/msg-3',
          text: '',
          space: { name: 'spaces/dm-2', type: 'DM' },
          attachment: [
            {
              name: 'spaces/dm-2/messages/msg-3/attachments/image-1',
              contentName: 'question.png',
              contentType: 'image/png',
              attachmentDataRef: {
                resourceName: 'spaces/dm-2/messages/msg-3/attachments/image-1/data',
              },
            },
          ],
        },
      },
    },
  };

  // When
  const event = parseGoogleChatEvent(payload);

  // Then
  assert.equal(event.kind, 'message');
  assert.equal(event.hasAttachment, true);
  assert.deepEqual(event.attachments, [
    {
      name: 'spaces/dm-2/messages/msg-3/attachments/image-1',
      contentName: 'question.png',
      contentType: 'image/png',
      attachmentDataRef: { resourceName: 'spaces/dm-2/messages/msg-3/attachments/image-1/data' },
    },
  ]);
});

test('parseGoogleChatEvent retains multiple attachment metadata entries', () => {
  // Given
  const payload = {
    chat: {
      user: { name: 'users/student-4' },
      messagePayload: {
        message: {
          name: 'spaces/dm-3/messages/msg-4',
          space: { name: 'spaces/dm-3', type: 'DM' },
          attachment: [
            {
              contentName: 'first.jpg',
              contentType: 'image/jpeg',
              attachmentDataRef: { resourceName: 'attachments/first/data' },
            },
            {
              contentName: 'second.webp',
              contentType: 'image/webp',
              attachmentDataRef: { resourceName: 'attachments/second/data' },
            },
          ],
        },
      },
    },
  };

  // When
  const event = parseGoogleChatEvent(payload);

  // Then
  assert.equal(event.kind, 'message');
  assert.deepEqual(
    event.attachments.map((attachment) => attachment.attachmentDataRef.resourceName),
    ['attachments/first/data', 'attachments/second/data'],
  );
});

test('handleGoogleChatEvent welcomes a user when the app is added to a space', () => {
  // Given
  const event = parseGoogleChatEvent({
    chat: {
      user: { name: 'users/admin-1', displayName: '테스트 관리자' },
      addedToSpacePayload: {
        space: { name: 'spaces/test-space', type: 'GROUP_CHAT' },
      },
    },
  });

  // When
  const response = handleGoogleChatEvent(event);

  // Then
  assert.equal(event.kind, 'added_to_space');
  assert.equal(event.userName, 'users/admin-1');
  assert.equal(event.space.channel, 'group_space');
  assert.match(JSON.stringify(response), /Mathgo AI Tutor/);
});

test('handleGoogleChatEvent acknowledges removal without creating a message', () => {
  // Given
  const event = parseGoogleChatEvent({
    chat: {
      removedFromSpacePayload: {
        space: { name: 'spaces/test-space', type: 'SPACE' },
      },
    },
  });

  // When
  const response = handleGoogleChatEvent(event);

  // Then
  assert.equal(event.kind, 'removed_from_space');
  assert.deepEqual(event.space, {
    name: 'spaces/test-space',
    type: 'SPACE',
    channel: 'named_space',
  });
  assert.deepEqual(response, {});
});

test('parseGoogleChatEvent rejects message events without stable required IDs', () => {
  // Given
  const missingUser = { chat: { messagePayload: { message: { name: 'spaces/dm-4/messages/msg-5', space: { name: 'spaces/dm-4', type: 'DM' } } } } };
  const missingMessage = { chat: { user: { name: 'users/student-5' }, messagePayload: { message: { space: { name: 'spaces/dm-4', type: 'DM' } } } } };
  const missingSpace = { chat: { user: { name: 'users/student-5' }, messagePayload: { message: { name: 'spaces/dm-4/messages/msg-5' } } } };

  // When / Then
  assert.throws(() => parseGoogleChatEvent(missingUser), InvalidGoogleChatEventError);
  assert.throws(() => parseGoogleChatEvent(missingMessage), InvalidGoogleChatEventError);
  assert.throws(() => parseGoogleChatEvent(missingSpace), InvalidGoogleChatEventError);
});

test('parseGoogleChatEvent caps oversized text and arrays before orchestration', () => {
  // Given
  const payload = {
    chat: {
      user: { name: 'users/student-6' },
      messagePayload: {
        message: {
          name: 'spaces/dm-5/messages/msg-6',
          text: '가'.repeat(8_050),
          space: { name: 'spaces/dm-5', type: 'DM' },
          annotations: Array.from({ length: 21 }, () => ({ type: 'USER_MENTION' })),
          attachment: [
            {
              attachmentDataRef: { resourceName: 'attachments/oversized/data' },
            },
          ],
        },
      },
    },
  };

  // When
  const event = parseGoogleChatEvent(payload);

  // Then
  assert.equal(event.kind, 'message');
  assert.equal(event.text.length, 8_000);
  assert.equal(event.annotations.length, 20);
  assert.equal(event.attachments.length, 1);
});

test('parseGoogleChatEvent rejects an attachment without a resource name', () => {
  // Given
  const payload = {
    chat: {
      user: { name: 'users/student-7' },
      messagePayload: {
        message: {
          name: 'spaces/dm-6/messages/msg-7',
          space: { name: 'spaces/dm-6', type: 'DM' },
          attachment: [
            {
              contentName: 'question.png',
              contentType: 'image/png',
              attachmentDataRef: {},
            },
          ],
        },
      },
    },
  };

  // When / Then
  assert.throws(() => parseGoogleChatEvent(payload), InvalidGoogleChatEventError);
});

test('parseGoogleChatEvent rejects an unknown payload', () => {
  // Given
  const payload = { chat: {} };

  // When / Then
  assert.throws(() => parseGoogleChatEvent(payload), { name: 'InvalidGoogleChatEventError' });
});
