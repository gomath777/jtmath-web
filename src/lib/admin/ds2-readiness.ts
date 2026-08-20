export const DS2_CURRICULUM_TITLES = [
  '[대수] 개념강의',
  '[대수] 기출',
  '[대수] 심화유형',
] as const;

export type ReadinessCategory = 'concept' | 'gichul' | 'shimhwa';
export type HealthState = 'unchecked' | 'checking' | 'ok' | 'error';

export type PdfAsset = {
  readonly name: string;
  readonly url: string;
  readonly health: HealthState;
};

export type VideoAsset = {
  readonly id: string;
  readonly title: string;
  readonly health: HealthState;
};

export type ContentAssets = {
  readonly pdfs: readonly PdfAsset[];
  readonly hintbooks: readonly PdfAsset[];
  readonly videos: readonly VideoAsset[];
};

export type Ds2ReadinessRow = {
  readonly id: string;
  readonly category: ReadinessCategory;
  readonly sessionNumber: number | null;
  readonly title: string;
  readonly variantLabel: string | null;
  readonly publicSlug: string | null;
  readonly assignmentCount: number;
  readonly blockCount: number;
  readonly assets: ContentAssets;
};

export type Ds2ReadinessSnapshot = {
  readonly rows: readonly Ds2ReadinessRow[];
  readonly healthCheckedAt: string | null;
};

type AssetContext = 'content' | 'hintbook';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fileNameFromUrl(url: string): string {
  const pathname = url.split('?')[0] ?? url;
  const encoded = pathname.split('/').at(-1) || 'PDF';
  try {
    return decodeURIComponent(encoded);
  } catch (error: unknown) {
    if (error instanceof URIError) return encoded;
    throw error;
  }
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function collectNode(
  value: unknown,
  context: AssetContext,
  pdfs: Map<string, PdfAsset>,
  hintbooks: Map<string, PdfAsset>,
  videos: Map<string, VideoAsset>,
): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectNode(entry, context, pdfs, hintbooks, videos));
    return;
  }
  if (!isRecord(value)) return;

  const url = readString(value, 'url') || readString(value, 'cdn_url');
  if (url && /\.pdf(?:\?|$)/i.test(url)) {
    const asset = {
      name: readString(value, 'original_name') || fileNameFromUrl(url),
      url,
      health: 'unchecked',
    } satisfies PdfAsset;
    (context === 'hintbook' ? hintbooks : pdfs).set(url, asset);
  }

  const videoId = readString(value, 'bunny_video_id');
  if (videoId) {
    videos.set(videoId, {
      id: videoId,
      title: readString(value, 'title') || readString(value, 'source_label') || '해설강의',
      health: 'unchecked',
    });
  }

  Object.entries(value).forEach(([key, child]) => {
    collectNode(child, key === 'hintbook' ? 'hintbook' : context, pdfs, hintbooks, videos);
  });
}

export function collectContentAssets(
  blocks: readonly Readonly<{ readonly block_type: string; readonly content: unknown }>[],
): ContentAssets {
  const pdfs = new Map<string, PdfAsset>();
  const hintbooks = new Map<string, PdfAsset>();
  const videos = new Map<string, VideoAsset>();

  blocks.forEach((block) => collectNode(block.content, 'content', pdfs, hintbooks, videos));

  return {
    pdfs: Array.from(pdfs.values()),
    hintbooks: Array.from(hintbooks.values()),
    videos: Array.from(videos.values()),
  };
}

export function isRowReady(row: Ds2ReadinessRow): boolean {
  if (!row.publicSlug || row.blockCount === 0) return false;
  if (row.category === 'shimhwa') return row.assets.pdfs.length > 0;
  return row.assets.pdfs.length > 0 && row.assets.videos.length > 0;
}

export function isReadinessListRow(row: Ds2ReadinessRow): boolean {
  return row.variantLabel !== '보강';
}
