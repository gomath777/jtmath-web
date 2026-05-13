#!/usr/bin/env npx tsx
/**
 * Notion 시그니처 개념강의 페이지 → ConceptLecture[] TS 코드 추출기
 *
 * 사용법:
 *   npm run admin:extract-notion -- --subject ds2
 *   npm run admin:extract-notion -- --subject gs2
 *
 * 동작:
 *   1. SUBJECT 별 14차시 Notion page UUID 14개 순차 fetch
 *   2. 각 페이지의 callout 블록에서 PDF filename + Bunny video GUID 추출
 *      - 📚 개념노트 callout → file/pdf 블록 (filename)
 *      - 📺 개념영상 callout → video/embed 블록 (Bunny iframe URL)
 *   3. 추출된 PDF 파일이 실제 Google Drive 폴더에 있는지 fs.existsSync 검증
 *   4. 콘솔에 ConceptLecture[] TS 코드 출력 → manifest 파일에 paste
 *
 * 환경변수:
 *   NOTION_TOKEN — .env.local 에서 자동 로드
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveDrivePath } from '../lib/concept-helpers.js';
import { parseArgs, error, info, warn, success } from '../_shared.js';

// ─── SUBJECT 별 14차시 → Notion page UUID + Drive 폴더 매핑 ─────────────────

interface PageSpec {
  session: number;
  title: string;
  pageId: string;     // Notion page UUID (32 hex with dashes)
  folder: string;     // Google Drive 상대 폴더 (예: '01_지수')
}

interface SubjectSpec {
  pdfBaseFolder: string;  // resolveDrivePath 기준 (예: 'content/ds_concept')
  pages: PageSpec[];
}

const SPECS: Record<string, SubjectSpec> = {
  ds2: {
    pdfBaseFolder: 'content/ds_concept',
    pages: [
      { session: 1,  title: '대수 1차시 1.1. 지수',                          pageId: '2d0bb791-5b71-80a6-b6f6-f7777a20af00', folder: '01_지수' },
      { session: 2,  title: '대수 2차시 1.1. 로그',                          pageId: '2d3bb791-5b71-80c9-968a-eba281f9b544', folder: '02_로그' },
      { session: 3,  title: '대수 3차시 지수함수, 로그함수',                 pageId: '051fb479-f5d7-455f-9557-6a2eb030de4b', folder: '03_지수함수_로그함수' },
      { session: 4,  title: '대수 4차시 지수로그함수 활용',                  pageId: '7206f708-45ae-4077-a57e-faf543af6d79', folder: '04_지수로그함수_활용' },
      { session: 5,  title: '대수 5차시 삼각함수',                           pageId: 'ae4c637e-722a-415a-aea6-7032f18f2f6d', folder: '05_삼각함수' },
      { session: 6,  title: '대수 6차시 2.1. 삼각함수의 그래프 (1)',         pageId: 'e8d9145e-4842-4af7-82ca-96c5119e1911', folder: '06_삼각함수_그래프_1' },
      { session: 7,  title: '대수 7차시 2.1. 삼각함수의 그래프 (2) 및 중단원 마무리', pageId: '9819c4ad-622e-4f56-8cba-d55458e39f4e', folder: '07_삼각함수_그래프_2' },
      { session: 8,  title: '대수 8차시 2.2. 사인법칙 코사인법칙',           pageId: '4c3e2962-c734-4015-a7c0-f728a1d033c0', folder: '08_사인_코사인법칙' },
      { session: 9,  title: '대수 9차시 2.2. 등차수열',                      pageId: '5935bd30-e8fc-4363-8009-731da419fa2c', folder: '09_등차수열' },
      { session: 10, title: '대수 10차시 3.1. 등비수열 및 중단원 마무리',    pageId: 'acd226a0-e544-4432-9edb-a004193e6933', folder: '10_등비수열' },
      { session: 11, title: '대수 11차시 3.2. 수열의 합: 합의 기호 ∑의 성질', pageId: '2f70f983-96db-4b6a-8da4-7be9a4975cc1', folder: '11_수열의합_시그마' },
      { session: 12, title: '대수 12차시 3.2. 수열의 합: 여러 가지 수열의 합 및 중단원 마무리', pageId: 'cbeb7b06-c0a0-4d9c-afab-d4de4b3ac409', folder: '12_여러가지수열의합' },
      { session: 13, title: '대수 13차시 3.3. 수열의 귀납적 정의',           pageId: '2d738da7-7469-4f4b-925d-bf7ff2b08aab', folder: '13_귀납적정의' },
      { session: 14, title: '대수 14차시 3.3. 수학적 귀납법',                pageId: '8aab2721-3770-4c1e-b31d-818807c76677', folder: '14_수학적귀납법' },
    ],
  },
  gs2: {
    pdfBaseFolder: 'content/gs2_concept',
    pages: [
      { session: 1,  title: '1차시 평면좌표 및 직선의 방정식',               pageId: '2d7bb791-5b71-80f8-8076-c396fc068b1f', folder: '01_평면좌표_직선' },
      { session: 2,  title: '2차시 평면좌표/직선 마무리 & 원의 기초',        pageId: '2d7bb791-5b71-80d7-a3ad-fcaefba48ec2', folder: '02_원의기초' },
      { session: 3,  title: '3차시 원의 방정식 (위치관계/접선)',             pageId: '2d7bb791-5b71-8062-a213-fe07a9a000ab', folder: '03_원의방정식' },
      { session: 4,  title: '4차시 원의 방정식 마무리 및 평행이동',          pageId: '2d7bb791-5b71-8023-8df7-ff5be2355fd3', folder: '04_원_평행이동' },
      { session: 5,  title: '5차시 대칭이동 및 도형의 방정식 총정리',        pageId: '2d7bb791-5b71-80b4-b228-e461b418322e', folder: '05_대칭이동_총정리' },
      { session: 6,  title: '6차시 집합의 뜻과 포함관계',                    pageId: '2d7bb791-5b71-8091-9e63-fec7ca27551b', folder: '06_집합' },
      { session: 7,  title: '7차시 여집합/차집합 및 집합 중단원 마무리',     pageId: '2d7bb791-5b71-80b5-b336-fa733e1576d8', folder: '07_집합_마무리' },
      { session: 8,  title: '8차시 명제와 조건 전체',                        pageId: '2d7bb791-5b71-8075-b0db-daea05278dec', folder: '09_명제' },
      { session: 9,  title: '9차시 명제의 증명 및 절대부등식',               pageId: '2d7bb791-5b71-8043-b622-d5cec2de1e6c', folder: '10_명제_절대부등식' },
      { session: 10, title: '10차시 집합과 명제 대단원 정리 및 함수 기초',   pageId: '2d7bb791-5b71-8091-ab3a-ef73e87be1dc', folder: '11_명제_대단원_함수기초' },
      { session: 11, title: '11차시 합성함수 기초 및 그래프 특강',           pageId: '2d7bb791-5b71-809f-8ae3-ef0ccb4d30c5', folder: '12_합성함수' },
      { session: 12, title: '12차시 역함수, 함수 중단원 정리',               pageId: '2d7bb791-5b71-8002-aa51-f9815a4cc977', folder: '13_역함수' },
      { session: 13, title: '13차시 유리함수 무리함수의 그래프',             pageId: '2d7bb791-5b71-8004-8a42-cba7e2aa063b', folder: '14_유리_무리함수' },
      { session: 14, title: '14차시 중단원, 대단원 마무리',                  pageId: '2d7bb791-5b71-8067-8da6-c060fb28ff98', folder: '15_함수_마무리' },
    ],
  },
};

// ─── Notion API ─────────────────────────────────────────────────────────────

const NOTION_API = 'https://api.notion.com/v1';
const BUNNY_URL_RE = /iframe\.mediadelivery\.net\/play\/\d+\/([a-f0-9-]+)/;

interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

async function fetchBlocks(blockId: string, token: string): Promise<NotionBlock[]> {
  const all: NotionBlock[] = [];
  let cursor: string | undefined = undefined;
  do {
    const url = `${NOTION_API}/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    });
    if (!res.ok) {
      throw new Error(`Notion API ${res.status} (${blockId}): ${await res.text()}`);
    }
    const data = await res.json() as { results: NotionBlock[]; has_more: boolean; next_cursor: string | null };
    all.push(...data.results);
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);
  return all;
}

/** 페이지 전체 (callout 포함 모든 자식) 에서 PDF·video 블록 평탄화 추출 */
async function walkAllBlocks(blockId: string, token: string): Promise<NotionBlock[]> {
  const top = await fetchBlocks(blockId, token);
  const flat: NotionBlock[] = [];
  for (const block of top) {
    flat.push(block);
    if (block.has_children) {
      const children = await walkAllBlocks(block.id, token);
      flat.push(...children);
    }
  }
  return flat;
}

