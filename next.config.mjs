import { configDotenv } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const aiTutorWebShellFlag = process.env.AI_TUTOR_WEB_ENABLED;

// .env.local을 override:true로 로드 — 쉘에 구버전 키가 있어도 .env.local이 우선
configDotenv({ path: path.resolve(__dirname, '.env.local'), override: true });
if (aiTutorWebShellFlag === 'false') {
  process.env.AI_TUTOR_WEB_ENABLED = aiTutorWebShellFlag;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
