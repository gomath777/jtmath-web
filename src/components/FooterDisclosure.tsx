'use client';

import { useState } from 'react';

export default function FooterDisclosure() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        <span className={`inline-block transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
        교습비 안내 및 반환 규정
      </button>

      {open && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/docs/tuition-info.jpg"
            alt="교습비 안내 및 반환 규정"
            className="w-full max-w-2xl rounded-lg opacity-80"
          />
        </div>
      )}
    </div>
  );
}
