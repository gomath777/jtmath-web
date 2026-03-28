-- session_blocks 테이블: 커리큘럼 차시별 블록 콘텐츠
CREATE TABLE IF NOT EXISTS session_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_item_id UUID NOT NULL REFERENCES curriculum_items(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('section_header', 'pdf', 'video_group', 'text', 'hintbook')),
  order_index INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스: 차시별 블록 조회 최적화
CREATE INDEX IF NOT EXISTS idx_session_blocks_item_order
  ON session_blocks(curriculum_item_id, order_index);

-- RLS 비활성화 (service_role 키로만 접근)
ALTER TABLE session_blocks ENABLE ROW LEVEL SECURITY;

-- service_role은 기본적으로 RLS 우회하므로 별도 policy 불필요
-- 필요시 authenticated 유저용 read policy 추가:
-- CREATE POLICY "Students can read assigned session blocks" ON session_blocks
--   FOR SELECT USING (true);
