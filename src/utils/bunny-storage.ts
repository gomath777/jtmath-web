/**
 * Bunny.net Storage API wrapper for PDF uploads
 * Storage Zone + Pull Zone CDN
 */

const STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY || '';
const STORAGE_ZONE_NAME = process.env.BUNNY_STORAGE_ZONE_NAME || 'mathgo-pdfs';
const CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME_PDF || '';
const STORAGE_REGION = process.env.BUNNY_STORAGE_REGION || 'sg'; // Singapore (closest to Korea)

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
  category: 'sessions' | 'odapji',
  subPath: string,
  filename: string,
): string {
  const safeName = filename.replace(/[^\w가-힣.\-_]/g, '_');
  return `${category}/${subPath}/${Date.now()}_${safeName}`;
}
