export type WidgetBrowserMaterialFixture = Readonly<{
  readonly materialKey: string;
  readonly label: string;
  readonly fileName: string;
  readonly order: number;
  readonly sideLabel?: string;
  readonly pdfHref: string;
}>;

export type WidgetBrowserFixture = Readonly<{
  readonly name: string;
  readonly lessonSlug: string;
  readonly subjectSlug: string;
  readonly subjectLabel: string;
  readonly unit: string;
  readonly title: string;
  readonly materials: readonly WidgetBrowserMaterialFixture[];
}>;

export type WidgetBrowserFixtureName = 'gs2-midterm' | 'mj1-midterm' | 'gh-midterm' | 'ds2-assigned-only' | 'ds2-assigned-alt';

function downloadHref(pdfHref: string): string {
  return `/api/public/pdf-download?url=${encodeURIComponent(pdfHref)}`;
}

export const gs2MidtermBrowserFixture = {
  name: 'gs2-midterm-source-order',
  lessonSlug: 'gs2-midterm-2026-w1s2-plane-line',
  subjectSlug: 'gs2',
  subjectLabel: '공수2',
  unit: '직선의 방정식',
  title: '직선의 방정식',
  materials: [
    { materialKey: 'm-1-content-pdf', label: '레벨4-2', fileName: '직선의 방정식 레벨4-2.pdf', order: 1, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gs2/level4-2.pdf' },
    { materialKey: 'm-2-content-pdf', label: '심화유형 1단계', fileName: '직선의 방정식 심화유형 1단계.pdf', order: 2, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gs2/advanced-stage-1.pdf' },
    { materialKey: 'm-3-content-pdf', label: '심화유형 2단계', fileName: '직선의 방정식 심화유형 2단계.pdf', order: 3, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gs2/advanced-stage-2.pdf' },
    { materialKey: 'm-4-content-pdf', label: '심화유형 3단계', fileName: '직선의 방정식 심화유형 3단계.pdf', order: 4, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gs2/advanced-stage-3.pdf' },
    { materialKey: 'm-5-content-pdf', label: '레벨5', fileName: '직선의 방정식 레벨5.pdf', order: 5, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gs2/level5.pdf' },
    { materialKey: 'm-6-content-pdf', label: '유형 올 스캔', fileName: '직선의 방정식 유형 올 스캔.pdf', order: 6, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gs2/all-scan.pdf' },
  ],
} as const satisfies WidgetBrowserFixture;

export const mj1MidtermBrowserFixture = {
  name: 'mj1-midterm-source-order',
  lessonSlug: 'mj1-midterm-2026-w1s2-limit',
  subjectSlug: 'mj1',
  subjectLabel: '미적1',
  unit: '함수의 극한',
  title: '함수의 극한',
  materials: [
    { materialKey: 'mj1-1-content-pdf', label: '레벨4-2', fileName: '함수의 극한 레벨4-2.pdf', order: 1, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/mj1/level4-2.pdf' },
    { materialKey: 'mj1-2-content-pdf', label: '심화유형 1단계', fileName: '함수의 극한 심화유형 1단계.pdf', order: 2, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/mj1/advanced-stage-1.pdf' },
    { materialKey: 'mj1-3-content-pdf', label: '심화유형 2단계', fileName: '함수의 극한 심화유형 2단계.pdf', order: 3, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/mj1/advanced-stage-2.pdf' },
    { materialKey: 'mj1-4-content-pdf', label: '심화유형 3단계', fileName: '함수의 극한 심화유형 3단계.pdf', order: 4, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/mj1/advanced-stage-3.pdf' },
    { materialKey: 'mj1-5-content-pdf', label: '레벨5', fileName: '함수의 극한 레벨5.pdf', order: 5, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/mj1/level5.pdf' },
    { materialKey: 'mj1-6-content-pdf', label: '유형 올 스캔', fileName: '함수의 극한 유형 올 스캔.pdf', order: 6, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/mj1/all-scan.pdf' },
  ],
} as const satisfies WidgetBrowserFixture;

export const ghMidtermBrowserFixture = {
  name: 'gh-midterm-source-order',
  lessonSlug: 'gh-midterm-2026-w1s2-conic',
  subjectSlug: 'gh',
  subjectLabel: '기하',
  unit: '이차곡선',
  title: '이차곡선',
  materials: [
    { materialKey: 'gh-1-content-pdf', label: '레벨4-2', fileName: '이차곡선 레벨4-2.pdf', order: 1, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gh/level4-2.pdf' },
    { materialKey: 'gh-2-content-pdf', label: '심화유형 1단계', fileName: '이차곡선 심화유형 1단계.pdf', order: 2, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gh/advanced-stage-1.pdf' },
    { materialKey: 'gh-3-content-pdf', label: '심화유형 2단계', fileName: '이차곡선 심화유형 2단계.pdf', order: 3, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gh/advanced-stage-2.pdf' },
    { materialKey: 'gh-4-content-pdf', label: '심화유형 3단계', fileName: '이차곡선 심화유형 3단계.pdf', order: 4, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gh/advanced-stage-3.pdf' },
    { materialKey: 'gh-5-content-pdf', label: '레벨5', fileName: '이차곡선 레벨5.pdf', order: 5, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gh/level5.pdf' },
    { materialKey: 'gh-6-content-pdf', label: '유형 올 스캔', fileName: '이차곡선 유형 올 스캔.pdf', order: 6, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/gh/all-scan.pdf' },
  ],
} as const satisfies WidgetBrowserFixture;

export const ds2AssignedOnlyBrowserFixture = {
  name: 'ds2-assigned-only-nested-sides',
  lessonSlug: 'synthetic-ds2-assigned-only',
  subjectSlug: 'ds2',
  subjectLabel: '대수2',
  unit: '다항식',
  title: '다항식',
  materials: [
    { materialKey: 'm-1-side-a-pdf', label: '심화유형 3단계', sideLabel: 'A', fileName: '다항식 심화유형 3단계 A.pdf', order: 1, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/ds2/advanced-a.pdf' },
    { materialKey: 'm-1-side-b-pdf', label: '심화유형 3단계', sideLabel: 'B', fileName: '다항식 심화유형 3단계 B.pdf', order: 2, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/ds2/advanced-b.pdf' },
  ],
} as const satisfies WidgetBrowserFixture;

export const ds2AssignedAltBrowserFixture = {
  ...ds2AssignedOnlyBrowserFixture,
  name: 'ds2-assigned-alt-nested-sides',
  lessonSlug: 'synthetic-ds2-alt',
  unit: '수열',
  title: '수열',
  materials: [
    { materialKey: 'ds2-alt-side-a-pdf', label: '레벨4-2', sideLabel: 'A', fileName: '수열 레벨4-2 A.pdf', order: 1, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/ds2/sequence-a.pdf' },
    { materialKey: 'ds2-alt-side-b-pdf', label: '레벨4-2', sideLabel: 'B', fileName: '수열 레벨4-2 B.pdf', order: 2, pdfHref: 'https://mathgo-pdfs.b-cdn.net/qa/ds2/sequence-b.pdf' },
  ],
} as const satisfies WidgetBrowserFixture;

export const gs2MidtermPdfHrefBaseline = {
  open: gs2MidtermBrowserFixture.materials.map((material) => material.pdfHref),
  download: gs2MidtermBrowserFixture.materials.map((material) => downloadHref(material.pdfHref)),
} as const;

export const ds2AssignedOnlyPdfHrefBaseline = {
  open: ds2AssignedOnlyBrowserFixture.materials.map((material) => material.pdfHref),
  download: ds2AssignedOnlyBrowserFixture.materials.map((material) => downloadHref(material.pdfHref)),
} as const;

export function browserFixture(name: WidgetBrowserFixtureName): WidgetBrowserFixture {
  if (name === 'gs2-midterm') return gs2MidtermBrowserFixture;
  if (name === 'mj1-midterm') return mj1MidtermBrowserFixture;
  if (name === 'gh-midterm') return ghMidtermBrowserFixture;
  if (name === 'ds2-assigned-alt') return ds2AssignedAltBrowserFixture;
  return ds2AssignedOnlyBrowserFixture;
}

export function browserPdfHrefBaseline(name: WidgetBrowserFixtureName): Readonly<{ readonly open: readonly string[]; readonly download: readonly string[] }> {
  const fixture = browserFixture(name);
  return {
    open: fixture.materials.map((material) => material.pdfHref),
    download: fixture.materials.map((material) => downloadHref(material.pdfHref)),
  };
}

export function browserFixtureMaterialLabel(material: WidgetBrowserMaterialFixture): string {
  return material.sideLabel === undefined ? material.label : `${material.label} ${material.sideLabel}`;
}
