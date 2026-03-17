-- ═══════════════════════════════════════════════════════════════
-- jtmath Bunny.net Integration: 대수 Delta 0 Seed Data
-- 실행 방법: Supabase 대시보드 → SQL Editor에 붙여넣기 → Run
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Insert Subject (대수)
INSERT INTO public.subjects (slug, name, sort_order) VALUES
  ('algebra', '대수', 3)
ON CONFLICT (slug) DO NOTHING;

-- STEP 2: Insert Course (대수 / Delta-0)
INSERT INTO public.courses (id, subject_id, delta_level, title, description, is_active)
VALUES (
  'c001-algebra-delta0',
  (SELECT id FROM public.subjects WHERE slug = 'algebra'),
  'delta-0',
  '대수 Δ0 실전 개념 완성',
  '지수/로그, 삼각함수, 수열의 핵심 개념을 영상 25강으로 완성합니다.',
  true
)
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Insert Lessons (25강 전체)
-- Bunny Library ID: 566809 | Collection: 대수 delta 0

INSERT INTO public.lessons 
  (course_id, week_number, lesson_number, title, description, bunny_video_id, is_published)
VALUES

-- ── 챕터 1: 지수와 로그 (1강~8강) ── Week 1~2
('c001-algebra-delta0', 1, 1,  '1.1.1. 거듭제곱과 거듭제곱근',         '지수법칙의 기초',    '4a0331cc-a9ad-46ac-a61d-d64107bffd62', true),
('c001-algebra-delta0', 1, 2,  '1.1.2. 지수의 확장과 지수법칙',         '지수법칙 확장',      'd9d0b779-6e02-4720-998d-2df13833cdb7', true),
('c001-algebra-delta0', 1, 3,  '1.1.3. 로그의 뜻과 성질',               '로그 기본 개념',     'b9cd1477-1d4d-44d9-a5ac-a77103228ec5', true),
('c001-algebra-delta0', 1, 4,  '1.1.4. 상용로그',                       '상용로그 활용',      'd0be9a74-fd0b-4d35-a138-5621eaedab6e', true),
('c001-algebra-delta0', 2, 1,  '1.2.1. 지수함수의 뜻과 그래프',          '지수함수 특성',      '6cf05900-3e67-47f0-bef6-ea905f9876de', true),
('c001-algebra-delta0', 2, 2,  '1.2.2. 로그함수의 뜻과 그래프 (개념)',   '로그함수 기본',      'a126000f-f02d-4d5c-9aa1-1fc422b0dfe2', true),
('c001-algebra-delta0', 2, 3,  '1.2.2. 로그함수의 뜻과 그래프 (문풀)',   '로그함수 문제풀이',  'd9eb7d0a-8c61-4463-a1cc-c32a6f74a3d7', true),
('c001-algebra-delta0', 2, 4,  '1.2.3. 지수함수의 활용',                 '지수방정식·부등식',  '712b99eb-7dd5-4159-b467-3afd8d199714', true),
('c001-algebra-delta0', 2, 5,  '1.2.4. 로그함수의 활용',                 '로그방정식·부등식',  'f997c460-4160-41be-92b9-0010d9e32182', true),

-- ── 챕터 2: 삼각함수 (9강~14강) ── Week 3~4
('c001-algebra-delta0', 3, 1,  '2.1.1. 일반각과 호도법 (개념)',          '호도법 기초',        'eded7e58-5cf2-4cc5-914c-f8910d58cbf2', true),
('c001-algebra-delta0', 3, 2,  '2.1.1. 일반각과 호도법 (문풀)',          '호도법 문제풀이',    '56fe4f06-9fb9-4378-965c-10ce506e2ef3', true),
('c001-algebra-delta0', 3, 3,  '2.1.2. 삼각함수',                       '삼각함수 정의',      '04c18f2b-8e8e-4d12-b12b-24cdcbf7deb8', true),
('c001-algebra-delta0', 3, 4,  '2.1.3. 삼각함수 그래프 (1) 사인·코사인','사인 코사인 그래프', '748bda38-e088-4f17-9a78-455611a27c03', true),
('c001-algebra-delta0', 4, 1,  '2.1.3. 삼각함수 그래프 (2) 탄젠트·이동','탄젠트 평행대칭이동','40b1b2f1-71d2-489e-8767-a468b9b5f2ab', true),
('c001-algebra-delta0', 4, 2,  '2.1.3. 삼각함수 그래프 (3) 방정식·부등식','삼각 방부등식',   '61305c99-5d30-4dbc-9a5e-5e547b475537', true),
('c001-algebra-delta0', 4, 3,  '2.2.1. 사인법칙과 코사인법칙',           '사인·코사인법칙',    'feda2e45-5303-4b75-b9c7-1d06577ca789', true),

-- ── 챕터 3: 수열 (15강~25강) ── Week 5~7
('c001-algebra-delta0', 5, 1,  '3.1.1. 수열의 뜻',                      '수열 기초 개념',     'b567c16b-ae11-4b9f-87ef-7d25f670db39', true),
('c001-algebra-delta0', 5, 2,  '3.1.2. 등차수열 (1)',                    '등차수열 정의',      'f2b88484-e776-410d-8ca7-dbbb0792d146', true),
('c001-algebra-delta0', 5, 3,  '3.1.2. 등차수열 (2) 합과 일반항',        '등차수열 합',        '248d9767-8fe7-4aeb-a943-3fd9867bc36a', true),
('c001-algebra-delta0', 6, 1,  '3.1.3. 등비수열 (1)',                    '등비수열 정의',      'f62215fb-9392-4630-8253-1ff68ae715c1', true),
('c001-algebra-delta0', 6, 2,  '3.1.3. 등비수열 (2) 합',                 '등비수열 합',        '3c9d13b9-b4b4-461c-aeb8-4a15b46743cd', true),
('c001-algebra-delta0', 6, 3,  '3.2.1. 합의 기호 시그마',                '시그마 기호·성질',   '6eec82d7-1936-4d5d-a6c8-3cb4b6751867', true),
('c001-algebra-delta0', 7, 1,  '3.2.2. 여러 가지 수열의 합',             '분수·무한 수열',     '5e95ea9b-cb96-4c52-9be7-2f36e522d018', true),
('c001-algebra-delta0', 7, 2,  '3.3.1. 수열의 귀납적 정의',              '점화식',             'efa2112f-757b-4c78-a6c8-a815b21a9547', true),
('c001-algebra-delta0', 7, 3,  '3.3.2. 수학적 귀납법',                   '귀납법 증명',        'a568e94a-889f-41c5-b93d-e6b9deac7a61', true);

-- ═══════════════════════════════════════════════════════════════
-- 완료! 실행 후 확인 쿼리:
-- SELECT week_number, lesson_number, title FROM public.lessons 
-- WHERE course_id = 'c001-algebra-delta0' 
-- ORDER BY week_number, lesson_number;
-- ═══════════════════════════════════════════════════════════════
