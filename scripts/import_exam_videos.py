#!/usr/bin/env python3
"""
exam_metadata.json → Supabase exam_videos 테이블 import

사용법:
  cd ~/building/mathgo-web
  python3 scripts/import_exam_videos.py

환경변수 필요:
  SUPABASE_URL, SUPABASE_SERVICE_KEY (.env.local에서 읽음)
"""

import json
import os
import sys
import re
from pathlib import Path

# .env.local 읽기
env_path = Path(__file__).parent.parent / '.env.local'
env = {}
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            env[k.strip()] = v.strip()

SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print('❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_KEY 없음')
    sys.exit(1)

try:
    import urllib.request
    import urllib.error
except ImportError:
    print('❌ urllib 없음')
    sys.exit(1)

# exam_metadata.json 경로 (Google Drive)
METADATA_PATH = Path.home() / 'Library/CloudStorage/GoogleDrive-gochangeon@gmail.com/My Drive/0lecture_vid/exam_metadata.json'

if not METADATA_PATH.exists():
    print(f'❌ 파일 없음: {METADATA_PATH}')
    sys.exit(1)

with open(METADATA_PATH, encoding='utf-8') as f:
    data = json.load(f)

videos = data['videos']
uploaded = [v for v in videos if v.get('bunny_video_id')]

print(f'📊 전체 영상: {len(videos)}개')
print(f'   업로드된 영상: {len(uploaded)}개')
print()

# Supabase REST API 호출 함수
def supabase_upsert(table, rows):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    body = json.dumps(rows).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=body,
        method='POST',
        headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
        }
    )
    # on_conflict 쿼리 파라미터
    req.full_url = url + '?on_conflict=bunny_video_id'
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# 레코드 변환 (기존 exam_videos 스키마에 맞춤)
rows = []
for v in uploaded:
    rows.append({
        'bunny_video_id':      v['bunny_video_id'],
        'title':               v['title'],
        'file_code':           v.get('file_code') or '',
        'subject':             v.get('subject') or '',
        'subject_slug':        v.get('subject_slug') or '',
        'chapter_folder':      v.get('chapter_folder') or '',
        'year':                v.get('year'),
        'month':               v.get('month'),
        'grade':               v.get('grade'),
        'problem':             v.get('problem'),
        'exam_type':           v.get('exam_type') or '',
        'sequence':            v.get('sequence') or 1,
        'is_chapter_summary':  bool(v.get('is_chapter_summary')),
        'file_path':           v.get('file_path') or '',
        'is_published':        True,
    })

# 배치 upsert (50개씩)
BATCH = 50
success = 0
for i in range(0, len(rows), BATCH):
    batch = rows[i:i+BATCH]
    status, body = supabase_upsert('exam_videos', batch)
    if status in (200, 201):
        success += len(batch)
        print(f'  ✅ {i+1}~{i+len(batch)}번 저장 완료')
    else:
        print(f'  ❌ {i+1}~{i+len(batch)}번 실패 (HTTP {status})')
        print(f'     {body[:300]}')

print()
print(f'🎉 완료: {success}/{len(rows)}개 import')
