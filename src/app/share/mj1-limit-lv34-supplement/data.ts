export type SupplementPdf = {
  readonly name: string;
  readonly url: string;
  readonly size: string;
};

export type SupplementVideo = {
  readonly id: string;
  readonly problemNumber: number;
  readonly source: string;
};

export type SupplementSection = {
  readonly level: string;
  readonly title: string;
  readonly pdf: SupplementPdf;
  readonly videos: readonly SupplementVideo[];
};

export const LIMIT_SUPPLEMENT_SECTIONS = [
  {
    level: '레벨3-1',
    title: '함수의 극한 레벨3-1',
    pdf: {
      name: '함수의 극한 레벨3-1.pdf',
      url: 'https://mathgo-pdfs.b-cdn.net/sessions/mj1/2026-midterm-front/w1/lv31.pdf?v=d68e159e6e',
      size: '2.5 MB',
    },
    videos: [
      {
        id: '4d3173af-cef1-49bf-b9b0-5e9108e4eb1e',
        problemNumber: 1,
        source: '2025년 10월 고2 12번',
      },
      {
        id: '700e992b-be6d-46a5-b4e0-d3ef88e12b82',
        problemNumber: 2,
        source: '2025년 10월 고2 16번',
      },
      {
        id: '1d3eae3e-6b82-4f81-8914-68893a8dea64',
        problemNumber: 4,
        source: '2023년 9월 고2 26번',
      },
      {
        id: 'bc559bdd-5113-48ff-bd29-10cac70f2771',
        problemNumber: 5,
        source: '2022년 11월 고2 27번',
      },
      {
        id: 'db594f63-7704-4698-a7ca-311a9c082382',
        problemNumber: 6,
        source: '2023년 10월 고3 10번',
      },
      {
        id: 'be334382-dc30-4f26-9dd3-8a9b64454e3d',
        problemNumber: 7,
        source: '2021년 4월 고3 9번',
      },
      {
        id: '9af1ca40-14f0-497b-bcd0-7e5d96929ba4',
        problemNumber: 9,
        source: '2019년 11월 고3 문과 14번',
      },
    ],
  },
  {
    level: '레벨3-2',
    title: '함수의 극한 레벨3-2',
    pdf: {
      name: '함수의 극한 레벨3-2.pdf',
      url: 'https://mathgo-pdfs.b-cdn.net/sessions/mj1/2026-midterm-front/w1/lv32.pdf?v=bf46566ce5',
      size: '2.3 MB',
    },
    videos: [],
  },
  {
    level: '레벨4-1',
    title: '함수의 극한 레벨4-1',
    pdf: {
      name: '함수의 극한 레벨4-1.pdf',
      url: 'https://mathgo-pdfs.b-cdn.net/sessions/mj1/2026-midterm-front/w1/lv41.pdf?v=ec15ae85e6',
      size: '2.7 MB',
    },
    videos: [
      {
        id: '2c9b14bf-d698-4019-8fac-61d036a21c6e',
        problemNumber: 1,
        source: '2025년 9월 고2 13번',
      },
      {
        id: '4939dac6-bb78-45dd-81af-0653f0a2f412',
        problemNumber: 2,
        source: '2024년 9월 고2 28번',
      },
      {
        id: '0a8bcc0b-2c14-4d69-8792-2651d24d9b17',
        problemNumber: 3,
        source: '2023년 11월 고2 28번',
      },
      {
        id: '7affb5c2-398a-4fb3-a15c-efeccc805ffa',
        problemNumber: 4,
        source: '2021년 11월 고2 18번',
      },
      {
        id: 'd0e69933-bada-4165-a3c0-2cd2a288c4b1',
        problemNumber: 5,
        source: '2020년 11월 고2 20번',
      },
      {
        id: '79c4e1f1-2496-4abd-b10a-8d122c014d1d',
        problemNumber: 6,
        source: '2026년 6월 고3 11번',
      },
      {
        id: 'db12c429-2cb4-4b37-bfef-526ec8642783',
        problemNumber: 7,
        source: '2024년 11월 고3 21번',
      },
    ],
  },
] as const satisfies readonly SupplementSection[];
