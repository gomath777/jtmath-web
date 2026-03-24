-- Consolidate Merged Lessons (1.2.2 and 2.1.1)
-- 1.2.2. 로그함수의 뜻과 그래프
-- 2.1.1. 일반각과 호도법

-- 1. Delete PRACTICE lessons (문풀)
DELETE FROM public.lessons WHERE id IN (
  '3f104c89-9620-4287-9d88-059562a4808d', -- 1.2.2 문풀
  '28b4bb34-f928-4003-a413-68b1caa66b90'  -- 2.1.1 문풀
);

-- 2. Update CONCEPT lessons to be the UNIFIED lessons
UPDATE public.lessons 
SET 
  title = '1.2.2. 로그함수의 뜻과 그래프', 
  bunny_video_id = 'a1d24968-9d0d-4d39-bd8d-83305cc05d47',
  description = '로그함수의 뜻과 그래프 (개념+문풀 통합)',
  updated_at = NOW()
WHERE id = '82c014ec-f8c2-4fff-89be-05c739da1732';

UPDATE public.lessons 
SET 
  title = '2.1.1. 일반각과 호도법', 
  bunny_video_id = '7ac9f40f-bef5-46ee-9b56-2e966a4c404d',
  description = '일반각과 호도법 (개념+문풀 통합)',
  updated_at = NOW()
WHERE id = 'e25ad200-53c8-47c5-aff3-a57026ff2167';

-- 3. Update filenames for consistency (Optional but good for cleanliness)
-- The PDF mapping was already done by numbering, so it should still point to these IDs if they exist.
-- However, we should ensure the Level 1 PDF matches. 
-- For 1.2.2, the PDF is likely already mapped to 82c014ec...
-- Let's double check the existing mapping in the DB.
