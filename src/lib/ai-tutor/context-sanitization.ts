const urlPattern = new RegExp('\\b(?:https?:\\/\\/|www\\.)\\S+', 'giu');
const emailPattern = new RegExp('\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b', 'giu');
const phonePattern = new RegExp('\\b(?:\\+?82[-.\\s]?)?0(?:10|2|[3-6][1-5])[-.\\s]?\\d{3,4}[-.\\s]?\\d{4}\\b', 'gu');
const privatePathPattern = new RegExp('\\bai-tutor-private\\/\\S+', 'gu');
const conceptTagAllowedPattern = new RegExp('[^\\p{L}\\p{N}_:-]+', 'gu');
const subjectSlugAllowedPattern = /^[a-z0-9-]+$/;

export function normalizeTags(tags: readonly string[]): readonly string[] {
  const normalizedTags: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    normalizedTags.push(normalized);
  }
  return normalizedTags;
}

export function normalizeSubjectSlug(subjectSlug: string | null): string {
  const normalized = (subjectSlug ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
  return subjectSlugAllowedPattern.test(normalized) ? truncateText(normalized, 40) : 'unknown';
}

export function sanitizeText(value: string | null, maxLength: number): string | null {
  if (value === null) return null;
  const sanitized = value
    .replace(urlPattern, '[redacted-url]')
    .replace(emailPattern, '[redacted-email]')
    .replace(phonePattern, '[redacted-contact]')
    .replace(privatePathPattern, '[redacted-private-path]')
    .replace(new RegExp('[\\u0000-\\u001f\\u007f]+', 'gu'), ' ')
    .trim();
  return sanitized.length > 0 ? truncateText(sanitized, maxLength) : null;
}

export function timestampOf(iso: string | null): number {
  if (iso === null) return 0;
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : 0;
}

export function truncateText(value: string, maxLength: number): string {
  return Array.from(value).slice(0, Math.max(0, maxLength)).join('');
}

function normalizeTag(tag: string): string | null {
  const normalized = tag
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ko-KR')
    .replace(new RegExp('\\s+', 'gu'), '-')
    .replace(conceptTagAllowedPattern, '');
  return normalized.length > 0 ? truncateText(normalized, 40) : null;
}
