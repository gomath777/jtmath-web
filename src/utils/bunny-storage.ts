/**
 * Bunny.net Storage API wrapper for PDF uploads
 * Storage Zone + Pull Zone CDN
 */

const STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY || '';
const STORAGE_ZONE_NAME = process.env.BUNNY_STORAGE_ZONE_NAME || 'mathgo-pdfs';
const CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME_PDF || '';
const STORAGE_REGION = process.env.BUNNY_STORAGE_REGION || 'sg'; // Singapore (closest to Korea)
const ACCOUNT_API_KEY = process.env.BUNNY_ACCOUNT_API_KEY || ''; // 계정 키 (CDN 퍼지용)

/**
 * Pull Zone 엣지 캐시에서 특정 CDN URL을 퍼지.
 * 동일 경로에 파일을 덮어써도 엣지 캐시(max-age)가 구버전을 계속 서빙하는 문제 방지.
 * best-effort — 계정 키 없거나 실패해도 throw 하지 않음(업로드 자체는 성공 처리).
 */
export async function purgeCdnUrl(cdnUrl: string): Promise<boolean> {
  if (!ACCOUNT_API_KEY) return false;
  try {
    const target = encodeURI(cdnUrl); // 공백/한글 경로 → %xx
    const res = await fetch(
      `https://api.bunny.net/purge?url=${encodeURIComponent(target)}&async=false`,
      { method: 'POST', headers: { AccessKey: ACCOUNT_API_KEY } },
    );
    return res.ok;
  } catch {
    return false;
  }
}

function getStorageBaseUrl(): string {
  // Bunny Storage API endpoint by region
  const regionMap: Record<string, string> = {
    de: 'storage.bunnycdn.com',
    ny: 'ny.storage.bunnycdn.com',
    la: 'la.storage.bunnycdn.com',
    sg: 'sg.storage.bunnycdn.com',
    syd: 'syd.storage.bunnycdn.com',
  };
  const host = regionMap[STORAGE_REGION] || 'sg.storage.bunnycdn.com';
  return `https://${host}/${STORAGE_ZONE_NAME}`;
}

/**
 * Upload a PDF buffer to Bunny.net Storage
 * @returns CDN URL for the uploaded file
 */
export async function uploadPdf(
  buffer: ArrayBuffer,
  storagePath: string,
): Promise<{ cdnUrl: string; storagePath: string }> {
  const baseUrl = getStorageBaseUrl();
  const url = `${baseUrl}/${storagePath}`;

  // Convert to Blob for fetch body compatibility
  const blob = new Blob([buffer], { type: 'application/octet-stream' });

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: STORAGE_API_KEY,
      'Content-Type': 'application/octet-stream',
    },
    body: blob,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bunny Storage upload failed: ${response.status} ${text}`);
  }

  return {
    cdnUrl: getPublicUrl(storagePath),
    storagePath,
  };
}

/**
 * Delete a file from Bunny.net Storage
 */
export async function deletePdf(storagePath: string): Promise<void> {
  const baseUrl = getStorageBaseUrl();
  const url = `${baseUrl}/${storagePath}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { AccessKey: STORAGE_API_KEY },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Bunny Storage delete failed: ${response.status}`);
  }
}

/**
 * Get the public CDN URL for a storage path
 */
export function getPublicUrl(storagePath: string): string {
  return `https://${CDN_HOSTNAME}/${storagePath}`;
}

/**
 * Generate a safe storage path for a PDF file
 * e.g., "sessions/gs1/2026-w1s1/레벨1.pdf" or "odapji/홍민서/2026-05-06_대수.pdf"
 */
export function generateStoragePath(
  category: 'sessions' | 'odapji' | 'shared',
  subPath: string,
  filename: string,
): string {
  const safeName = filename.replace(/[^\w가-힣.\-_]/g, '_');
  return `${category}/${subPath}/${Date.now()}_${safeName}`;
}

/**
 * Check if a file exists in Bunny Storage
 */
export async function existsInStorage(storagePath: string): Promise<boolean> {
  const baseUrl = getStorageBaseUrl();
  const url = `${baseUrl}/${storagePath}`;

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { AccessKey: STORAGE_API_KEY },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Upload a PDF from local file path (Node.js only)
 * Skips upload if file already exists at storagePath (unless force=true)
 *
 * @returns { cdnUrl, skipped } — skipped=true means file already existed
 */
export async function uploadPdfFromPath(
  localPath: string,
  storagePath: string,
  options: { force?: boolean } = {},
): Promise<{ cdnUrl: string; storagePath: string; skipped: boolean }> {
  // Dynamic import to avoid bundling fs in client code
  const fs = await import('fs');
  const crypto = await import('crypto');

  if (!fs.existsSync(localPath)) {
    throw new Error(`Local file not found: ${localPath}`);
  }

  const buffer = fs.readFileSync(localPath);
  // 콘텐츠 해시 기반 버전 — 파일 내용이 바뀌면 URL(?v=)이 바뀌어 브라우저가 재요청.
  // (Pull Zone 은 "Ignore Query Strings" 라 엣지 캐시 키엔 영향 없음 → 엣지는 정상 서빙)
  const version = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 10);
  const versionedUrl = `${getPublicUrl(storagePath)}?v=${version}`;

  // Check if already uploaded (skip unless force)
  if (!options.force && await existsInStorage(storagePath)) {
    return { cdnUrl: versionedUrl, storagePath, skipped: true };
  }

  // Convert to ArrayBuffer for uploadPdf compatibility
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  await uploadPdf(arrayBuffer, storagePath);
  // 덮어쓰기(force)로 기존 경로를 갱신한 경우 엣지 캐시도 비움 (쿼리 무시 존이라 base 경로로 퍼지).
  if (options.force) {
    await purgeCdnUrl(getPublicUrl(storagePath));
  }
  return { cdnUrl: versionedUrl, storagePath, skipped: false };
}