function extractPdfFilename(block: NotionBlock): string | undefined {
  if (block.type !== 'file' && block.type !== 'pdf') return undefined;
  const b = block[block.type] as { name?: string; file?: { url?: string }; external?: { url?: string } };
  if (b.name) return b.name;
  const url = b.file?.url || b.external?.url;
  if (url) {
    try {
      const u = new URL(url);
      return decodeURIComponent(u.pathname.split('/').pop() || '');
    } catch { /* ignore */ }
  }
  return undefined;
}

function extractVideoGuid(block: NotionBlock): string | undefined {
  const checkUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    const m = url.match(BUNNY_URL_RE);
    return m ? m[1] : undefined;
  };
  if (block.type === 'video' || block.type === 'embed') {
    const b = block[block.type] as { url?: string; external?: { url?: string } };
    return checkUrl(b.url || b.external?.url);
  }
  if (block.type === 'bookmark') {
    const b = block.bookmark as { url?: string };
    return checkUrl(b.url);
  }
  if (block.type === 'link_preview') {
    const b = block.link_preview as { url?: string };
    return checkUrl(b.url);
  }
  return undefined;
}

interface PageContent {
  pdfs: string[];      // 페이지 등장 순서대로 PDF 파일명
  videos: string[];    // 페이지 등장 순서대로 Bunny GUID
}

