const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STORAGE_BUCKET = 'course-materials';

async function createBucket() {
  const url = `${SUPABASE_URL}/storage/v1/bucket`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: STORAGE_BUCKET,
      name: STORAGE_BUCKET,
      public: false // Since we're accessing it securely or maybe the user wants it public? "public: false" by default. Wait, the upload script uses /public/ URL. So let's make it public.
    }),
  });

  if (res.ok || res.status === 400 /* usually means already exists */) {
    console.log(`✅ Bucket '${STORAGE_BUCKET}' created or already exists.`);
  } else {
    const err = await res.text();
    console.error(`❌ Failed to create bucket:`, err);
  }
}

// Re-run the public update just in case it exists but is private
async function makePublic() {
  const url = `${SUPABASE_URL}/storage/v1/bucket/${STORAGE_BUCKET}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public: true
    }),
  });
  console.log('Set bucket to public:', res.ok);
}

async function main() {
  await createBucket();
  await makePublic();
}

main().catch(console.error);
