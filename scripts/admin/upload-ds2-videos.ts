/**
 * DS2 레벨3 영상 일괄 업로드 (Bunny Stream + exam_videos upsert)
 *
 * 폴더: ~/Google Drive/My Drive/0lecture_vid/ds2/{단원}/레벨3_영상/*.mp4
 *
 * 파일명 패턴:
 *   "24년 6월 고2 27번 해설강의 24060227 ds2 1.mp4"
 *     → year=2024, month=6, grade=2, problem=27, file_code=24060227, sequence=1
 *   "1.1 대수 기출2 지수로그 레벨3 1-5번.mp4"
 *     → 챕터 통합 영상 — 이번 라운드 스킵
 *
 * 사용법:
 *   npm run admin:upload-ds2-videos -- --dry-run
 *   npm run admin:upload-ds2-videos -- --unit 04
 *   npm run admin:upload-ds2-videos -- --unit 04 --only "27번"
 *
 * 동일 (subject_slug, year, month, grade, problem) 키 row가 exam_videos에 있으면
 * 업로드 전 삭제 후 새 bunny_video_id로 INSERT (이전 영상 정리).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { parseArgs, log, success, warn, info, dryRunBanner, error, getServiceClient } from './_shared.js';

const VID_ROOT = path.join(process.env.HOME || '', 'Google Drive/My Drive/0lecture_vid');
// 기출/심화 해설강의는 EXAM 라이브러리(622509)로 통일.
// 5/7 e7a1a73 fix 후 앱은 EXAM_LIBRARY_ID 임베드. 이전(4/28)에 BUNNY_LIBRARY_ID(566809)로 잘못 올라간 영상은 --reupload 로 다시 올려 정정.
const LIBRARY_ID = process.env.BUNNY_EXAM_LIBRARY_ID || '622509';
const API_KEY = process.env.BUNNY_EXAM_API_KEY || '';

// 과목별 메타. subject 인자로 결정. --subject ds2 (대수) | gs1 (공통수학1) | gs2 (공통수학2) | mj1 ...
const SUBJECT_META: Record<string, { koreanName: string; root: string }> = {
  ds2: { koreanName: '대수', root: 'ds2' },
  gs1: { koreanName: '공통수학1', root: 'gs1' },
  gs2: { koreanName: '공통수학2', root: 'gs2' },
};

interface ParsedVideo {
  filename: string;
  localPath: string;
  sizeMb: string;
  isChapter: boolean;
  // 개별 기출 영상만 채워짐
  year?: number;
  month?: number;
  grade?: number;
  problem?: number;
  fileCode?: string;
  sequence?: number;
}

interface VideoResult extends ParsedVideo {
  status: '✅' | '⏭' | '❌';
  bunnyVideoId?: string;
  note?: string;
}

function parseFilename(filename: string, subject: string, unit: string, level: number): ParsedVideo | null {
  const nfc = filename.normalize('NFC');
  const subjectRoot = path.join(VID_ROOT, SUBJECT_META[subject].root);
  const stat = fs.statSync(path.join(subjectRoot, unit, `레벨${level}_영상`, filename));
  const sizeMb = (stat.size / 1024 / 1024).toFixed(1);
  const base: ParsedVideo = {
    filename: nfc,
    localPath: path.join(subjectRoot, unit, `레벨${level}_영상`, filename),
    sizeMb,
    isChapter: false,
  };

  // 챕터 통합 영상: "1.5 대수 기출2 ..." 또는 "X.Y <과목> ..."
  const koreanName = SUBJECT_META[subject].koreanName;
  if (new RegExp(`^\\d+\\.\\d+\\s+${koreanName}`).test(nfc)) {
    return { ...base, isChapter: true };
  }

  // 개별 기출 영상: "24년 6월 고2 27번 해설강의 24060227 ds2 1.mp4"
  // 또는 "16년 3월 고3 17번 이과 해설강의 16030317 gs1.mp4" (이과/문과 — 번 뒤)
  // 또는 "15년 3월 고2 이과 28번 해설강의 15030228e ds2.mp4" (옛 형식: 이과/문과는 번 앞, file_code 뒤에 e/m 접미)
  const m = nfc.match(
    /^(\d{2})년\s*(\d{1,2})월\s*고(\d)\s*(?:(?:이과|문과)\s+)?(\d+)번\s*(?:이과|문과)?\s*해설강의\s*(\d{8})[em]?\s+(\w+)(?:\s+(\d+))?\.mp4$/,
  );
  if (!m) {
    return null; // 알 수 없는 패턴
  }
  const [, yy, mm, gg, pp, code, , seq] = m;
  return {
    ...base,
    year: 2000 + parseInt(yy),
    month: parseInt(mm),
    grade: parseInt(gg),
    problem: parseInt(pp),
    fileCode: code,
    sequence: seq ? parseInt(seq) : 1,
  };
}

function listVideos(subject: string, unit: string, level: number): string[] {
  const dir = path.join(VID_ROOT, SUBJECT_META[subject].root, unit, `레벨${level}_영상`);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.mp4'))
    .sort();
}

async function createBunnyVideo(title: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify({ title }), 'utf-8');
    const req = https.request(
      {
        hostname: 'video.bunnycdn.com',
        path: `/library/${LIBRARY_ID}/videos`,
        method: 'POST',
        headers: {
          AccessKey: API_KEY,
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': data.length,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body).guid);
            } catch (e) {
              reject(new Error(`createVideo parse error: ${body}`));
            }
          } else {
            reject(new Error(`createVideo failed: ${res.statusCode} ${body}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function uploadBunnyVideoContent(guid: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);
    const req = https.request(
      {
        hostname: 'video.bunnycdn.com',
        path: `/library/${LIBRARY_ID}/videos/${guid}`,
        method: 'PUT',
        headers: { AccessKey: API_KEY, 'Content-Length': stat.size },
        timeout: 30 * 60 * 1000, // 30분
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`upload failed: ${res.statusCode} ${body}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('upload timeout (30min)')));
    stream.pipe(req);
  });
}

async function processUnit(
  subject: string,
  unit: string,
  level: number,
  isDryRun: boolean,
  onlyFilter: string | null,
): Promise<VideoResult[]> {
  const videos = listVideos(subject, unit, level);
  console.log('');
  console.log(`📂 ${subject}/${unit} 레벨${level} (${videos.length}개 영상 발견)`);

  const supabase = isDryRun ? null : getServiceClient();
  const results: VideoResult[] = [];
  const unitNum = unit.match(/^(\d+)/)?.[1] || unit.split('_')[0];
  const chapterFolder = `${subject}/${unit}`;
  const subjectRoot = path.join(VID_ROOT, SUBJECT_META[subject].root);

  for (const filename of videos) {
    const parsed = parseFilename(filename, subject, unit, level);
    if (!parsed) {
      console.log(`  ❓ ${filename}  (파일명 패턴 인식 실패)`);
      results.push({
        filename,
        localPath: path.join(subjectRoot, unit, `레벨${level}_영상`, filename),
        sizeMb: '?',
        isChapter: false,
        status: '❌',
        note: '파일명 패턴 인식 실패',
      });
      continue;
    }

    if (parsed.isChapter) {
      console.log(`  ⏭ ${parsed.filename}  (챕터 통합 영상 — 이번 라운드 스킵)`);
      results.push({ ...parsed, status: '⏭', note: '챕터 통합 영상 스킵' });
      continue;
    }

    if (onlyFilter && !parsed.filename.includes(onlyFilter)) {
      results.push({ ...parsed, status: '⏭', note: `--only "${onlyFilter}" 미일치` });
      console.log(`  ⏭ ${parsed.filename}  (--only 필터)`);
      continue;
    }

    if (isDryRun) {
      console.log(
        `  🔍 ${parsed.filename}  → year=${parsed.year} month=${parsed.month} 고${parsed.grade} ${parsed.problem}번 (${parsed.sizeMb}MB)`,
      );
      results.push({ ...parsed, status: '✅', note: 'DRY RUN' });
      continue;
    }

    try {
      // 기존 매칭 row 정리 (이전 bunny_video_id 무효화)
      const { data: existing, error: selErr } = await supabase!
        .from('exam_videos')
        .select('id, bunny_video_id')
        .eq('subject_slug', subject)
        .eq('year', parsed.year)
        .eq('month', parsed.month)
        .eq('grade', parsed.grade)
        .eq('problem', parsed.problem);
      if (selErr) throw new Error(`select 실패: ${selErr.message}`);

      let cleanupNote = '';
      if (existing && existing.length > 0) {
        const oldIds = existing.map((r) => r.bunny_video_id).join(', ');
        const { error: delErr } = await supabase!
          .from('exam_videos')
          .delete()
          .in(
            'id',
            existing.map((r) => r.id),
          );
        if (delErr) throw new Error(`기존 row 삭제 실패: ${delErr.message}`);
        cleanupNote = ` (기존 ${existing.length}건 삭제: ${oldIds})`;
      }

      const start = Date.now();
      const title = parsed.filename.replace(/\.mp4$/i, '');
      const guid = await createBunnyVideo(title);
      await uploadBunnyVideoContent(guid, parsed.localPath);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      const { error: insErr } = await supabase!.from('exam_videos').insert({
        bunny_video_id: guid,
        title,
        file_code: parsed.fileCode,
        subject: SUBJECT_META[subject].koreanName,
        subject_slug: subject,
        chapter_folder: chapterFolder,
        year: parsed.year,
        month: parsed.month,
        grade: parsed.grade,
        problem: parsed.problem,
        exam_type: `고${parsed.grade}`,
        sequence: parsed.sequence,
        is_chapter_summary: false,
        file_path: `${chapterFolder}/레벨${level}_영상/${parsed.filename}`,
        is_published: true,
      });
      if (insErr) throw new Error(`exam_videos insert 실패: ${insErr.message}`);

      console.log(
        `  ✅ ${parsed.filename}  (${parsed.sizeMb}MB, ${elapsed}s, guid=${guid.slice(0, 8)})${cleanupNote}`,
      );
      results.push({
        ...parsed,
        status: '✅',
        bunnyVideoId: guid,
        note: `업로드 + exam_videos INSERT (${elapsed}s)${cleanupNote}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ❌ ${parsed.filename}  → ${msg}`);
      results.push({ ...parsed, status: '❌', note: msg });
    }
  }

  return results;
}

function writeMarker(subject: string, unit: string, level: number, results: VideoResult[], isDryRun: boolean): void {
  if (isDryRun) return;
  const date = new Date().toISOString().slice(0, 10);
  const unitNum = unit.match(/^(\d+)/)?.[1] || unit.split('_')[0];
  const markerName = `_업로드완료_${date}_${subject.toUpperCase()}-${unitNum}-레벨${level}영상_${LIBRARY_ID}.txt`;
  const markerPath = path.join(VID_ROOT, SUBJECT_META[subject].root, unit, `레벨${level}_영상`, markerName);

  const stamp = `${date} ${new Date().toTimeString().slice(0, 8)}`;
  const okCount = results.filter((r) => r.status === '✅' && r.note !== 'DRY RUN').length;
  const skipCount = results.filter((r) => r.status === '⏭').length;
  const failCount = results.filter((r) => r.status === '❌').length;

  const lines: string[] = [];
  lines.push(`업로드 완료: ${stamp}`);
  lines.push(`단원: ${subject}/${unit} (레벨${level} 영상)`);
  lines.push(`Bunny Stream Library: ${LIBRARY_ID}`);
  lines.push(`결과: ✅ ${okCount} / ⏭ ${skipCount} / ❌ ${failCount}`);
  lines.push('');
  lines.push('파일별:');
  for (const r of results) {
    lines.push(`${r.status} ${r.filename}  (${r.sizeMb}MB)`);
    if (r.year) {
      lines.push(`   meta: year=${r.year} month=${r.month} 고${r.grade} ${r.problem}번 file_code=${r.fileCode}`);
    }
    if (r.bunnyVideoId) {
      lines.push(`   bunny_video_id: ${r.bunnyVideoId}`);
    }
    if (r.note) lines.push(`   note: ${r.note}`);
  }
  lines.push('');
  lines.push('스크립트: scripts/admin/upload-ds2-videos.ts');
  lines.push(`재실행: npm run admin:upload-ds2-videos -- --unit "${unit}" --level ${level}`);
  lines.push('실패만 재시도: --only "<문자열>" 추가');

  fs.writeFileSync(markerPath, lines.join('\n') + '\n', 'utf-8');
  info(`마커 작성: ${markerName}`);
}

async function main() {
  const args = parseArgs();
  if (args.flags.has('help')) {
    console.log('사용법: npm run admin:upload-ds2-videos -- --subject <ds2|gs1|gs2> --unit <NN_*> --level 3|4 [--only <문자열>] [--dry-run]');
    process.exit(0);
  }

  const subject = args.options.subject || 'ds2';
  if (!SUBJECT_META[subject]) error(`--subject 미지원: ${subject} (지원: ${Object.keys(SUBJECT_META).join(', ')})`);
  const subjectRoot = path.join(VID_ROOT, SUBJECT_META[subject].root);
  if (!fs.existsSync(subjectRoot)) error(`폴더 없음: ${subjectRoot}`);
  if (!API_KEY) error('BUNNY_EXAM_API_KEY 환경변수 없음 (.env.local 확인)');

  const isDryRun = args.flags.has('dry-run');
  const unitFilter = args.options.unit || null;
  const onlyFilter = args.options.only || null;
  const level = parseInt(args.options.level || '3', 10);
  if (![3, 4].includes(level)) error('--level 은 3 또는 4');
  dryRunBanner(isDryRun);

  // 과목 폴더에서 단원 자동 스캔 (NN_*)
  const allUnits = fs.readdirSync(subjectRoot).filter((d) => /^\d{2}_/.test(d) && fs.statSync(path.join(subjectRoot, d)).isDirectory()).sort();
  const targetUnits = unitFilter
    ? allUnits.filter((u) => u.startsWith(unitFilter) || u === unitFilter)
    : allUnits;
  if (targetUnits.length === 0) error(`--unit "${unitFilter}" 매칭 단원 없음 (가능: ${allUnits.join(', ')})`);

  log(
    '🚀',
    `${subject.toUpperCase()} 레벨${level} 영상 업로드 시작 → 라이브러리 ${LIBRARY_ID} (단원 ${targetUnits.length}개${isDryRun ? ', DRY RUN' : ''})`,
  );

  let totalOk = 0,
    totalSkip = 0,
    totalFail = 0;
  for (const unit of targetUnits) {
    const results = await processUnit(subject, unit, level, isDryRun, onlyFilter);
    writeMarker(subject, unit, level, results, isDryRun);
    totalOk += results.filter((r) => r.status === '✅' && r.note !== 'DRY RUN').length;
    totalSkip += results.filter((r) => r.status === '⏭').length;
    totalFail += results.filter((r) => r.status === '❌').length;
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  success(`완료: ${totalOk}개 업로드 / ⏭ ${totalSkip} 스킵 / ❌ ${totalFail} 실패`);
  if (totalFail > 0) warn('실패 항목은 마커 파일 확인 후 --only로 재시도');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