async function extractPage(pageId: string, token: string): Promise<PageContent> {
  const all = await walkAllBlocks(pageId, token);
  const pdfs: string[] = [];
  const videos: string[] = [];
  for (const block of all) {
    const pdfName = extractPdfFilename(block);
    if (pdfName) pdfs.push(pdfName);
    const vidGuid = extractVideoGuid(block);
    if (vidGuid) videos.push(vidGuid);
  }
  return { pdfs, videos };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const subject = args.options.subject;

  if (!subject || !SPECS[subject]) {
    error(`--subject 옵션이 필요합니다 (ds2|gs2). 받은 값: "${subject ?? ''}"`);
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) error('NOTION_TOKEN 환경변수 필요 (.env.local 확인)');

  const spec = SPECS[subject];
  info(`Subject: ${subject}, base folder: ${spec.pdfBaseFolder}, pages: ${spec.pages.length}`);
  console.log('');

  const warnings: string[] = [];
  const lecturesCode: string[] = [];

  for (const page of spec.pages) {
    info(`[${page.session}차시] ${page.title} (${page.pageId})`);
    let content: PageContent;
    try {
      content = await extractPage(page.pageId, token);
    } catch (err) {
      error(`Notion fetch 실패: ${(err as Error).message}`);
    }

    if (content.pdfs.length === 0 && content.videos.length === 0) {
      warnings.push(`[${page.session}차시] 콘텐츠 0건 (callout 패턴 검토 필요)`);
    }

    // PDF 파일 존재 검증
    content.pdfs.forEach((filename, idx) => {
      const localPath = resolveDrivePath(`${spec.pdfBaseFolder}/${page.folder}/${filename}`);
      if (!fs.existsSync(localPath)) {
        warnings.push(`[${page.session}차시 pdf${idx}] 파일 없음: ${spec.pdfBaseFolder}/${page.folder}/${filename}`);
      }
    });

    // TS 코드 생성
    const titleEsc = page.title.replace(/'/g, "\\'");
    const videosCode = content.videos.map((guid, idx) =>
      `      { bunny_video_id: '${guid}', title: '${titleEsc} - ${idx + 1}', order_index: ${idx} },`,
    ).join('\n');
    const pdfsCode = content.pdfs.map(filename => [
      `      {`,
      `        relativePath: '${page.folder}/${filename.replace(/'/g, "\\'")}',`,
      `        filename: '${filename.replace(/'/g, "\\'")}',`,
      `      },`,
    ].join('\n')).join('\n');

    lecturesCode.push(
      [
        `  {`,
        `    session: ${page.session},`,
        `    title: '${titleEsc}',`,
        `    videos: [`,
        videosCode,
        `    ],`,
        `    pdfs: [`,
        pdfsCode,
        `    ],`,
        `  },`,
      ].join('\n'),
    );
  }

  // 출력
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`// ${subject.toUpperCase()}_CONCEPT_LECTURES — manifest 파일에 paste`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`export const ${subject.toUpperCase()}_CONCEPT_LECTURES: ConceptLecture[] = [`);
  console.log(lecturesCode.join('\n'));
  console.log('];');
  console.log('');

  // 경고 요약
  if (warnings.length > 0) {
    console.log('');
    warn(`⚠️  검증 경고 ${warnings.length}건:`);
    warnings.forEach(w => warn(`   ${w}`));
  } else {
    success(`모든 PDF 파일·영상 GUID 검증 통과 (${spec.pages.length}차시)`);
  }

  // 통계
  const totalVideos = lecturesCode.reduce((acc, code) => acc + (code.match(/bunny_video_id/g) || []).length, 0);
  const totalPdfs = lecturesCode.reduce((acc, code) => acc + (code.match(/filename:/g) || []).length, 0);
  info(`추출 통계: 14차시, ${totalVideos}개 영상, ${totalPdfs}개 PDF`);
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
