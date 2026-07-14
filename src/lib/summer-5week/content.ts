import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';
import type { ConceptLesson } from '@/app/share/_components/ConceptSharePage';
import { DS_CONCEPT_PART1, DS_CONCEPT_PART2 } from '@/app/share/ds-concept/data';
import { MJ1_CONCEPT_PART1, MJ1_CONCEPT_PART2 } from '@/app/share/mj1-concept/data';
import type { SummerDay } from './schedule';
import { subjectCanHavePendingResources } from './schedule';
import type { SummerSubject } from './subjects';

export type DayResource = {
  readonly kind: 'pdf' | 'video';
  readonly label: string;
  readonly href: string;
};

export type DayContent =
  | {
      readonly kind: 'learning';
      readonly title: string;
      readonly resources: readonly DayResource[];
      readonly conceptBookTask: string;
      readonly typeBookTask: string;
      readonly pending: boolean;
    }
  | {
      readonly kind: 'label';
      readonly title: string;
      readonly body: string;
    };

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const GS1_LESSONS: readonly ConceptLesson[] = [
  {
    order: 1,
    title: '다항식의 연산',
    pdfs: [
      {
        name: '다항식의 사칙연산',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/01_%EB%8B%A4%ED%95%AD%EC%8B%9D%EC%97%B0%EC%82%B0/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%201.1.1.%EB%8B%A4%ED%95%AD%EC%8B%9D%EC%9D%98%20%EC%82%AC%EC%B9%99%EC%97%B0%EC%82%B0.pdf',
      },
    ],
    videos: [{ num: 1, title: '다항식의 연산', id: '0433291f-b6c1-40f6-9b95-cbfe183c81d2' }],
  },
  {
    order: 2,
    title: '나머지정리',
    pdfs: [
      {
        name: '항등식과 나머지정리',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/02_%EB%82%98%EB%A8%B8%EC%A7%80%EC%A0%95%EB%A6%AC/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%201.1.2.%20%ED%95%AD%EB%93%B1%EC%8B%9D%EA%B3%BC%20%EB%82%98%EB%A8%B8%EC%A7%80%EC%A0%95%EB%A6%AC.pdf',
      },
    ],
    videos: [{ num: 2, title: '나머지정리', id: '18d2abe9-9dcf-4288-933a-376e7a47e6ad' }],
  },
  {
    order: 3,
    title: '인수분해',
    pdfs: [
      {
        name: '다항식의 인수분해',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/03_%EC%9D%B8%EC%88%98%EB%B6%84%ED%95%B4/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%201.1.3.%20%EB%8B%A4%ED%95%AD%EC%8B%9D%EC%9D%98%20%EC%9D%B8%EC%88%98%EB%B6%84%ED%95%B4.pdf',
      },
    ],
    videos: [{ num: 3, title: '인수분해', id: '715d2be6-b623-41fd-b57c-712311ef865d' }],
  },
];

