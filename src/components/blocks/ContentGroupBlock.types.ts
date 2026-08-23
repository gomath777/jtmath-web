export interface PdfItem {
  readonly url: string;
  readonly cdn_url?: string;
  readonly original_name: string;
  readonly file_size?: string;
}

export interface VideoItem {
  readonly bunny_video_id: string;
  readonly title: string;
  readonly problem_number: number;
  readonly raw_text?: string;
  readonly order_index?: number;
  readonly duration_seconds?: number | null;
}

export interface SideContent {
  readonly label: string;
  readonly pdf: PdfItem;
  readonly hintbook?: PdfItem;
}

export interface ContentGroupContent {
  readonly label: string;
  readonly step?: number | string;
  readonly description?: string;
  readonly is_optional?: boolean;
  readonly is_bonus?: boolean;
  readonly pdf?: PdfItem;
  readonly pdfs?: readonly PdfItem[];
  readonly hintbook?: PdfItem;
  readonly videos?: readonly VideoItem[];
  readonly page_range?: string;
  readonly guide_text?: string;
  readonly side_a?: SideContent;
  readonly side_b?: SideContent;
}
