import assert from 'node:assert/strict';
import test from 'node:test';
import { handleGoogleChatEvent, parseGoogleChatEvent } from './add-on';

test('handleGoogleChatEvent returns a connection response when a user sends text', () => {
  // Given
  const event = parseGoogleChatEvent({
    chat: {
      user: { displayName: '테스트 관리자' },
      messagePayload: {
        message: { text: '이차방정식 질문이 있어요' },
      },
    },
  });

  // When
  const response = handleGoogleChatEvent(event);

  // Then
  assert.deepEqual(response, {
    hostAppDataAction: {
      chatDataAction: {
        createMessageAction: {
          message: {
            text: '연결 테스트 성공! 메시지를 정상적으로 받았어요.\n다음 단계에서 수학 AI 답변을 연결할게요.',
          },
        },
      },
    },
  });
});

test('handleGoogleChatEvent welcomes a user when the app is added to a space', () => {
  // Given
  const event = parseGoogleChatEvent({
    chat: {
      user: { displayName: '테스트 관리자' },
      addedToSpacePayload: {
        space: { name: 'spaces/test-space' },
      },
    },
  });

  // When
  const response = handleGoogleChatEvent(event);

  // Then
  assert.match(JSON.stringify(response), /Mathgo AI Tutor/);
});

test('handleGoogleChatEvent acknowledges removal without creating a message', () => {
  // Given
  const event = parseGoogleChatEvent({
    chat: {
      removedFromSpacePayload: {
        space: { name: 'spaces/test-space' },
      },
    },
  });

  // When
  const response = handleGoogleChatEvent(event);

  // Then
  assert.deepEqual(response, {});
});

test('parseGoogleChatEvent rejects an unknown payload', () => {
  // Given
  const payload = { chat: {} };

  // When / Then
  assert.throws(() => parseGoogleChatEvent(payload), { name: 'InvalidGoogleChatEventError' });
});