const DS_LESSONS = [...DS_CONCEPT_PART1, ...DS_CONCEPT_PART2];
const MJ1_LESSONS = [...MJ1_CONCEPT_PART1, ...MJ1_CONCEPT_PART2];
const GS2_LESSONS: readonly ConceptLesson[] = [
  {
    order: 1,
    title: '선분의 내분점',
    pdfs: [
      {
        name: '선분의 내분, 내분점의 좌표 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/01_%EB%8F%84%ED%98%95%EC%9D%98%EB%B0%A9%EC%A0%95%EC%8B%9D/1_1_1_%20%E1%84%89%E1%85%A5%E1%86%AB%E1%84%87%E1%85%AE%E1%86%AB%E1%84%8B%E1%85%B4%20%E1%84%82%E1%85%A2%E1%84%87%E1%85%AE%E1%86%AB_%E1%84%82%E1%85%A2%E1%84%87%E1%85%AE%E1%86%AB%E1%84%8C%E1%85%A5%E1%86%B7%E1%84%8B%E1%85%B4%20%E1%84%8C%E1%85%AA%E1%84%91%E1%85%AD.pdf?v=dd28d0ba5c',
      },
    ],
    videos: [{ num: 1, title: '선분의 내분점', id: 'd8ac7347-08c2-4e18-889c-945912bb343c' }],
  },
  {
    order: 2,
    title: '직선의 방정식과 점과 직선 사이의 거리',
    pdfs: [
      {
        name: '두 직선의 평행 조건과 수직 조건 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/01_%EB%8F%84%ED%98%95%EC%9D%98%EB%B0%A9%EC%A0%95%EC%8B%9D/1_2_1_%20%E1%84%83%E1%85%AE%20%E1%84%8C%E1%85%B5%E1%86%A8%E1%84%89%E1%85%A5%E1%86%AB%E1%84%8B%E1%85%B4%20%E1%84%91%E1%85%A7%E1%86%BC%E1%84%92%E1%85%A2%E1%86%BC%20%E1%84%8C%E1%85%A9%E1%84%80%E1%85%A5%E1%86%AB%E1%84%80%E1%85%AA%20%E1%84%89%E1%85%AE%E1%84%8C%E1%85%B5%E1%86%A8%20%E1%84%8C%E1%85%A9%E1%84%80%E1%85%A5%E1%86%AB.pdf?v=123598d795',
      },
      {
        name: '점과 직선 사이의 거리 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/01_%EB%8F%84%ED%98%95%EC%9D%98%EB%B0%A9%EC%A0%95%EC%8B%9D/1_2_2_%20%E1%84%8C%E1%85%A5%E1%86%B7%E1%84%80%E1%85%AA%20%E1%84%8C%E1%85%B5%E1%86%A8%E1%84%89%E1%85%A5%E1%86%AB%20%E1%84%89%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%8B%E1%85%B4%20%E1%84%80%E1%85%A5%E1%84%85%E1%85%B5.pdf?v=374cf8f3c0',
      },
    ],
    videos: [
      { num: 2, title: '직선의 방정식', id: '088e36a4-926e-4876-849b-cea45e5b62c6' },
      { num: 3, title: '두 직선의 위치관계', id: '522649b4-452f-45d4-bc4c-bb1c12b637e4' },
      { num: 4, title: '점과 직선 사이의 거리', id: '9b63b85f-18de-4ea4-a6ee-c26b916e1daa' },
    ],
  },
  {
    order: 3,
    title: '원의 방정식과 그래프',
    pdfs: [],
    videos: [],
  },
  {
    order: 4,
    title: '원과 직선의 위치관계',
    pdfs: [],
    videos: [],
  },
  {
    order: 5,
    title: '평행이동과 대칭이동',
    pdfs: [],
    videos: [],
  },
  {
    order: 6,
    title: '집합의 개념과 표현',
    pdfs: [],
    videos: [],
  },
  {
    order: 7,
    title: '두 집합 사이의 포함관계',
    pdfs: [],
    videos: [],
  },
  {
    order: 8,
    title: '집합의 연산과 벤 다이어그램',
    pdfs: [],
    videos: [],
  },
  {
    order: 9,
    title: '중간범위 누적 정리',
    pdfs: [],
    videos: [],
  },
  {
    order: 10,
    title: '명제와 조건',
    pdfs: [],
    videos: [],
  },
  {
    order: 11,
    title: '명제의 증명과 절대부등식',
    pdfs: [],
    videos: [],
  },
  {
    order: 12,
    title: '함수의 뜻과 그래프',
    pdfs: [],
    videos: [],
  },
  {
    order: 13,
    title: '합성함수와 역함수',
    pdfs: [],
    videos: [],
  },
  {
    order: 14,
    title: '유리함수',
    pdfs: [],
    videos: [],
  },
  {
    order: 15,
    title: '무리함수',
    pdfs: [],
    videos: [],
  },
  {
    order: 16,
    title: '유리함수와 무리함수 활용',
    pdfs: [],
    videos: [],
  },
];
const GH_LESSONS: readonly ConceptLesson[] = [
  {
    order: 1,
    title: '포물선의 방정식',
    pdfs: [
      {
        name: '포물선 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/01_%ED%8F%AC%EB%AC%BC%EC%84%A0/1_1_1_%20%ED%8F%AC%EB%AC%BC%EC%84%A0.pdf',
      },
    ],
    videos: [{ num: 1, title: '포물선의 방정식', id: '8ff0facc-145e-4852-81ac-183dbbd668de' }],
  },
  {
    order: 2,
    title: '타원의 방정식',
    pdfs: [
      {
        name: '타원 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/02_%ED%83%80%EC%9B%90/1_1_2_%20%ED%83%80%EC%9B%90_v2.pdf',
      },
    ],
    videos: [{ num: 2, title: '타원의 방정식', id: '9b04fbd3-018d-44b7-af35-7a2bd3d6f2c3' }],
  },
  {
    order: 3,
    title: '쌍곡선과 이차곡선',
    pdfs: [],
    videos: [],
  },
  {
    order: 4,
    title: '포물선의 접선과 타원의 접선',
    pdfs: [],
    videos: [],
  },
  {
    order: 5,
    title: '쌍곡선의 접선',
    pdfs: [],
    videos: [],
  },
  {
    order: 6,
    title: '직선과 평면의 위치 관계',
    pdfs: [],
    videos: [],
  },
  {
    order: 7,
    title: '삼수선 정리',
    pdfs: [],
    videos: [],
  },
  {
    order: 8,
    title: '정사영',
    pdfs: [],
    videos: [],
  },
];

