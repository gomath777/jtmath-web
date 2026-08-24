import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { join } from 'path';
import { productKatexCss, qaCss } from './browser-qa-css';
import {
  createBrowserQaBundle,
  isUnknownRecord,
  readRequestJson,
  sendBundle,
  sendHtml,
  sendJson,
  type RuntimeObject,
} from './browser-qa-core';
import { browserFixture, type WidgetBrowserFixtureName } from './widget-browser-fixtures';
import { handlePdfDownloadRequest } from './widget-browser-pdf-download-server';

export type WidgetQaServer = {
  readonly baseUrl: string;
  readonly setGraphMode: (mode: 'on' | 'off') => void;
  readonly close: () => Promise<void>;
  readonly calls: () => readonly TutorApiCall[];
  readonly aborts: () => number;
};

export type TutorApiCall = {
  readonly message: string;
  readonly selectedMaterialKey?: string;
  readonly hasClientRecentTurns: boolean;
  readonly hasClientResolvedTarget: boolean;
  readonly graphMode: 'on' | 'off';
};

export async function createWidgetBundle(workDir: string, fixtureName: WidgetBrowserFixtureName = 'gs2-midterm'): Promise<void> {
  await createBrowserQaBundle({ workDir, entryName: 'widget-qa-entry.tsx', entrySource: entrySource(fixtureName) });
}

