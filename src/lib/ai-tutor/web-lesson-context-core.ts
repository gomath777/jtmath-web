import 'server-only';

export type WebLessonLevel = number;

export type WebLessonSessionBlock = {
  readonly id?: string;
  readonly blockType: string;
  readonly orderIndex: number;
  readonly variant: string;
  readonly content: Record<string, unknown>;
};

/** Kept only until the numeric input adapter is removed in Todo 6. */
export type LegacyWebLessonMaterialDescriptor = {
  readonly level: WebLessonLevel;
  readonly fileName: string;
  readonly url: string;
};

export type RolloutWebLessonMaterialDescriptor = {
  readonly materialKey: string;
  readonly blockId: string;
  readonly sourcePath: string;
  readonly sourceHash: string | null;
  readonly url: string;
  readonly label: string;
  readonly fileName: string;
  readonly order: number;
  readonly sideLabel: string | null;
  readonly subjectSlug: string;
  readonly unit: string;
  readonly variant: string;
  readonly level: WebLessonLevel;
};

export type WebLessonMaterialDescriptor = LegacyWebLessonMaterialDescriptor | RolloutWebLessonMaterialDescriptor;

export type WebLessonClientMaterial = {
  readonly materialKey: string;
  readonly level: WebLessonLevel;
  readonly label: string;
  readonly fileName: string;
  readonly order: number;
  readonly sideLabel?: string;
};

type PdfEntry = {
  readonly original_name?: unknown;
  readonly originalName?: unknown;
  readonly cdn_url?: unknown;
  readonly url?: unknown;
  readonly label?: unknown;
  readonly title?: unknown;
  readonly source_hash?: unknown;
  readonly sourceHash?: unknown;
  readonly sha256?: unknown;
};

type MaterialCandidate = {
  readonly block: WebLessonSessionBlock;
  readonly sourcePath: string;
  readonly entry: PdfEntry;
  readonly label: string;
  readonly sideLabel: string | null;
};

export type MaterialParseResult =
  | { readonly ok: true; readonly materials: readonly RolloutWebLessonMaterialDescriptor[] }
  | { readonly ok: false; readonly reason: 'missing_pdf' | 'duplicate_pdf' | 'source_error' };

export function parseWebLessonPdfMaterials(input: {
  readonly blocks: readonly WebLessonSessionBlock[];
  readonly subjectSlug: string;
  readonly unit: string;
  readonly variant: string;
}): MaterialParseResult {
  const candidates = collectMaterialCandidates(input.blocks);
  if (!candidates.ok) return candidates;
  if (candidates.candidates.length === 0) return { ok: false, reason: 'missing_pdf' };

  const ordered = candidates.candidates
    .slice()
    .sort((left, right) => left.block.orderIndex - right.block.orderIndex || left.sourcePath.localeCompare(right.sourcePath));
  const keys = new Set<string>();
  const materials: RolloutWebLessonMaterialDescriptor[] = [];
  for (const [index, candidate] of ordered.entries()) {
    const blockId = text(candidate.block.id);
    const fileName = text(candidate.entry.original_name) ?? text(candidate.entry.originalName);
    const url = text(candidate.entry.url) ?? text(candidate.entry.cdn_url);
    if (!blockId || !fileName || !url) return { ok: false, reason: 'source_error' };
    const materialKey = materialKeyFor(candidate.block.orderIndex, candidate.sourcePath);
    if (keys.has(materialKey)) return { ok: false, reason: 'duplicate_pdf' };
    keys.add(materialKey);
    const normalizedFileName = fileName.normalize('NFC');
    materials.push({
      materialKey,
      blockId,
      sourcePath: candidate.sourcePath,
      sourceHash: sourceHash(candidate.entry),
      url,
      label: materialLabel(candidate.entry, candidate.label, normalizedFileName),
      fileName: normalizedFileName,
      order: index + 1,
      sideLabel: candidate.sideLabel,
      subjectSlug: input.subjectSlug,
      unit: input.unit,
      variant: input.variant,
      level: parseLegacyLevel(normalizedFileName),
    });
  }
  return { ok: true, materials };
}

