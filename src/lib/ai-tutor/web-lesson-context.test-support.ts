import type {
  WebLessonContextQueryPort,
  WebLessonSessionBlock,
} from './web-lesson-context';

export const now = new Date('2026-08-21T03:00:00.000Z');

export const baseIdentity = {
  profileId: 'profile-synthetic',
  slug: 'jt-synth',
  isMaster: false,
} as const;

export const lesson = {
  id: 'item-trig',
  publicSlug: 'ds2-trig',
  title: '삼각함수',
  label: null,
  curricula: { subjectSlug: 'ds2', title: '대수' },
} as const;

export const activeToken = {
  id: 'token-synthetic',
  profileId: baseIdentity.profileId,
  slug: baseIdentity.slug,
  isActive: true,
  portalExpiresAt: null,
} as const;

export const releasedAssignment = {
  id: 'sla-released',
  curriculumItemId: lesson.id,
  profileId: baseIdentity.profileId,
  status: 'released',
  scheduledDate: '2026-08-20',
  releasedAt: '2026-08-20T09:00:00.000Z',
  variant: 'honors',
} as const;

export const blocks: readonly WebLessonSessionBlock[] = [
  {
    id: 'block-trig-main',
    blockType: 'content_group',
    orderIndex: 1,
    variant: 'honors',
    content: {
      label: '삼각함수 기출',
      pdfs: [
        { original_name: '삼각함수 레벨1.pdf', cdn_url: 'https://cdn.example.invalid/lv1.pdf' },
        { original_name: '삼각함수 레벨2.pdf', cdn_url: 'https://cdn.example.invalid/lv2.pdf' },
        { original_name: '삼각함수 레벨3.pdf', cdn_url: 'https://cdn.example.invalid/lv3.pdf' },
        { original_name: '삼각함수 레벨4-1.pdf', cdn_url: 'https://cdn.example.invalid/lv4-1.pdf' },
        { original_name: '삼각함수 레벨4-2.pdf', cdn_url: 'https://cdn.example.invalid/lv4-2.pdf' },
        { original_name: '올스캔 #1 합성 모의.pdf', cdn_url: 'https://cdn.example.invalid/allscan.pdf' },
      ],
    },
  },
];

export function fakePort(input: {
  readonly lesson: Awaited<ReturnType<WebLessonContextQueryPort['loadCurriculumItemBySlug']>>;
  readonly token: Awaited<ReturnType<WebLessonContextQueryPort['loadStudentToken']>>;
  readonly assignments: Awaited<ReturnType<WebLessonContextQueryPort['loadStudentLessonAssignments']>>;
  readonly blocksByVariant: Readonly<Record<string, readonly WebLessonSessionBlock[]>>;
  readonly failOperation?: 'loadCurriculumItemBySlug' | 'loadStudentToken' | 'loadStudentLessonAssignments' | 'loadSessionBlocks';
}): WebLessonContextQueryPort & { readonly calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    loadCurriculumItemBySlug: async () => {
      calls.push('curriculum_items');
      if (input.failOperation === 'loadCurriculumItemBySlug') throw new Error('synthetic source failure');
      return input.lesson;
    },
    loadStudentToken: async () => {
      calls.push('student_tokens');
      if (input.failOperation === 'loadStudentToken') throw new Error('synthetic source failure');
      return input.token;
    },
    loadStudentLessonAssignments: async () => {
      calls.push('student_lesson_assignments');
      if (input.failOperation === 'loadStudentLessonAssignments') throw new Error('synthetic source failure');
      return input.assignments;
    },
    loadSessionBlocks: async ({ variant }) => {
      calls.push(`session_blocks:${variant}`);
      if (input.failOperation === 'loadSessionBlocks') throw new Error('synthetic source failure');
      return input.blocksByVariant[variant] ?? [];
    },
  };
}