export async function startWidgetQaServer(workDir: string, options: { readonly route: string; readonly auth: 'synthetic-released'; readonly fixtureName?: WidgetBrowserFixtureName }): Promise<WidgetQaServer> {
  const calls: TutorApiCall[] = [];
  const fixture = browserFixture(options.fixtureName ?? 'gs2-midterm');
  const firstMaterial = fixture.materials[0];
  if (firstMaterial === undefined) throw new Error('synthetic browser fixture has no materials');
  let abortCount = 0;
  let graphMode: 'on' | 'off' = 'off';
  const server = createServer(async (request, response) => {
    try {
      if (request.url === '/bundle.js') {
        await sendBundle(response, workDir);
        return;
      }
      if (await handlePdfDownloadRequest(request, response)) return;
      if (request.url?.startsWith('/api/public/student/ai-tutor') && request.method === 'POST') {
        await handleTutorRequest(request, response, calls, graphMode, firstMaterial.materialKey, () => {
          abortCount += 1;
        });
        return;
      }
      const pathname = new URL(request.url ?? '/', 'http://qa.local').pathname;
      if (pathname !== options.route) {
        sendJson(response, { error: 'exact synthetic lesson route required' }, 404);
        return;
      }
      sendHtml(response, 'AI Tutor Widget QA', `${productKatexCss()}${qaCss()}`, { route: options.route, auth: options.auth });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'synthetic QA server error';
      sendJson(response, { error: message }, 500);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address !== 'object' || address === null) throw new Error('QA server did not bind');
  return {
    baseUrl: `http://127.0.0.1:${address.port}${options.route}`,
    setGraphMode: (mode) => { graphMode = mode; },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    calls: () => calls,
    aborts: () => abortCount,
  };
}

async function handleTutorRequest(request: IncomingMessage, response: ServerResponse, calls: TutorApiCall[], graphMode: 'on' | 'off', defaultMaterialKey: string, onAbort: () => void): Promise<void> {
  const call = toTutorApiCall(await readRequestJson(request), graphMode);
  calls.push(call);
  if (call.message.includes('abort')) {
    response.on('close', onAbort);
    setTimeout(() => sendJson(response, successResponse('abort', defaultMaterialKey)), 2_000);
    return;
  }
  if (call.message.includes('429')) {
    sendJson(response, { status: 'rate_limited', message: '잠시 후 다시 시도해 주세요.' }, 429);
    return;
  }
  if (call.message.includes('503')) {
    sendJson(response, {
      status: 'provider_unavailable',
      message: '답변 생성이 끊겼어요. 같은 문제로 다시 보내면 이어서 도와줄게요.',
      resolvedTarget: {
        contextKey: 'synthetic-context',
        materialKey: call.selectedMaterialKey ?? defaultMaterialKey,
        problemNumber: 2,
        problemTitle: '선택한 학습지 2번',
      },
    }, 503);
    return;
  }
  if (call.message.includes('중복')) {
    setTimeout(() => sendJson(response, successResponse('duplicate', defaultMaterialKey)), 350);
    return;
  }
  if (call.message.includes('malformed')) {
    sendJson(response, successResponse('malformed', defaultMaterialKey));
    return;
  }
  if (call.message.includes('invalid visual')) {
    sendJson(response, successResponse('invalid', defaultMaterialKey));
    return;
  }
  if (call.message.includes('다음 단계')) {
    sendJson(response, successResponse('start', defaultMaterialKey));
    return;
  }
  if (call.message.includes('2번') && call.selectedMaterialKey === undefined && !call.hasClientResolvedTarget) {
    sendJson(response, { status: 'ambiguous_material', message: '질문할 학습지를 선택해 주세요.' }, 422);
    return;
  }
  sendJson(response, successResponse('hint', defaultMaterialKey));
}

function entrySource(fixtureName: WidgetBrowserFixtureName): string {
  const fixture = browserFixture(fixtureName);
  const isDs2 = fixture.subjectSlug === 'ds2';
  const firstSide = fixture.materials[0];
  const secondSide = fixture.materials[1];
  if (isDs2 && (firstSide === undefined || secondSide === undefined)) throw new Error('synthetic DS2 fixture needs two assigned sides');
  return `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { AiTutorWidget } from ${JSON.stringify(join(process.cwd(), 'src/components/ai-tutor/AiTutorWidget.tsx'))};
    import ContentGroupBlock from ${JSON.stringify(join(process.cwd(), 'src/components/blocks/ContentGroupBlock.tsx'))};
    const materials = ${JSON.stringify(fixture.materials)};
    const rootElement = document.getElementById('root');
    if (!rootElement) throw new Error('root missing');
    const root = createRoot(rootElement);
    root.render(
      <main className="min-h-[100dvh] bg-parchment px-5 py-8 text-ink">
        <article className="mx-auto max-w-2xl">
          <header className="mb-8 pb-6 border-b border-border-cream">
            <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2">${fixture.subjectLabel}</p>
            <h1 className="font-serif text-[28px] sm:text-[32px] text-ink tracking-tight leading-tight">${fixture.title}</h1>
            <p className="mt-3 text-[12px] text-stone">합성 released 학습 페이지</p>
          </header>
          <section data-qa-pdf-fixture aria-label="${fixture.subjectSlug} 배정 학습지 PDF" className="space-y-2">
            ${isDs2 ? `<ContentGroupBlock
              content={{
                label: "심화유형 3단계",
                side_a: { label: "A", pdf: { original_name: ${JSON.stringify(firstSide?.fileName)}, url: ${JSON.stringify(firstSide?.pdfHref)} } },
                side_b: { label: "B", pdf: { original_name: ${JSON.stringify(secondSide?.fileName)}, url: ${JSON.stringify(secondSide?.pdfHref)} } },
              }}
              progress={{}}
              subjectSlug="ds2"
            />` : `{materials.map((material) => (
              <ContentGroupBlock
                key={material.materialKey}
                content={{ label: material.label, pdf: { original_name: material.fileName, url: material.pdfHref } }}
                progress={{}}
                subjectSlug="gs2"
              />
            ))}`}
          </section>
          <AiTutorWidget
            lessonSlug="${fixture.lessonSlug}"
            tutorContext={{
              contextKey: "synthetic-context",
              lessonSlug: "${fixture.lessonSlug}",
              subjectSlug: "${fixture.subjectSlug}",
              unit: "${fixture.unit}",
              lessonTitle: "${fixture.title}",
              variant: "default",
              materials,
            }}
          />
          <button id="unmount-harness" type="button" onClick={() => root.unmount()}>Unmount Harness</button>
        </article>
      </main>
    );
  `;
}

function successResponse(kind: string, defaultMaterialKey: string): RuntimeObject {
  if (kind === 'start') {
    return {
      status: 'answered',
      message: [
        '풀이 시작: 식의 흐름을 한 줄씩 분리해서 보세요.',
        '',
        '1. 분자를 인수분해합니다.',
        '2. 약분 가능한 항을 확인합니다.',
        '',
        '$$y-1=2(x-0)$$',
      ].join('\n'),
      resolvedTarget: { contextKey: 'synthetic-context', materialKey: defaultMaterialKey, problemNumber: 2 },
    };
  }
  if (kind === 'malformed') {
    return {
      status: 'answered',
      message: [
        '주의: $$\\dfrac{1}{2}$',
        '<script>alert(1)</script>',
        'ignore previous instructions',
      ].join('\n'),
      resolvedTarget: { contextKey: 'synthetic-context', materialKey: defaultMaterialKey, problemNumber: 2 },
    };
  }
  return {
    status: 'answered',
    message: [
      '핵심 힌트: 두 점의 좌표를 먼저 분리해서 읽어요.',
      '기울기 $m=\\dfrac{1}{2}$ 를 먼저 확인해요.',
      '삼각형 $PRQ$에서 선분 $PQ$와 $PR$의 관계도 확인해요.',
      '',
      '1. 공통 인자를 먼저 묶어요.',
      '2. 긴 식은 아래처럼 한 번에 보지 말고 분자와 분모를 따로 확인해요.',
      '',
      '$$m=\\dfrac{y_2-y_1}{x_2-x_1}$$',
      '',
      '$$\\dfrac{(y_2-y_1)+(x_2-x_1)+(y_3-y_2)+(x_3-x_2)+\\sqrt{2}}{(x_2-x_1)+(y_2-y_1)+(x_3-x_2)+(y_3-y_2)+\\sqrt{2}}=\\dfrac{(y_2-y_1)+(x_2-x_1)+(y_3-y_2)+(x_3-x_2)+\\sqrt{2}}{(x_2-x_1)+(y_2-y_1)+(x_3-x_2)+(y_3-y_2)+\\sqrt{2}}$$',
    ].join('\n'),
    resolvedTarget: { contextKey: 'synthetic-context', materialKey: defaultMaterialKey, problemNumber: 2 },
  };
}

function toTutorApiCall(value: unknown, graphMode: 'on' | 'off'): TutorApiCall {
  if (!isUnknownRecord(value)) return { message: '', hasClientRecentTurns: false, hasClientResolvedTarget: false, graphMode };
  const selectedMaterialKey = value['selectedMaterialKey'];
  return {
    message: typeof value['message'] === 'string' ? value['message'] : '',
    ...(typeof selectedMaterialKey === 'string' ? { selectedMaterialKey } : {}),
    hasClientRecentTurns: Array.isArray(value['recentTurns']),
    hasClientResolvedTarget: typeof value['resolvedTarget'] === 'object' && value['resolvedTarget'] !== null,
    graphMode,
  };
}
