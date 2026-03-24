-- ═══════════════════════════════════════════════════════════════
-- jtmath: 미적분1 Delta 0 Seed Data
-- Supabase → SQL Editor → 새 탭 → 전체 복붙 → Run
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_course_id UUID;
BEGIN
  -- STEP 1: Insert Course (미적분1 Δ0)
  INSERT INTO public.courses (title, subtitle, description, level_badge, is_active, price)
  VALUES (
    '미적분1 Δ0 실전 개념 완성',
    'Delta Zero · 신학기 8주 방과후',
    '함수의 극한부터 정적분의 활용까지 미적분1의 핵심 개념을 영상 17강으로 완성합니다.',
    'Δ0',
    true,
    560000
  ) RETURNING id INTO v_course_id;

  RAISE NOTICE '✅ Course created with ID: %', v_course_id;

  -- STEP 2: Insert Lessons
  INSERT INTO public.lessons
    (id, course_id, week_number, lesson_number, title, bunny_video_id, pdf_level_1_url, is_published, description)
  VALUES
    ('fa776abf-5101-49ed-8f83-b161348a7c15', v_course_id, 1, 1, '1.1. 함수의 극한 (1)', '31673c18-0f89-4dd6-8fd5-52231ff4d273', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/1_1_1_%20%ED%95%A8%EC%88%98%EC%9D%98%20%EA%B7%B9%ED%95%9C.pdf', true, ''),
    ('0695477c-7381-4961-8065-cdc0595aa542', v_course_id, 1, 2, '1.1. 함수의 극한 (2)', '19ef624b-c933-4f31-8b16-da8374bcae54', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/1_1_2_%20%ED%95%A8%EC%88%98%EC%9D%98%20%EA%B7%B9%ED%95%9C%EC%97%90%20%EB%8C%80%ED%95%9C%20%EC%84%B1%EC%A7%88.pdf', true, ''),
    ('f2590d4b-5b91-4e1a-9b33-f524855826c5', v_course_id, 2, 1, '1.2. 함수의 연속 (1)', '795d588c-a3d5-439c-bd23-377a9fa782bb', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/1_2_1_%20%ED%95%A8%EC%88%98%EC%9D%98%20%EC%97%B0%EC%86%8D.pdf', true, ''),
    ('abd77ca4-9c13-4091-b5ef-00d06cf1b901', v_course_id, 2, 2, '1.2. 함수의 연속 (2)', '746551b3-065e-41d2-ab22-7d327759b7f7', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/1_2_2_%20%EC%97%B0%EC%86%8D%ED%95%A8%EC%88%98%EC%9D%98%20%EC%84%B1%EC%A7%88.pdf', true, ''),
    ('b1f6681b-181a-4853-9853-79356941c48c', v_course_id, 3, 1, '2.1. 미분계수', '36857a9d-d9f3-4a7a-8e87-efb123456d3f', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/2_1_1_%20%EB%AF%B8%EB%B6%84%EA%B3%84%EC%88%98.pdf', true, ''),
    ('d0769db6-5d95-4221-969f-37ec2f3187ac', v_course_id, 3, 2, '2.1. 도함수', 'd95baa08-c2d8-42e7-b003-331c447ecc14', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/2_1_2_%20%EB%8F%84%ED%95%A8%EC%88%98.pdf', true, ''),
    ('d254ffd6-c710-4000-8764-15f9c6880085', v_course_id, 4, 1, '2.2. 도함수의 활용 (1) 접선의 방정식', '959e7307-8838-45f2-ad1e-eea247a01c08', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/2_2_1_%20%EC%A0%91%EC%84%A0%EC%9D%98%20%EB%B0%A9%EC%A0%95%EC%8B%9D.pdf', true, ''),
    ('c01cd53e-f722-4cf9-b6d0-998009ffd954', v_course_id, 4, 2, '2.2. 도함수의 활용 (2) 평균값 정리', '0bd14fd9-9ddb-43d8-bd9f-8fd21dab612a', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/2_2_2_%20%ED%8F%89%EA%B7%A0%EA%B0%92%20%EC%A0%95%EB%A6%AC.pdf', true, ''),
    ('82098e68-e684-47df-b1cf-e76066ce6ddb', v_course_id, 5, 1, '2.2. 도함수의 활용 (3) 함수의 증가와 감소, 극대와 극소', '04728a21-970a-4758-b449-23a1c1624a1e', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/2_3_1_%20%ED%95%A8%EC%88%98%EC%9D%98%20%EC%A6%9D%EA%B0%80%EC%99%80%20%EA%B0%90%EC%86%8C%2C%20%EA%B7%B9%EB%8C%80%EC%99%80%20%EA%B7%B9%EC%86%8C.pdf', true, ''),
    ('39f05b66-fc13-466a-833a-162aa170e7b6', v_course_id, 5, 2, '2.2. 도함수의 활용 (4) 함수의 최댓값과 최솟값', 'a8b76464-4983-49b3-bbe7-58d43279bbed', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/2_3_2_%20%EA%B7%B8%EB%9E%98%ED%94%84%20%EA%B7%B8%EB%A6%AC%EA%B8%B0%20%ED%8A%B9%EA%B0%95.pdf', true, ''),
    ('7f8c8488-2c5c-4fe9-b1ff-07994176c2bf', v_course_id, 6, 1, '2.2. 도함수의 활용 (5) 방정식과 부등식에의 활용', '85f5310a-8ce8-4f4b-8b02-ff545a5138de', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/2_3_3_%20%EB%B0%A9%EC%A0%95%EC%8B%9D%EA%B3%BC%20%EB%B6%80%EB%93%B1%EC%8B%9D%EC%97%90%EC%9D%98%20%ED%99%9C%EC%9A%A9.pdf', true, ''),
    ('a4c56eec-e388-4ab1-8d22-2a432859f2e6', v_course_id, 6, 2, '2.2. 도함수의 활용 (6) 속도와 가속도', 'b4ca4594-f0c0-4ff5-89ce-49268d8b3d15', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/2_3_4_%20%EC%86%8D%EB%8F%84%EC%99%80%20%EA%B0%80%EC%86%8D%EB%8F%84.pdf', true, ''),
    ('a5560598-993c-4d22-901d-8b76cf0d0e9d', v_course_id, 7, 1, '3.1. 부정적분', '7bc0c018-27ef-4452-a29b-fc3567e42be7', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/3_1_1_%20%EB%B6%80%EC%A0%95%EC%A0%81%EB%B6%84.pdf', true, ''),
    ('bfa46276-19f7-45d6-9263-86914a3e693b', v_course_id, 7, 2, '3.2. 정적분 (1)', 'cd7d74e7-f1a0-4c3f-8f7d-7fe46a0c6ae0', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/3_1_2_%20%EC%A0%95%EC%A0%81%EB%B6%84%281%29.pdf', true, ''),
    ('a05d132b-8a17-4794-a46f-eee5042c4ac8', v_course_id, 8, 1, '3.2. 정적분 (2) 정적분으로 정의된 함수', '88a0a8b9-38c7-4624-811a-412abfd5be68', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/3_1_2_%20%EC%A0%95%EC%A0%81%EB%B6%84%282%29.pdf', true, ''),
    ('566e7935-0208-4fdd-8684-045789732be6', v_course_id, 8, 2, '3.3. 정적분의 활용', '5ee68f9d-3c3c-4036-b907-cfeb9a150a42', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/3_2_1_%20%EB%84%93%EC%9D%B4%28%EC%A0%95%EC%A0%81%EB%B6%84%20%ED%99%9C%EC%9A%A9%29.pdf', true, ''),
    ('db889ee5-4753-48a6-8f2f-ef04b12f665f', v_course_id, 8, 3, '3.3. 속도와 거리', 'dccf568a-0c9c-4594-a3b1-4c1df85a23b6', 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/3_3_2_%20%EC%86%8D%EB%8F%84%EC%99%80%20%EA%B1%B0%EB%A6%AC.pdf', true, '');

  RAISE NOTICE '✅ 17강 모두 삽입 완료!';
END $$;
