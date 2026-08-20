import assert from 'node:assert/strict';
import test from 'node:test';
import type { GoogleChatAttachment } from '../google-chat/add-on';
import {
  CHAT_BOT_MEDIA_SCOPE,
  downloadSingleChatImage,
  type ChatMediaDownloadInput,
  type ChatMediaTokenInput,
} from './chat-media';

test('downloadSingleChatImage downloads one image by attachmentDataRef resource with chat.bot app auth', async () => {
  // Given
  const tokenCalls: ChatMediaTokenInput[] = [];
  const downloadCalls: ChatMediaDownloadInput[] = [];
  const bytes = new Uint8Array([1, 2, 3, 4]);

  // When
  const result = await downloadSingleChatImage({
    attachments: [imageAttachment('spaces/AAA/messages/BBB/attachments/CCC', 'image/png')],
    maxBytes: 8,
    tokenPort: {
      getAppAccessToken: async (input) => {
        tokenCalls.push(input);
        return { ok: true, value: { accessToken: 'app-token' } };
      },
    },
    mediaPort: {
      downloadAttachment: (input) => {
        downloadCalls.push(input);
        return chunks([bytes]);
      },
    },
  });

  // Then
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.declaredMimeType, 'image/png');
    assert.deepEqual(result.value.bytes, bytes);
  }
  assert.deepEqual(tokenCalls, [{ scopes: [CHAT_BOT_MEDIA_SCOPE] }]);
  assert.deepEqual(downloadCalls, [{
    accessToken: 'app-token',
    maxBytes: 8,
    resourceName: 'spaces/AAA/messages/BBB/attachments/CCC',
  }]);
  assert.equal(JSON.stringify(downloadCalls).includes('student-upload.png'), false);
});

test('downloadSingleChatImage rejects multiple attachments before auth or download', async () => {
  // Given
  let tokenCalls = 0;
  let downloadCalls = 0;

  // When
  const result = await downloadSingleChatImage({
    attachments: [
      imageAttachment('spaces/AAA/messages/BBB/attachments/1', 'image/jpeg'),
      imageAttachment('spaces/AAA/messages/BBB/attachments/2', 'image/png'),
    ],
    maxBytes: 8,
    tokenPort: { getAppAccessToken: async () => { tokenCalls += 1; return { ok: true, value: { accessToken: 'app-token' } }; } },
    mediaPort: { downloadAttachment: () => { downloadCalls += 1; return chunks([]); } },
  });

  // Then
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.outcome.code, 'multiple_attachments');
    assert.equal(result.outcome.reviewResult.errorType, 'unsupported_attachment');
    assert.equal(result.outcome.reviewResult.needsTeacherReview, true);
  }
  assert.equal(tokenCalls, 0);
  assert.equal(downloadCalls, 0);
});

test('downloadSingleChatImage rejects PDF, video, Drive, and missing media credentials without storage/model signals', async () => {
  // Given
  const pdf = imageAttachment('spaces/AAA/messages/BBB/attachments/PDF', 'application/pdf');
  const video = imageAttachment('spaces/AAA/messages/BBB/attachments/VIDEO', 'video/mp4');
  const drive = imageAttachment('spaces/AAA/messages/BBB/attachments/DRIVE', 'application/vnd.google-apps.document');
  const tokenPort = {
    getAppAccessToken: async () => ({ ok: false, error: { code: 'missing_credentials' as const } }),
  } satisfies { readonly getAppAccessToken: () => Promise<{ readonly ok: false; readonly error: { readonly code: 'missing_credentials' } }> };
  let downloadCalls = 0;

  // When
  const pdfResult = await downloadSingleChatImage({
    attachments: [pdf],
    maxBytes: 8,
    tokenPort,
    mediaPort: { downloadAttachment: () => { downloadCalls += 1; return chunks([]); } },
  });
  const videoResult = await downloadSingleChatImage({
    attachments: [video],
    maxBytes: 8,
    tokenPort,
    mediaPort: { downloadAttachment: () => { downloadCalls += 1; return chunks([]); } },
  });
  const driveResult = await downloadSingleChatImage({
    attachments: [drive],
    maxBytes: 8,
    tokenPort,
    mediaPort: { downloadAttachment: () => { downloadCalls += 1; return chunks([]); } },
  });
  const authResult = await downloadSingleChatImage({
    attachments: [imageAttachment('spaces/AAA/messages/BBB/attachments/IMG', 'image/webp')],
    maxBytes: 8,
    tokenPort,
    mediaPort: { downloadAttachment: () => { downloadCalls += 1; return chunks([]); } },
  });

  // Then
  assert.equal(pdfResult.ok, false);
  assert.equal(videoResult.ok, false);
  assert.equal(driveResult.ok, false);
  assert.equal(authResult.ok, false);
  if (!pdfResult.ok) assert.equal(pdfResult.outcome.code, 'unsupported_mime');
  if (!videoResult.ok) assert.equal(videoResult.outcome.code, 'unsupported_mime');
  if (!driveResult.ok) assert.equal(driveResult.outcome.code, 'unsupported_mime');
  if (!authResult.ok) assert.equal(authResult.outcome.code, 'missing_media_credentials');
  assert.equal(downloadCalls, 0);
});

test('downloadSingleChatImage rejects missing attachments and thrown download failures', async () => {
  // Given / When
  const missing = await downloadSingleChatImage({
    attachments: [],
    maxBytes: 8,
    tokenPort: { getAppAccessToken: async () => ({ ok: true, value: { accessToken: 'app-token' } }) },
    mediaPort: { downloadAttachment: () => chunks([]) },
  });
  const failed = await downloadSingleChatImage({
    attachments: [imageAttachment('spaces/AAA/messages/BBB/attachments/FAIL', 'image/png')],
    maxBytes: 8,
    tokenPort: { getAppAccessToken: async () => ({ ok: true, value: { accessToken: 'app-token' } }) },
    mediaPort: {
      downloadAttachment: () => {
        throw new ChatMediaTestDownloadError();
      },
    },
  });

  // Then
  assert.equal(missing.ok, false);
  assert.equal(failed.ok, false);
  if (!missing.ok) assert.equal(missing.outcome.code, 'missing_attachment');
  if (!failed.ok) assert.equal(failed.outcome.code, 'download_failed');
});

test('downloadSingleChatImage enforces the byte cap while streaming', async () => {
  // Given / When
  const result = await downloadSingleChatImage({
    attachments: [imageAttachment('spaces/AAA/messages/BBB/attachments/BIG', 'image/jpeg')],
    maxBytes: 3,
    tokenPort: { getAppAccessToken: async () => ({ ok: true, value: { accessToken: 'app-token' } }) },
    mediaPort: { downloadAttachment: () => chunks([new Uint8Array([1, 2]), new Uint8Array([3, 4])]) },
  });

  // Then
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.outcome.code, 'download_too_large');
    assert.equal(result.outcome.reviewResult.escalationReason, 'unsupported_attachment');
  }
});

function imageAttachment(resourceName: string, contentType: string): GoogleChatAttachment {
  return {
    contentName: 'student-upload.png',
    contentType,
    name: 'spaces/AAA/messages/BBB/attachments/display-name',
    attachmentDataRef: { resourceName },
  };
}

async function* chunks(values: readonly Uint8Array[]): AsyncIterable<Uint8Array> {
  for (const value of values) {
    yield value;
  }
}

class ChatMediaTestDownloadError extends Error {
  readonly name = 'ChatMediaTestDownloadError';
}
