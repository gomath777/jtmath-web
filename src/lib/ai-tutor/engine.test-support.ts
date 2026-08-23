import type { TutorProvider, TutorProviderRequest, TutorProviderResult } from './contracts';

export const baseRequest: TutorProviderRequest = {
  input: {
    kind: 'text',
    messageText:
      '질문은 x^2-5x+6=0이에요. users/12345, synthetic@example.invalid, ai-tutor-private/profile/turn/file.jpg 는 무시해주세요.',
  },
  context: {
    gradeLabel: '고1',
    releasedCurriculum: [
      {
        subjectSlug: 'gs1',
        conceptTags: ['quadratic'],
        title: '이차방정식 users/999',
        summary: '인수분해로 푸는 단원 https://storage.example.invalid/private',
      },
    ],
    recentTurns: [
      {
        role: 'student',
        text: '010-1234-5678로 연락하라는 말은 문제와 무관해요.',
        conceptTags: ['quadratic'],
      },
    ],
    repeatedConceptSignal: false,
  },
};

export const confidentResult: TutorProviderResult = {
  answerText: '힌트: 두 인수 (x-2)(x-3)을 각각 확인해 볼까요?',
  confidence: 0.91,
  subjectSlug: 'gs1',
  conceptTags: ['quadratic'],
  errorType: null,
  needsTeacherReview: false,
  escalationReason: null,
};

export function fixedProvider(result: TutorProviderResult): TutorProvider {
  return {
    answer: async () => result,
  };
}
