'use client';

import React from 'react';

import { BonusContentGroupLayout, ShimhwaPairContentGroupLayout } from './SupplementalContentGroupLayouts';
import { ConceptContentGroupLayout } from './ConceptContentGroupLayout';
import { GichulContentGroupLayout } from './GichulContentGroupLayout';
import type { ContentGroupContent } from './ContentGroupBlock.types';
import type { ProgressMap } from './types';

type ContentGroupBlockProps = Readonly<{
  readonly content: Record<string, unknown>;
  readonly progress: ProgressMap;
  readonly subjectSlug: string;
  readonly progressEndpoint?: string;
}>;

function hasGichulLabel(label: string): boolean {
  return /레벨|올스캔|올 스캔|단계/i.test(label);
}

export default function ContentGroupBlock({ content, progress, subjectSlug: _subjectSlug, progressEndpoint }: ContentGroupBlockProps) {
  const data = content as unknown as ContentGroupContent;

  if (data.side_a && data.side_b) {
    return <ShimhwaPairContentGroupLayout content={data} sideA={data.side_a} sideB={data.side_b} />;
  }

  if (data.is_bonus) {
    return <BonusContentGroupLayout data={data} />;
  }

  if (data.page_range) {
    return <ConceptContentGroupLayout data={data} progress={progress} progressEndpoint={progressEndpoint} />;
  }

  if (hasGichulLabel(data.label || '')) {
    return <GichulContentGroupLayout data={data} progress={progress} progressEndpoint={progressEndpoint} />;
  }

  return <ConceptContentGroupLayout data={data} progress={progress} progressEndpoint={progressEndpoint} />;
}
