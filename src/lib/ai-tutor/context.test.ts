import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveTutorContext,
  serializeTutorContextForProvider,
  type AiTutorContextSource,
  type AiTutorSourceResult,
  type SourceCurriculumItem,
  type SourceTutorTurn,
} from './context';

const now = new Date('2026-08-19T03:00:00.000Z');

const caps = {
  recentTurnCount: 4,
  recentTurnCharacters: 24,
  recentTotalCharacters: 70,
} as const;

function ok<T>(data: T): AiTutorSourceResult<T> {
  return { kind: 'ok', data };
}

function makeSource(input: {
  readonly grade?: AiTutorSourceResult<number | null>;
  readonly lessons?: AiTutorSourceResult<readonly SourceCurriculumItem[]>;
  readonly concepts?: AiTutorSourceResult<readonly SourceCurriculumItem[]>;
  readonly turns?: AiTutorSourceResult<readonly SourceTutorTurn[]>;
}): AiTutorContextSource {
  return {
    loadProfileGrade: async () => input.grade ?? ok(2),
    loadReleasedLessonItems: async () => input.lessons ?? ok([]),
    loadPublishedConceptItems: async () => input.concepts ?? ok([]),
    loadRecentCompletedTutorTurns: async () => input.turns ?? ok([]),
  };
}

test('resolveTutorContext orders curriculum by recency and dedupes labels and concept tags', async () => {
  // Given
  const lessonItems: readonly SourceCurriculumItem[] = [
    {
      source: 'lesson',
      subjectSlug: 'gs1',
      label: '이차방정식',
      summary: '인수분해로 푸는 방법',
      conceptTags: [' Quadratic ', 'quadratic', '인수분해'],
      occurredAt: '2026-08-14T00:00:00.000Z',
      portalSlug: 'forbidden-slug',
    },
    {
      source: 'lesson',
      subjectSlug: 'gs1',
      label: '이차방정식',
      summary: '중복 라벨은 제외',
      conceptTags: ['duplicate'],
      occurredAt: '2026-08-13T00:00:00.000Z',
    },
  ];
  const conceptItems: readonly SourceCurriculumItem[] = [
    {
      source: 'concept',
      subjectSlug: 'ds2',
      label: '등차수열의 합',
      summary: '개념강의',
      conceptTags: ['Sequence', 'sequence', '합'],
      occurredAt: '2026-08-18T00:00:00.000Z',
      pdf_url: 'https://example.test/private.pdf',
    },
  ];

  // When
  const result = await resolveTutorContext({
    profileId: 'profile-1',
    source: makeSource({ lessons: ok(lessonItems), concepts: ok(conceptItems) }),
    caps,
    now,
  });

  // Then
  assert.equal(result.kind, 'resolved');
  assert.equal(result.context.gradeLabel, '고2');
  assert.deepEqual(
    result.context.releasedCurriculum.map((item) => item.title),
    ['등차수열의 합', '이차방정식'],
  );
  assert.deepEqual(result.context.releasedCurriculum[0]?.conceptTags, ['sequence', '합']);
  assert.deepEqual(result.context.releasedCurriculum[1]?.conceptTags, ['quadratic', '인수분해']);
});

test('resolveTutorContext caps recent turns and detects repeated concept across three completed turns in thirty days', async () => {
  // Given
  const turns: readonly SourceTutorTurn[] = [
    {
      receivedAt: '2026-08-18T02:00:00.000Z',
      questionText: 'https://student.example/slug 을 보고 이차방정식 질문입니다. 너무 긴 문장입니다.',
      answerText: '첫 단계는 좌변을 정리하는 것입니다.',
      conceptTags: [' Quadratic ', 'quadratic'],
    },
    {
      receivedAt: '2026-08-17T02:00:00.000Z',
      questionText: '두 번째 이차방정식 질문',
      answerText: '인수분해 가능성을 먼저 확인해요.',
      conceptTags: ['quadratic'],
    },
    {
      receivedAt: '2026-08-16T02:00:00.000Z',
      questionText: '세 번째 이차방정식 질문',
      answerText: '상수항의 곱을 확인해요.',
      conceptTags: ['QUADRATIC'],
    },
    {
      receivedAt: '2026-07-10T02:00:00.000Z',
      questionText: '오래된 질문',
      answerText: '30일 밖입니다.',
      conceptTags: ['quadratic'],
    },
  ];

  // When
  const result = await resolveTutorContext({
    profileId: 'profile-1',
    source: makeSource({ turns: ok(turns) }),
    caps,
    now,
  });

  // Then
  assert.equal(result.kind, 'resolved');
  assert.equal(result.context.repeatedConceptSignal, true);
  assert.equal(result.context.recentTurns.length, 4);
  assert.deepEqual(
    result.context.recentTurns.map((turn) => turn.role),
    ['student', 'tutor', 'student', 'tutor'],
  );
  assert.ok(result.context.recentTurns.every((turn) => turn.text.length <= caps.recentTurnCharacters));
  assert.ok(result.context.recentTurns.reduce((sum, turn) => sum + turn.text.length, 0) <= caps.recentTotalCharacters);
  assert.equal(serializeTutorContextForProvider(result.context).includes('https://student.example'), false);
});

test('resolveTutorContext returns redacted no-context result when any source reports missing schema', async () => {
  // Given
  const source = makeSource({
    lessons: { kind: 'schema_missing', table: 'student_lesson_assignments' },
  });

  // When
  const result = await resolveTutorContext({
    profileId: 'profile-1',
    source,
    caps,
    now,
  });

  // Then
  assert.equal(result.kind, 'no_context');
  assert.deepEqual(result.context, {
    gradeLabel: '학년 미확인',
    releasedCurriculum: [],
    recentTurns: [],
    repeatedConceptSignal: false,
  });
  assert.equal(JSON.stringify(result).includes('profile-1'), false);
});

test('serializeTutorContextForProvider excludes prohibited source fields and URLs', async () => {
  // Given
  const result = await resolveTutorContext({
    profileId: 'profile-1',
    source: makeSource({
      lessons: ok([
        {
          source: 'lesson',
          subjectSlug: 'gs1',
          label: '함수',
          summary: 'https://materials.example/pdf 를 보라는 원문은 제거',
          conceptTags: ['function'],
          occurredAt: '2026-08-18T00:00:00.000Z',
          name: 'forbidden-name-field',
          school: 'forbidden-school-field',
          email: 'student@example.test',
        },
      ]),
    }),
    caps,
    now,
  });

  // When
  const serialized = serializeTutorContextForProvider(result.context);

  // Then
  assert.equal(serialized.includes('forbidden-name-field'), false);
  assert.equal(serialized.includes('forbidden-school-field'), false);
  assert.equal(serialized.includes('student@example.test'), false);
  assert.equal(serialized.includes('https://materials.example'), false);
  assert.equal(serialized.includes('portalSlug'), false);
});
