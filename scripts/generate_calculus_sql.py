import urllib.parse
import unicodedata
import uuid

pdf_files = [
    '1_1_1_ 함수의 극한.pdf', '1_1_2_ 함수의 극한에 대한 성질.pdf', '1_2_1_ 함수의 연속.pdf',
    '1_2_1_+ 함수의 연속(합성함수 연속 특강).pdf', '1_2_2_ 연속함수의 성질.pdf', '2_1_1_ 미분계수.pdf',
    '2_1_2_ 도함수.pdf', '2_2_1_ 접선의 방정식.pdf', '2_2_2_ 평균값 정리.pdf',
    '2_3_1_ 함수의 증가와 감소, 극대와 극소.pdf', '2_3_2_ 그래프 그리기 특강.pdf', '2_3_2_ 함수의 그래프.pdf',
    '2_3_3_ 방정식과 부등식에의 활용.pdf', '2_3_4_ 속도와 가속도.pdf', '3_1_1_ 부정적분.pdf',
    '3_1_2_ 정적분(1).pdf', '3_1_2_ 정적분(2).pdf', '3_1_2_ 정적분.pdf',
    '3_2_1_ 넓이(정적분 활용).pdf', '3_3_2_ 속도와 거리.pdf'
]

def make_url(f):
    return 'https://fvjzzntvfafyfejjaofx.supabase.co/storage/v1/object/public/course-materials/calculus-1/delta-0/' + urllib.parse.quote(unicodedata.normalize('NFC', f))

lessons = [
    (1, 1, '1.1. 함수의 극한 (1)', '31673c18-0f89-4dd6-8fd5-52231ff4d273', '1_1_1_ 함수의 극한.pdf', '8-13'),
    (1, 2, '1.1. 함수의 극한 (2)', '19ef624b-c933-4f31-8b16-da8374bcae54', '1_1_2_ 함수의 극한에 대한 성질.pdf', '14-23'),
    (2, 1, '1.2. 함수의 연속 (1)', '795d588c-a3d5-439c-bd23-377a9fa782bb', '1_2_1_ 함수의 연속.pdf', '24-30'),
    (2, 2, '1.2. 함수의 연속 (2)', '746551b3-065e-41d2-ab22-7d327759b7f7', '1_2_2_ 연속함수의 성질.pdf', '31-41'),
    (3, 1, '2.1. 미분계수', '36857a9d-d9f3-4a7a-8e87-efb123456d3f', '2_1_1_ 미분계수.pdf', '44-52'),
    (3, 2, '2.1. 도함수', 'd95baa08-c2d8-42e7-b003-331c447ecc14', '2_1_2_ 도함수.pdf', '53-63'),
    (4, 1, '2.2. 도함수의 활용 (1) 접선의 방정식', '959e7307-8838-45f2-ad1e-eea247a01c08', '2_2_1_ 접선의 방정식.pdf', '64-69'),
    (4, 2, '2.2. 도함수의 활용 (2) 평균값 정리', '0bd14fd9-9ddb-43d8-bd9f-8fd21dab612a', '2_2_2_ 평균값 정리.pdf', '70-75'),
    (5, 1, '2.2. 도함수의 활용 (3) 함수의 증가와 감소, 극대와 극소', '04728a21-970a-4758-b449-23a1c1624a1e', '2_3_1_ 함수의 증가와 감소, 극대와 극소.pdf', '76-85'),
    (5, 2, '2.2. 도함수의 활용 (4) 함수의 최댓값과 최솟값', 'a8b76464-4983-49b3-bbe7-58d43279bbed', '2_3_2_ 그래프 그리기 특강.pdf', '86-93'), # The image uses special Graph PDF for this lesson
    (6, 1, '2.2. 도함수의 활용 (5) 방정식과 부등식에의 활용', '85f5310a-8ce8-4f4b-8b02-ff545a5138de', '2_3_3_ 방정식과 부등식에의 활용.pdf', '94-100'),
    (6, 2, '2.2. 도함수의 활용 (6) 속도와 가속도', 'b4ca4594-f0c0-4ff5-89ce-49268d8b3d15', '2_3_4_ 속도와 가속도.pdf', '101-111'),
    (7, 1, '3.1. 부정적분', '7bc0c018-27ef-4452-a29b-fc3567e42be7', '3_1_1_ 부정적분.pdf', '114-121'),
    (7, 2, '3.2. 정적분 (1)', 'cd7d74e7-f1a0-4c3f-8f7d-7fe46a0c6ae0', '3_1_2_ 정적분(1).pdf', '122-127'),
    (8, 1, '3.2. 정적분 (2) 정적분으로 정의된 함수', '88a0a8b9-38c7-4624-811a-412abfd5be68', '3_1_2_ 정적분(2).pdf', '128-135'),
    (8, 2, '3.3. 정적분의 활용', '5ee68f9d-3c3c-4036-b907-cfeb9a150a42', '3_2_1_ 넓이(정적분 활용).pdf', '136-149'),
    (8, 3, '3.3. 속도와 거리', 'dccf568a-0c9c-4594-a3b1-4c1df85a23b6', '3_3_2_ 속도와 거리.pdf', '150-159')
]

import uuid

values = []
page_map_js = []
for c, (week, lesson, title, vid, req_pdf, pgs) in enumerate(lessons):
    u = str(uuid.uuid4())
    actual_pdf = next((x for x in pdf_files if x == req_pdf), None)
    url = f"'{make_url(actual_pdf)}'" if actual_pdf else 'NULL'
    
    values.append(f"    ('{u}', v_course_id, {week}, {lesson}, '{title}', '{vid}', {url}, true, '')")
    page_map_js.append(f'    "{u}": "{pgs}",')

values_str = ',\n'.join(values)

sql = f"""-- ═══════════════════════════════════════════════════════════════
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
{values_str};

  RAISE NOTICE '✅ 17강 모두 삽입 완료!';
END $$;
"""

with open('seed_calculus_delta0.sql', 'w') as f: f.write(sql)
with open('calc_page_mappings.txt', 'w') as f: f.write(chr(10).join(page_map_js))

print("SQL generated successfully!")