const SUBJECT_LESSONS: Partial<Record<SummerSubject, readonly ConceptLesson[]>> = {
  gs1: GS1_LESSONS,
  gs2: GS2_LESSONS,
  ds: DS_LESSONS,
  mj1: MJ1_LESSONS,
  gh: GH_LESSONS,
};

function lessonResources(lesson: ConceptLesson): readonly DayResource[] {
  return [
    ...lesson.pdfs.map((pdf) => ({ kind: 'pdf' as const, label: pdf.name, href: pdf.url })),
    ...lesson.videos.map((video) => ({
      kind: 'video' as const,
      label: `${video.num}강 ${video.title.replace(/\.mp4$/i, '')}`,
      href: EMBED(video.id),
    })),
  ];
}

function labelContent(day: SummerDay): DayContent {
  if (day.role === 'review') {
    return { kind: 'label', title: '오답 총정리', body: '별도 학습 페이지 없이 수업 중 오답과 질문을 정리합니다.' };
  }
  if (day.role === 'mock') {
    return { kind: 'label', title: day.title, body: '시험 운영일입니다. 자료 링크는 따로 공개하지 않습니다.' };
  }
  if (day.role === 'rest') {
    return { kind: 'label', title: '휴식', body: '오늘은 정규 학습 자료 공개가 없습니다.' };
  }
  return { kind: 'label', title: '보충 / 질문', body: '수업 보충, 질문, 과제 점검을 위한 날입니다.' };
}

function dsLessonForDay(learningNumber: number): ConceptLesson | undefined {
  if (learningNumber <= 7) return DS_LESSONS[learningNumber - 1];
  if (learningNumber === 8) {
    const graphLesson = DS_LESSONS[6];
    if (!graphLesson) return undefined;
    return { ...graphLesson, title: '삼각함수 그래프 정리' };
  }
  return DS_LESSONS[learningNumber - 2];
}

function mj1LessonForDay(learningNumber: number): ConceptLesson | undefined {
  if (learningNumber <= 9) return MJ1_LESSONS[learningNumber - 1];
  if (learningNumber === 10) {
    const graphLesson = MJ1_LESSONS[8];
    if (!graphLesson) return undefined;
    return { ...graphLesson, title: '함수의 그래프 정리' };
  }
  return MJ1_LESSONS[learningNumber - 2];
}

function lessonForDay(subject: SummerSubject, learningNumber: number): ConceptLesson | undefined {
  if (subject === 'ds') return dsLessonForDay(learningNumber);
  if (subject === 'mj1') return mj1LessonForDay(learningNumber);
  return SUBJECT_LESSONS[subject]?.[learningNumber - 1];
}

export function contentForDay(subject: SummerSubject, day: SummerDay): DayContent {
  if (day.role !== 'learning' || day.learningNumber === null) return labelContent(day);

  const lesson = lessonForDay(subject, day.learningNumber);
  if (!lesson) {
    if (!subjectCanHavePendingResources(subject)) {
      return {
        kind: 'learning',
        title: `${day.learningNumber}일차 누적 학습`,
        resources: [],
        conceptBookTask: '수업 안내 범위의 개념노트 진행',
        typeBookTask: '개념서와 유형서 공통 과제 진행',
        pending: false,
      };
    }

    return {
      kind: 'learning',
      title: `${day.learningNumber}일차 학습 예정`,
      resources: [],
      conceptBookTask: '개념노트와 영상이 준비되는 대로 공개됩니다.',
      typeBookTask: '수업 안내에 따라 공통 과제를 진행하세요.',
      pending: true,
    };
  }

  const resources = lessonResources(lesson);
  const pending = subjectCanHavePendingResources(subject) && resources.length === 0;
  return {
    kind: 'learning',
    title: lesson.title,
    resources,
    conceptBookTask: pending
      ? `${lesson.title} 범위로 수업 예정입니다. 개념노트와 영상은 업로드 후 연결됩니다.`
      : `${lesson.title} 개념노트를 먼저 풀고 영상으로 확인하세요.`,
    typeBookTask: '유형서는 수업에서 안내한 공통 범위를 진행하고 질문을 표시해 오세요.',
    pending,
  };
}
