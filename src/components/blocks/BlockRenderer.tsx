'use client';

import SectionHeaderBlock from './SectionHeaderBlock';
import PdfBlock, { HintbookBlock } from './PdfBlock';
import VideoGroupBlock from './VideoGroupBlock';
import ContentGroupBlock from './ContentGroupBlock';
import TextBlock from './TextBlock';
import type { SessionBlock, ProgressMap } from './types';

interface BlockRendererProps {
  block: SessionBlock;
  progress: ProgressMap;
  subjectSlug: string;
  progressEndpoint?: string;
}

export default function BlockRenderer({
  block,
  progress,
  subjectSlug,
  progressEndpoint,
}: BlockRendererProps) {
  const { block_type, content } = block;

  switch (block_type) {
    case 'section_header':
      return <SectionHeaderBlock content={content} />;
    case 'pdf':
      return <PdfBlock content={content} />;
    case 'hintbook':
      return <HintbookBlock content={content} />;
    case 'video_group':
      return (
        <VideoGroupBlock
          content={content}
          progress={progress}
          subjectSlug={subjectSlug}
          progressEndpoint={progressEndpoint}
        />
      );
    case 'content_group':
      return (
        <ContentGroupBlock
          content={content}
          progress={progress}
          subjectSlug={subjectSlug}
          progressEndpoint={progressEndpoint}
        />
      );
    case 'text':
      return <TextBlock content={content} />;
    default:
      return null;
  }
}
