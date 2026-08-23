import { buildReviewResult, type TutorProviderResult } from './contracts';
import type { GoogleChatAttachment } from '../google-chat/add-on';

export const CHAT_BOT_MEDIA_SCOPE = 'https://www.googleapis.com/auth/chat.bot';
export const RASTER_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type RasterImageMimeType = (typeof RASTER_IMAGE_MIME_TYPES)[number];
export type AiTutorMediaOutcomeCode =
  | 'missing_attachment'
  | 'multiple_attachments'
  | 'missing_attachment_data'
  | 'unsupported_mime'
  | 'missing_media_credentials'
  | 'download_failed'
  | 'download_too_large'
  | 'mime_magic_mismatch'
  | 'corrupt_image'
  | 'animated_image'
  | 'extreme_dimensions'
  | 'normalized_too_large'
  | 'storage_failed'
  | 'metadata_failed';

export type AiTutorMediaReviewOutcome = {
  readonly code: AiTutorMediaOutcomeCode;
  readonly reviewResult: TutorProviderResult;
};

export type ChatMediaTokenInput = { readonly scopes: readonly [typeof CHAT_BOT_MEDIA_SCOPE] };
export type ChatMediaTokenResult =
  | { readonly ok: true; readonly value: { readonly accessToken: string } }
  | { readonly ok: false; readonly error: { readonly code: 'missing_credentials' | 'unavailable' } };
export interface ChatMediaTokenPort {
  getAppAccessToken(input: ChatMediaTokenInput): Promise<ChatMediaTokenResult>;
}

export type ChatMediaDownloadInput = {
  readonly resourceName: string;
  readonly accessToken: string;
  readonly maxBytes: number;
};
export interface ChatMediaDownloadPort {
  downloadAttachment(input: ChatMediaDownloadInput): AsyncIterable<Uint8Array>;
}

export type DownloadedChatImage = {
  readonly resourceName: string;
  readonly declaredMimeType: RasterImageMimeType;
  readonly bytes: Uint8Array;
};

export type DownloadChatImageResult =
  | { readonly ok: true; readonly value: DownloadedChatImage }
  | { readonly ok: false; readonly outcome: AiTutorMediaReviewOutcome };

export type DownloadSingleChatImageInput = {
  readonly attachments: readonly GoogleChatAttachment[];
  readonly maxBytes: number;
  readonly tokenPort: ChatMediaTokenPort;
  readonly mediaPort: ChatMediaDownloadPort;
};

export async function downloadSingleChatImage(
  input: DownloadSingleChatImageInput,
): Promise<DownloadChatImageResult> {
  const attachmentCheck = singleAttachment(input.attachments);
  if (!attachmentCheck.ok) return { ok: false, outcome: mediaReviewOutcome(attachmentCheck.code) };

  const mimeType = parseRasterMimeType(attachmentCheck.attachment.contentType);
  if (mimeType === null) return { ok: false, outcome: mediaReviewOutcome('unsupported_mime') };

  const resourceName = attachmentCheck.attachment.attachmentDataRef.resourceName.trim();
  if (resourceName === '') return { ok: false, outcome: mediaReviewOutcome('missing_attachment_data') };

  const token = await input.tokenPort.getAppAccessToken({ scopes: [CHAT_BOT_MEDIA_SCOPE] });
  if (!token.ok || token.value.accessToken.trim() === '') {
    return { ok: false, outcome: mediaReviewOutcome('missing_media_credentials') };
  }

  try {
    const bytes = await collectBytes(
      input.mediaPort.downloadAttachment({
        resourceName,
        accessToken: token.value.accessToken,
        maxBytes: input.maxBytes,
      }),
      input.maxBytes,
    );
    return bytes.ok
      ? { ok: true, value: { resourceName, declaredMimeType: mimeType, bytes: bytes.value } }
      : { ok: false, outcome: mediaReviewOutcome(bytes.code) };
  } catch (error) {
    if (error instanceof Error) return { ok: false, outcome: mediaReviewOutcome('download_failed') };
    return { ok: false, outcome: mediaReviewOutcome('download_failed') };
  }
}

export function parseRasterMimeType(value: string | undefined): RasterImageMimeType | null {
  switch (value?.toLocaleLowerCase('en-US')) {
    case 'image/jpeg':
      return 'image/jpeg';
    case 'image/png':
      return 'image/png';
    case 'image/webp':
      return 'image/webp';
    default:
      return null;
  }
}

export function mediaReviewOutcome(code: AiTutorMediaOutcomeCode): AiTutorMediaReviewOutcome {
  return {
    code,
    reviewResult: buildReviewResult({
      reason: 'unsupported_attachment',
      errorType: 'unsupported_attachment',
      answerText: '이미지는 JPEG, PNG, WebP 한 장만 받을 수 있어요. 이 첨부는 선생님 확인이 필요합니다.',
    }),
  };
}

function singleAttachment(
  attachments: readonly GoogleChatAttachment[],
): { readonly ok: true; readonly attachment: GoogleChatAttachment } | { readonly ok: false; readonly code: AiTutorMediaOutcomeCode } {
  if (attachments.length === 0) return { ok: false, code: 'missing_attachment' };
  if (attachments.length > 1) return { ok: false, code: 'multiple_attachments' };
  const [attachment] = attachments;
  if (attachment === undefined) return { ok: false, code: 'missing_attachment' };
  return { ok: true, attachment };
}

async function collectBytes(
  stream: AsyncIterable<Uint8Array>,
  maxBytes: number,
): Promise<{ readonly ok: true; readonly value: Uint8Array } | { readonly ok: false; readonly code: 'download_too_large' }> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.byteLength;
    if (total > maxBytes) return { ok: false, code: 'download_too_large' };
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, value: bytes };
}