export function toClientMaterial(material: RolloutWebLessonMaterialDescriptor): WebLessonClientMaterial {
  return {
    materialKey: material.materialKey,
    level: material.level,
    label: material.label,
    fileName: material.fileName,
    order: material.order,
    ...(material.sideLabel === null ? {} : { sideLabel: material.sideLabel }),
  };
}

function collectMaterialCandidates(blocks: readonly WebLessonSessionBlock[]):
  | { readonly ok: true; readonly candidates: readonly MaterialCandidate[] }
  | { readonly ok: false; readonly reason: 'source_error' } {
  const candidates: MaterialCandidate[] = [];
  for (const block of blocks) {
    if (block.blockType !== 'content_group') continue;
    const blockLabel = text(block.content['label']) ?? '';
    const topPdf = readEntry(block.content['pdf']);
    if (topPdf.kind === 'invalid') return { ok: false, reason: 'source_error' };
    if (topPdf.entry) candidates.push({ block, sourcePath: 'content.pdf', entry: topPdf.entry, label: blockLabel, sideLabel: null });

    const pdfs = block.content['pdfs'];
    if (pdfs !== undefined && !Array.isArray(pdfs)) return { ok: false, reason: 'source_error' };
    if (Array.isArray(pdfs)) {
      for (const [index, value] of pdfs.entries()) {
        const entry = readEntry(value);
        if (entry.kind === 'invalid') return { ok: false, reason: 'source_error' };
        if (entry.entry) candidates.push({ block, sourcePath: `content.pdfs.${index}`, entry: entry.entry, label: blockLabel, sideLabel: null });
      }
    }

    for (const side of ['side_a', 'side_b'] as const) {
      const sideContainer = block.content[side];
      if (sideContainer === undefined) continue;
      if (!isRecord(sideContainer)) return { ok: false, reason: 'source_error' };
      const sidePdf = readEntry(sideContainer['pdf']);
      if (sidePdf.kind === 'invalid') return { ok: false, reason: 'source_error' };
      if (sidePdf.entry) {
        candidates.push({
          block,
          sourcePath: `${side}.pdf`,
          entry: sidePdf.entry,
          label: text(sideContainer['label']) ?? blockLabel,
          sideLabel: text(sideContainer['label']) ?? (side === 'side_a' ? 'A' : 'B'),
        });
      }
    }
  }
  return { ok: true, candidates };
}

function readEntry(value: unknown): { readonly kind: 'none'; readonly entry: null } | { readonly kind: 'entry'; readonly entry: PdfEntry } | { readonly kind: 'invalid'; readonly entry: null } {
  if (value === undefined || value === null) return { kind: 'none', entry: null };
  return isRecord(value) ? { kind: 'entry', entry: value } : { kind: 'invalid', entry: null };
}

function materialKeyFor(orderIndex: number, sourcePath: string): string {
  return `m-${orderIndex}-${sourcePath.replace(/[._]/gu, '-')}`;
}

function materialLabel(entry: PdfEntry, blockLabel: string, fileName: string): string {
  return text(entry.label) ?? text(entry.title) ?? (blockLabel.trim() || fileName.replace(/\.pdf$/iu, ''));
}

function sourceHash(entry: PdfEntry): string | null {
  return text(entry.source_hash) ?? text(entry.sourceHash) ?? text(entry.sha256);
}

function parseLegacyLevel(fileName: string): WebLessonLevel {
  const normalized = fileName.normalize('NFKC').replace(/\s+/gu, '');
  const advancedStage = /심화유형([123])단계/.exec(normalized);
  if (advancedStage !== null) return 400 + Number(advancedStage[1]);
  if (normalized.includes('레벨4-1')) return 41;
  if (normalized.includes('레벨4-2')) return 42;
  if (normalized.includes('레벨5')) return 5;
  if (normalized.includes('레벨1')) return 1;
  if (normalized.includes('레벨2')) return 2;
  if (normalized.includes('레벨3')) return 3;
  return normalized.includes('올스캔') ? 99 : 1000;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
