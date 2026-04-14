/**
 * PDF 문제 메타데이터 추출 (Claude API)
 *
 * API 라우트와 CLI 스크립트 모두에서 재사용.
 * 독립 함수라 SUPABASE_SERVICE_KEY가 필요없음 (매칭은 별도 함수).
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ParsedProblem {
  problem_number: number;   // PDF에서의 순서 (01, 02...)
  year: number | null;
  month: number | null;
  grade: number | null;
  problem: number | null;
  raw_text: string;
}

const PROMPT = `이 PDF의 각 문제 상단에 "[YYYY년 MM월 고N NN번/XX점]" 형식의 출처 정보가 있습니다.
문제 번호(01, 02, 03...)와 각 문제의 출처 정보를 정확하게 읽어서 JSON 배열로만 응답해주세요.

주의사항:
- 월(month)을 정확히 읽으세요: 3월=3, 4월=4, 6월=6, 9월=9, 10월=10, 11월=11
- 번호(problem)를 정확히 읽으세요: 숫자를 절대 혼동하지 마세요 (18번과 21번은 전혀 다릅니다)
- raw_text에는 대괄호 안의 원문을 그대로 복사하세요

응답 형식 (JSON 배열만, 다른 텍스트 없이):
[
  {"problem_number": 1, "year": 2025, "month": 9, "grade": 1, "problem": 15, "raw_text": "[2025년 9월 고1 15번/4점]"},
  {"problem_number": 2, "year": 2025, "month": 6, "grade": 1, "problem": 17, "raw_text": "[2025년 6월 고1 17번/4점]"}
]

출처를 찾을 수 없는 문제는 year, month, grade, problem을 null로:
{"problem_number": 3, "year": null, "month": null, "grade": null, "problem": null, "raw_text": ""}`;

/**
 * PDF 버퍼를 Claude API로 분석해 문제 메타데이터 추출
 */
export async function parsePdfWithClaude(pdfBuffer: Buffer | ArrayBuffer): Promise<ParsedProblem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');
  }

  const anthropic = new Anthropic({ apiKey });
  const buffer = pdfBuffer instanceof ArrayBuffer ? Buffer.from(pdfBuffer) : pdfBuffer;
  const base64 = buffer.toString('base64');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    throw new Error(`PDF 분석 실패 — JSON 배열 추출 불가:\n${responseText.slice(0, 500)}`);
  }

  try {
    return JSON.parse(jsonMatch[0]) as ParsedProblem[];
  } catch (err) {
    throw new Error(`PDF 분석 실패 — JSON 파싱 오류: ${(err as Error).message}`);
  }
}
