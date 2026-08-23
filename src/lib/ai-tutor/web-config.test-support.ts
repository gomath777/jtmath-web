import type { WebAiTutorEnvironment } from './web-config';

export const completeWebEnv: WebAiTutorEnvironment = {
  AI_TUTOR_WEB_ENABLED: 'true',
  AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
  GEMINI_API_KEY: 'synthetic-gemini-secret-never-returned',
  AI_TUTOR_GEMINI_FAST_MODEL: 'gemini-3.1-flash-lite',
  AI_TUTOR_GEMINI_REASONING_MODEL: 'gemini-3.1-pro',
  AI_TUTOR_GEMINI_FALLBACK_MODEL: 'gemini-3.1-flash',
  AI_TUTOR_MODEL_TIMEOUT_MS: '20000',
  AI_TUTOR_RECENT_TURN_COUNT_CAP: '6',
  AI_TUTOR_RECENT_TURN_CHARACTER_CAP: '1200',
  AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP: '6000',
  STUDENT_TOKEN_SECRET: 'synthetic-student-secret-never-returned',
  NEXT_PUBLIC_SUPABASE_URL: 'https://synthetic-project.supabase.co',
  SUPABASE_SERVICE_KEY: 'synthetic-service-key-never-returned',
  VERCEL_ENV: 'preview',
};
