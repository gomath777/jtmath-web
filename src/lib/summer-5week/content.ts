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

const SUBJECT_LESSONS: Partial<Record<SummerSubject, readonly ConceptLesson[]>> = {
  gs1: GS1_LESSONS,
  ds: [...DS_CONCEPT_PART1, ...DS_CONCEPT_PART2],
  mj1: [...MJ1_CONCEPT_PART1, ...MJ1_CONCEPT_PART2],
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
    return { kind: 'label', title: '모의시험', body: '시험 운영일입니다. 자료 링크는 따로 공개하지 않습니다.' };
  }
  if (day.role === 'rest') {
    return { kind: 'label', title: '휴식', body: '오늘은 정규 학습 자료 공개가 없습니다.' };
  }
  return { kind: 'label', title: '보충 / 질문', body: '수업 보충, 질문, 과제 점검을 위한 날입니다.' };
}

export function contentForDay(subject: SummerSubject, day: SummerDay): DayContent {
  if (day.role !== 'learning' || day.learningNumber === null) return labelContent(day);

  const lesson = SUBJECT_LESSONS[subject]?.[day.learningNumber - 1];
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
      title: '자료 준비중',
      resources: [],
      conceptBookTask: '개념노트와 영상이 준비되는 대로 공개됩니다.',
      typeBookTask: '수업 안내에 따라 공통 과제를 진행하세요.',
      pending: true,
    };
  }

  return {
    kind: 'learning',
    title: lesson.title,
    resources: lessonResources(lesson),
    conceptBookTask: `${lesson.title} 개념노트를 먼저 풀고 영상으로 확인하세요.`,
    typeBookTask: '유형서는 수업에서 안내한 공통 범위를 진행하고 질문을 표시해 오세요.',
    pending: false,
  };
}
