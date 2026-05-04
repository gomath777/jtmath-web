import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = readFileSync('.env.local', 'utf8');
const SECRET = envFile.match(/STUDENT_TOKEN_SECRET=(.+)/)?.[1]?.trim() ?? '';
const SUPABASE_URL = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim() ?? '';
const SERVICE_KEY = envFile.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim() ?? '';

async function getKey() {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey('raw', encoder.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function b64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(profileId: string, slug: string) {
  const payload = { profileId, slug, exp: Math.floor(Date.now() / 1000) + 3600 };
  const encoder = new TextEncoder();
  const payloadB64 = b64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  return `${payloadB64}.${b64UrlEncode(new Uint8Array(sig))}`;
}

async function main() {
  const slug = process.argv[2] ?? 'jt-dkb3x';
  const sc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await sc.from('student_tokens').select('profile_id').eq('slug', slug).single();
  if (!data) { console.error('slug not found'); process.exit(1); }
  const token = await sign(data.profile_id, slug);
  console.log(token);
}

main();
