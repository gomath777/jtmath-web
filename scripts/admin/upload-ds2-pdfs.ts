/**
 * DS2 기출 PDF 일괄 (재)업로드
 *
 * 폴더 구조: ~/Google Drive/My Drive/0lecture_vid/ds2/{단원}/기출_PDF/*.pdf
 * 업로드 경로: sessions/ds2/{단원}/기출/{원본파일명}
 *
 * 사용법:
 *   npm run admin:upload-ds2-pdfs                      # 4단원 전체
 *   npm run admin:upload-ds2-pdfs -- --unit 04         # 04 단원만
 *   npm run admin:upload-ds2-pdfs -- --dry-run         # 인벤토리만 출력
 *   npm run admin:upload-ds2-pdfs -- --unit 04 --only "레벨3"  # 파일명에 "레벨3" 포함만
 *
 * 참고: [힌트북] 접두사 PDF는 자동 스킵 (이번 라운드 제외).
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseArgs, log, success, warn, info, dryRunBanner, error } from './_shared.js';
import { uploadPdfFromPath } from '../../src/utils/bunny-storage.js';

const DS2_ROOT = path.join(
  process.env.HOME || '',
  'Google Drive/My Drive/0lecture_vid/ds2',
);

const UNITS = [
  '01_지수와_로그',
  '02_지수함수_로그함수',
  '03_삼각함수',
  '04_삼각함수 활용',
];

interface UploadResult {
  filename: string;
  storagePath: string;
  cdnUrl: string;
  sizeMb: string;
  status: '✅' | '⏭' | '❌';
  note?: string;
}

function listPdfs(unitDir: string): string[] {
  const pdfDir = path.join(unitDir, '기출_PDF');
  if (!fs.existsSync(pdfDir)) return [];
  return fs
    .readdirSync(pdfDir)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort();
}

async function processUnit(
  unit: string,
  isDryRun: boolean,
  onlyFilter: string | null,
): Promise<UploadResult[]> {
  const unitDir = path.join(DS2_ROOT, unit);
  const pdfDir = path.join(unitDir, '기출_PDF');
  const pdfs = listPdfs(unitDir);

  console.log('');
  console.log(`📂 ${unit} (${pdfs.length}개 PDF 발견)`);

  const results: UploadResult[] = [];

  for (const filename of pdfs) {
    const localPath = path.join(pdfDir, filename);
    const stat = fs.statSync(localPath);
    const sizeMb = (stat.size / 1024 / 1024).toFixed(2);
    // macOS는 NFD로 저장 → Bunny에는 NFC로 통일
    const nfcName = filename.normalize('NFC');
    const storagePath = `sessions/ds2/${unit}/기출/${nfcName}`;
    const cdnUrl = `https://${process.env.BUNNY_CDN_HOSTNAME_PDF || 'mathgo-pdfs.b-cdn.net'}/${storagePath
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;

    // [힌트북] 접두사 스킵
    if (/^\[힌트북\]/.test(nfcName) || /^고T\s*힌트북/.test(nfcName) || /^고T의\s*힌트북/.test(nfcName)) {
      results.push({
        filename: nfcName,
        storagePath,
        cdnUrl,
        sizeMb,
        status: '⏭',
        note: '힌트북 — 이번 라운드 스킵 (추후 재제작)',
      });
      console.log(`  ⏭ ${nfcName}  (힌트북 스킵)`);
      continue;
    }

    // --only 필터
    if (onlyFilter && !nfcName.includes(onlyFilter)) {
      results.push({
        filename: nfcName,
        storagePath,
        cdnUrl,
        sizeMb,
        status: '⏭',
        note: `--only "${onlyFilter}" 필터 미일치`,
      });
      console.log(`  ⏭ ${nfcName}  (--only 필터)`);
      continue;
    }

    if (isDryRun) {
      console.log(`  🔍 ${nfcName}  → ${storagePath}  (${sizeMb}MB)`);
      results.push({
        filename: nfcName,
        storagePath,
        cdnUrl,
        sizeMb,
        status: '✅',
        note: 'DRY RUN',
      });
      continue;
    }

    try {
      const start = Date.now();
      const { skipped } = await uploadPdfFromPath(localPath, storagePath, { force: true });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ✅ ${nfcName}  (${sizeMb}MB, ${elapsed}s${skipped ? ', skipped' : ', force=true'})`);
      results.push({
        filename: nfcName,
        storagePath,
        cdnUrl,
        sizeMb,
        status: '✅',
        note: skipped ? 'skipped' : `force=true 덮어쓰기 (${elapsed}s)`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ❌ ${nfcName}  → ${msg}`);
      results.push({
        filename: nfcName,
        storagePath,
        cdnUrl,
        sizeMb,
        status: '❌',
        note: msg,
      });
    }
  }

  return results;
}

function writeMarker(unit: string, results: UploadResult[], isDryRun: boolean): void {
  if (isDryRun) return;
  const date = new Date().toISOString().slice(0, 10);
  const unitNum = unit.match(/^(\d+)/)?.[1] || unit.split('_')[0];
  const markerName = `_업로드완료_${date}_DS2-${unitNum}-기출PDF.txt`;
  const markerPath = path.join(DS2_ROOT, unit, '기출_PDF', markerName);

  const now = new Date();
  const stamp = `${date} ${now.toTimeString().slice(0, 8)}`;
  const okCount = results.filter((r) => r.status === '✅' && r.note !== 'DRY RUN').length;
  const skipCount = results.filter((r) => r.status === '⏭').length;
  const failCount = results.filter((r) => r.status === '❌').length;

  const lines: string[] = [];
  lines.push(`업로드 완료: ${stamp}`);
  lines.push(`단원: ds2/${unit} (기출 PDF)`);
  lines.push(`Bunny 경로 prefix: sessions/ds2/${unit}/기출/`);
  lines.push(`결과: ✅ ${okCount} / ⏭ ${skipCount} / ❌ ${failCount}`);
  lines.push('');
  lines.push('파일별:');
  for (const r of results) {
    lines.push(`${r.status} ${r.filename}  (${r.sizeMb}MB)`);
    lines.push(`   → ${r.cdnUrl}`);
    if (r.note) lines.push(`   note: ${r.note}`);
  }
  lines.push('');
  lines.push('스크립트: scripts/admin/upload-ds2-pdfs.ts');
  lines.push(`재실행: npm run admin:upload-ds2-pdfs -- --unit "${unit}"`);
  lines.push('실패 항목만 재시도: --only "<파일명 일부>" 추가');

  fs.writeFileSync(markerPath, lines.join('\n') + '\n', 'utf-8');
  info(`마커 작성: ${markerName}`);
}

async function main() {
  const args = parseArgs();
  if (args.flags.has('help')) {
    console.log(
      '사용법: npm run admin:upload-ds2-pdfs -- [--unit <01|04|...>] [--only <문자열>] [--dry-run]',
    );
    process.exit(0);
  }

  if (!fs.existsSync(DS2_ROOT)) {
    error(`DS2 폴더 없음: ${DS2_ROOT}`);
  }

  const isDryRun = args.flags.has('dry-run');
  const unitFilter = args.options.unit || null; // "01" 또는 "04_..."
  const onlyFilter = args.options.only || null;
  dryRunBanner(isDryRun);

  const targetUnits = unitFilter
    ? UNITS.filter((u) => u.startsWith(unitFilter) || u === unitFilter)
    : UNITS;

  if (targetUnits.length === 0) {
    error(`--unit "${unitFilter}"에 매칭되는 단원 없음. 가능: ${UNITS.join(', ')}`);
  }

  log('🚀', `DS2 기출 PDF 업로드 시작 (단원 ${targetUnits.length}개${isDryRun ? ', DRY RUN' : ''})`);

  let totalOk = 0,
    totalSkip = 0,
    totalFail = 0;

  for (const unit of targetUnits) {
    const results = await processUnit(unit, isDryRun, onlyFilter);
    writeMarker(unit, results, isDryRun);
    totalOk += results.filter((r) => r.status === '✅' && r.note !== 'DRY RUN').length;
    totalSkip += results.filter((r) => r.status === '⏭').length;
    totalFail += results.filter((r) => r.status === '❌').length;
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  success(`완료: ${totalOk}개 업로드 / ⏭ ${totalSkip} 스킵 / ❌ ${totalFail} 실패`);
  if (totalFail > 0) {
    warn('실패 항목은 마커 파일에서 확인하고 --only 인자로 재시도');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
