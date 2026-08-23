import { createServer } from 'http';
import { join } from 'path';
import { qaCss } from './browser-qa-css';
import { aliasSrcPlugin, createBrowserQaBundle, drain, isUnknownRecord, readRequestJson, sendBundle, sendHtml, sendJson } from './browser-qa-core';

export type LessonQaServer = {
  readonly baseUrl: string;
  readonly close: () => Promise<void>;
  readonly calls: () => readonly LessonTutorApiCall[];
};

export type LessonTutorApiCall = {
  readonly lessonSlug: string;
  readonly message: string;
  readonly selectedMaterialKey?: string;
};

export async function createLessonPageBundle(workDir: string): Promise<void> {
  await createBrowserQaBundle({
    workDir,
    entryName: 'lesson-page-qa-entry.tsx',
    entrySource: entrySource(),
    plugins: [aliasSrcPlugin()],
  });
}

export async function startLessonQaServer(workDir: string): Promise<LessonQaServer> {
  const calls: LessonTutorApiCall[] = [];
  const server = createServer(async (request, response) => {
    try {
      if (request.url === '/bundle.js') {
        await sendBundle(response, workDir);
        return;
      }
      if (request.url === '/api/public/student/ai-tutor' && request.method === 'POST') {
        calls.push(toTutorApiCall(await readRequestJson(request)));
        sendJson(response, {
          status: 'answered',
          message: '힌트: $\\\\frac{1}{2}$ 값을 먼저 확인해 보세요.',
          resolvedTarget: { contextKey: 'synthetic-context', materialKey: 'm-1-content-pdfs-0', problemNumber: 2 },
        });
        return;
      }
      if (request.url === '/api/synthetic-progress' && request.method === 'POST') {
        await drain(request);
        sendJson(response, { ok: true });
        return;
      }
      sendHtml(response, 'Lesson QA', qaCss());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'synthetic QA server error';
      sendJson(response, { error: message }, 500);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address !== 'object' || address === null) throw new Error('QA server did not bind');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    calls: () => calls,
  };
}

function toTutorApiCall(value: unknown): LessonTutorApiCall {
  if (!isUnknownRecord(value)) return { lessonSlug: '', message: '' };
  const selectedMaterialKey = value['selectedMaterialKey'];
  return {
    lessonSlug: typeof value['lessonSlug'] === 'string' ? value['lessonSlug'] : '',
    message: typeof value['message'] === 'string' ? value['message'] : '',
    ...(typeof selectedMaterialKey === 'string' ? { selectedMaterialKey } : {}),
  };
}

function entrySource(): string {
  return `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import LessonContent from ${JSON.stringify(join(process.cwd(), 'src/app/lesson/[slug]/LessonContent.tsx'))};
    const blocks = [{
      id: 'synthetic-content-group',
      block_type: 'content_group',
      order_index: 1,
      content: {
        label: '삼각함수 대표문항',
        page_range: '12-15쪽',
        pdfs: [
          { original_name: '삼각함수 레벨1.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/synthetic-lv1.pdf', file_size: '1.2 MB' },
          { original_name: '삼각함수 레벨2.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/synthetic-lv2.pdf', file_size: '1.4 MB' }
        ],
        videos: [
          { bunny_video_id: '11111111-1111-4111-8111-111111111111', title: '2번 사인법칙 해설', problem_number: 2, order_index: 1, duration_seconds: 615 },
          { bunny_video_id: '22222222-2222-4222-8222-222222222222', title: '3번 코사인법칙 해설', problem_number: 3, order_index: 2, duration_seconds: 502 }
        ]
      }
    }];
    const progress = { '11111111-1111-4111-8111-111111111111': { watch_percent: 20, completed: false } };
    const tutorMaterials = [
      { materialKey: 'm-1-content-pdfs-0', level: 1, label: '삼각함수 레벨1', fileName: '삼각함수 레벨1.pdf', order: 1 },
      { materialKey: 'm-1-content-pdfs-1', level: 2, label: '삼각함수 레벨2', fileName: '삼각함수 레벨2.pdf', order: 2 }
    ];
    const tutorContext = {
      contextKey: 'synthetic-context',
      lessonSlug: 'synthetic-trig',
      subjectSlug: 'ds2',
      unit: '삼각함수',
      lessonTitle: '삼각함수',
      variant: 'default',
      materials: tutorMaterials
    };
    const rootElement = document.getElementById('root');
    if (!rootElement) throw new Error('root missing');
    createRoot(rootElement).render(
      <main className="min-h-[100dvh] bg-parchment px-5 py-8 text-ink">
        <div className="mx-auto max-w-3xl">
          <LessonContent
            lessonSlug="synthetic-trig"
            heading="삼각함수"
            subjectLabel="대수"
            subjectSlug="ds2"
            blocks={blocks}
            progress={progress}
            progressEndpoint="/api/synthetic-progress"
            assignedDate="2026-08-21"
            isAuthenticated={true}
            tutorContext={tutorContext}
          />
        </div>
      </main>
    );
  `;
}
