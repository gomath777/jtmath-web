export type PortalBasePath = '/s' | '/c';

export type PortalUrlInput = {
  readonly siteUrl: string;
  readonly portalBasePath: PortalBasePath;
  readonly portalSlug: string;
};

export type LearningUpdateTemplateInput = PortalUrlInput & {
  readonly lessonLine: string;
  readonly dateLabel: string;
  readonly closingLine?: string;
};

export type BlockProgressTemplateInput = PortalUrlInput & {
  readonly slotLabel?: string;
  readonly weekdayPair?: string;
  readonly closingLine?: string;
};

export type CurriculumNoticeTemplateInput = PortalUrlInput & {
  readonly recipientLabel: string;
  readonly curriculumTitle?: string;
  readonly closingLine?: string;
};

export type CustomMessageInput = {
  readonly body: string;
};

export class KakaoTemplateError extends Error {
  readonly name = 'KakaoTemplateError';

  constructor(
    readonly code:
      | 'empty_custom_body'
      | 'empty_date_label'
      | 'empty_lesson_line'
      | 'empty_portal_slug'
      | 'empty_recipient_label'
      | 'empty_site_url',
    message: string,
  ) {
    super(message);
  }
}

export function buildPortalUrl(input: PortalUrlInput): string {
  const siteUrl = cleanRequired(input.siteUrl, 'empty_site_url', 'site url');
  const portalSlug = cleanRequired(input.portalSlug, 'empty_portal_slug', 'portal slug');
  return `${siteUrl.replace(/\/+$/, '')}${input.portalBasePath}/${portalSlug.replace(/^\/+/, '')}`;
}

export function buildLearningUpdateMessage(input: LearningUpdateTemplateInput): string {
  const lessonLine = cleanRequired(input.lessonLine, 'empty_lesson_line', 'lesson line');
  const dateLabel = cleanRequired(input.dateLabel, 'empty_date_label', 'date label');
  const closingLine = cleanOptional(input.closingLine) ?? '문제 풀고 앱에 답안 제출 후 카톡 주세요~';

  return [
    '[고T수학] 학습 업데이트',
    '',
    lessonLine,
    '',
    `📅 ${dateLabel}`,
    `📖 학습 페이지: ${buildPortalUrl(input)}`,
    '',
    closingLine,
  ].join('\n');
}

export function buildBlockProgressUpdateMessage(input: BlockProgressTemplateInput): string {
  const slotLabel = cleanOptional(input.slotLabel);
  const weekdayPair = cleanOptional(input.weekdayPair);
  const progressLine = slotLabel !== undefined && weekdayPair !== undefined
    ? `${slotLabel} ${weekdayPair} 진도 업데이트되었습니다.`
    : '진도 업데이트되었습니다.';
  const closingLine = cleanOptional(input.closingLine) ?? '문제 풀고 앱에 답안 제출 후 카톡주세요!';

  return [
    `학습 페이지: ${buildPortalUrl(input)}`,
    progressLine,
    closingLine,
  ].join('\n');
}

export function buildStudentCurriculumNoticeMessage(input: CurriculumNoticeTemplateInput): string {
  const recipientLabel = cleanRequired(input.recipientLabel, 'empty_recipient_label', 'recipient label');
  const curriculumTitle = cleanOptional(input.curriculumTitle);
  const closingLine = cleanOptional(input.closingLine) ?? '문제 풀고 매쓰플랫에서 답안 제출 후 카톡 주세요~';

  return [
    `[고T수학] ${recipientLabel}님`,
    '',
    `학습 페이지: ${buildPortalUrl(input)}`,
    '',
    curriculumTitle !== undefined ? `이번 ${curriculumTitle} 학습이 올라왔습니다!` : '',
    '',
    closingLine,
  ].filter((line) => line.length > 0).join('\n');
}

export function buildCustomMessageBody(input: CustomMessageInput): string {
  return cleanRequired(input.body, 'empty_custom_body', 'custom message body');
}

function cleanRequired(
  value: string,
  code: KakaoTemplateError['code'],
  label: string,
): string {
  const cleaned = value.trim();
  if (cleaned.length === 0) throw new KakaoTemplateError(code, `${label} is required`);
  return cleaned;
}

function cleanOptional(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned === undefined || cleaned.length === 0 ? undefined : cleaned;
}
