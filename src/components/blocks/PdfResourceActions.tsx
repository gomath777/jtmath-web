import React from 'react';

import { getPdfDownloadHref } from '../../lib/pdf-download';

type PdfResourceActionsProps = {
  readonly name: string;
  readonly sourceUrl: string;
};

export function PdfResourceActions({ name, sourceUrl }: PdfResourceActionsProps) {
  const downloadHref = getPdfDownloadHref(sourceUrl);

  if (downloadHref === null) return null;

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${name} 브라우저에서 열기`}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border-warm px-3 py-2 text-[13px] font-medium text-charcoal transition-colors hover:border-terracotta hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
      >
        열기
      </a>
      <a
        href={downloadHref}
        aria-label={`${name} 다운로드`}
        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-terracotta px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-terracotta-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
      >
        다운로드
      </a>
    </div>
  );
}
