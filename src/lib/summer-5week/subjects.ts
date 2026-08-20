export const SUMMER_SUBJECTS = ['gs1', 'gs2', 'ds', 'mj1', 'gh'] as const;

export type SummerSubject = (typeof SUMMER_SUBJECTS)[number];

export type SubjectInfo = {
  readonly slug: SummerSubject;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
};

export const SUMMER_SUBJECT_INFO: Record<SummerSubject, SubjectInfo> = {
  gs1: {
    slug: 'gs1',
    label: '공통수학1',
    shortLabel: '공수1',
    description: '개념노트와 영상으로 5주 핵심 단원을 정리합니다.',
  },
  gs2: {
    slug: 'gs2',
    label: '공통수학2',
    shortLabel: '공수2',
    description: '리뉴얼 자료 준비 상태에 맞춰 공개됩니다.',
  },
  ds: {
    slug: 'ds',
    label: '대수',
    shortLabel: '대수',
    description: '함수와 수열 개념을 일정에 맞춰 복습합니다.',
  },
  mj1: {
    slug: 'mj1',
    label: '미적분 I',
    shortLabel: '미적1',
    description: '극한부터 적분 활용까지 순서대로 진행합니다.',
  },
  gh: {
    slug: 'gh',
    label: '기하',
    shortLabel: '기하',
    description: '촬영 및 업로드 준비 상태에 맞춰 공개됩니다.',
  },
};

const SUMMER_SUBJECT_SET: ReadonlySet<string> = new Set(SUMMER_SUBJECTS);

export function isSummerSubject(value: string): value is SummerSubject {
  return SUMMER_SUBJECT_SET.has(value);
}

export function sortSubjects(subjects: readonly SummerSubject[]): readonly SummerSubject[] {
  return SUMMER_SUBJECTS.filter((subject) => subjects.includes(subject));
}

export function allSubjects(): readonly SummerSubject[] {
  return SUMMER_SUBJECTS;
}
