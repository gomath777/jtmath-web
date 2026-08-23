import {
  type TutorContext,
  type TutorDocumentInput,
  type TutorImageInput,
  type TutorTextInput,
} from './contracts';

export function buildTutorTextInput(messageText = '레벨1 2번 힌트 줘'): TutorTextInput {
  return { kind: 'text', messageText };
}

export function buildTutorContext(): TutorContext {
  return {
    gradeLabel: '고2',
    releasedCurriculum: [
      {
        subjectSlug: 'ds',
        conceptTags: ['trigonometry'],
        title: '삼각함수',
        summary: '삼각함수 레벨1 문제 풀이',
      },
    ],
    recentTurns: [],
    repeatedConceptSignal: false,
  };
}

export function buildTutorImage(): TutorImageInput {
  return {
    mimeType: 'image/jpeg',
    bytes: new Uint8Array([1, 2, 3]),
    sha256Hex: 'a'.repeat(64),
  };
}

export function buildTutorDocument(): TutorDocumentInput {
  return {
    mimeType: 'application/pdf',
    bytes: new Uint8Array([37, 80, 68, 70, 45]),
    sha256Hex: 'c'.repeat(64),
  };
}
