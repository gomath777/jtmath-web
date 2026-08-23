import type { ContentGroupContent, PdfItem, VideoItem } from './ContentGroupBlock.types';

export function formatVideoDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function getContentGroupSubLabel(label: string): string {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes('레벨5') || normalizedLabel.includes('고난도')) return '고난도 도전';
  if (normalizedLabel.includes('레벨4')) return '심화 문제';
  if (normalizedLabel.includes('레벨3')) return '실전 문제';
  if (normalizedLabel.includes('올 스캔') || normalizedLabel.includes('올스캔')) return '전 범위 점검';
  if (normalizedLabel.includes('단계')) return '심화유형';
  return '기본 문제';
}

export function getContentGroupPdfs(data: ContentGroupContent): readonly PdfItem[] {
  return data.pdfs || (data.pdf ? [data.pdf] : []);
}

export function getContentGroupVideos(data: ContentGroupContent): readonly VideoItem[] {
  return (data.videos || []).slice().sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0));
}

export function getPdfDisplayName(item: PdfItem, fallbackName: string): string {
  return item.original_name || fallbackName;
}

export function getPdfSourceUrl(item: PdfItem): string {
  return item.url || item.cdn_url || '';
}
