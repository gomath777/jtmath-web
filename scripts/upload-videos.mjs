// upload-videos.js
// jtmath: 자동화 비디오 업로드 스크립트 (Mac 터미널용)
// 사용법: node scripts/upload-videos.js <folder_path>
// 설정 파일인 .env.local 에서 BUNNY_API_KEY 및 BUNNY_LIBRARY_ID 를 읽어서 사용합니다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

// Node 14+ 대응: __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 파싱 (간단히 .env.local 직접 읽기)
const loadEnv = () => {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) env[match[1]] = match[2];
    });
    return env;
  } catch (err) {
    console.warn('.env.local 파일을 찾을 수 없어 시스템 환경변수만 사용합니다.');
    return process.env;
  }
};

const env = { ...process.env, ...loadEnv() };
const LIBRARY_ID = env.BUNNY_LIBRARY_ID || 'INSERT_LIBRARY_ID';
const API_KEY = env.BUNNY_API_KEY || 'INSERT_BUNNY_NET_API_KEY';

if (!LIBRARY_ID || !API_KEY) {
  console.error('❌ 에러: BUNNY_LIBRARY_ID 및 BUNNY_API_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const targetFolder = process.argv[2];

if (!targetFolder || !fs.existsSync(targetFolder)) {
  console.error('❌ 에러: 유효한 폴더 경로를 입력해주세요.');
  console.log('💡 사용 예시: node scripts/upload-videos.js ./my-videos');
  process.exit(1);
}

// 1. Bunny.net 에 새로운 Video 객체 생성 (껍데기 만들기)
const createVideoObject = async (title) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ title });

    const options = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${LIBRARY_ID}/videos`,
      method: 'POST',
      headers: {
        'AccessKey': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Video creation failed: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', e => reject(e));
    req.write(data);
    req.end();
  });
};

// 2. 비디오 파일 업로드 (TUS 프로토콜을 구현하는 것이 베스트지만, 여기서는 일반 바이너리 PUT 요청 활용)
const uploadVideoContent = async (videoId, filePath) => {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(filePath);
    const readStream = fs.createReadStream(filePath);

    const options = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${LIBRARY_ID}/videos/${videoId}`,
      method: 'PUT',
      headers: {
        'AccessKey': API_KEY,
        'Content-Length': stat.size,
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Upload failed: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', e => reject(e));
    
    console.log(`📡 업로드 중...: ${path.basename(filePath)} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    readStream.pipe(req);
  });
};

const run = async () => {
  const files = fs.readdirSync(targetFolder);
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv'];

  const videos = files.filter(f => videoExts.includes(path.extname(f).toLowerCase()));

  console.log(`🚀 ${videos.length}개의 비디오 파일을 찾았습니다. 업로드를 시작합니다...\n`);

  for (const file of videos) {
    const filePath = path.join(targetFolder, file);
    const title = path.parse(file).name;

    try {
      console.log(`▶ 1단계: Bunny.net 영상 생성 요청 (${title})`);
      const { guid } = await createVideoObject(title);
      
      console.log(`▶ 2단계: 영상 데이터 업로드 (ID: ${guid})`);
      await uploadVideoContent(guid, filePath);
      
      console.log(`✅ 성공: ${title} 업로드 완료!\n`);
    } catch (err) {
      console.error(`❌ 실패: ${title} 업로드 중 오류 발생`);
      console.error(err);
    }
  }

  console.log('🎉 모든 동영상 업로드 프로세스가 완료되었습니다!');
};

run();
