import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

const MIGRATION_PATH = 'sql/migration_ai_tutor_mvp.sql';
const ROLLBACK_PATH = 'sql/rollback_ai_tutor_mvp.sql';

const REQUIRED_TABLES = [
  'ai_tutor_identities',
  'ai_tutor_conversations',
  'ai_tutor_turns',
  'ai_tutor_attachments',
] as const;

const FORBIDDEN_CLIENT_ROLES = ['anon', 'authenticated'] as const;

const NEGATIVE_PUBLIC_BUCKET_SQL =
  "INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('ai-tutor-private', 'ai-tutor-private', true, 8388608, ARRAY['image/png']);";

const NEGATIVE_DISABLED_RLS_SQL =
  'CREATE TABLE IF NOT EXISTS public.ai_tutor_turns (id UUID PRIMARY KEY); ALTER TABLE public.ai_tutor_turns DISABLE ROW LEVEL SECURITY;';

const NEGATIVE_MISSING_PROFILE_FILTER_FUNCTION = `
CREATE OR REPLACE FUNCTION public.ai_tutor_claim_inbound_turn(p_profile_id UUID, p_conversation_id UUID, p_inbound_message_name TEXT)
RETURNS public.ai_tutor_turns AS $$
DECLARE
  v_turn public.ai_tutor_turns;
BEGIN
  INSERT INTO public.ai_tutor_turns (profile_id, conversation_id, inbound_message_name, status)
  VALUES (p_profile_id, p_conversation_id, p_inbound_message_name, 'processing')
  ON CONFLICT (inbound_message_name) DO NOTHING
  RETURNING * INTO v_turn;

  SELECT * INTO v_turn FROM public.ai_tutor_turns WHERE inbound_message_name = p_inbound_message_name;
  RETURN v_turn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

type TableBlock = {
  readonly tableName: string;
  readonly body: string;
};

describe('AI tutor SQL contract', () => {
  test('migration defines only the four tutor tables with server-only RLS', () => {
    const migration = readRepoFile(MIGRATION_PATH);
    const tableBlocks = extractTableBlocks(migration);

    assert.deepEqual(
      tableBlocks.map((block) => block.tableName),
      REQUIRED_TABLES,
    );
    assertNoExistingTableMutation(migration);

    for (const tableName of REQUIRED_TABLES) {
      assert.match(migration, new RegExp(`ALTER TABLE public\\.${tableName}\\s+ENABLE ROW LEVEL SECURITY`, 'i'));
      assert.doesNotMatch(migration, new RegExp(`ALTER TABLE public\\.${tableName}\\s+DISABLE ROW LEVEL SECURITY`, 'i'));
    }

    for (const role of FORBIDDEN_CLIENT_ROLES) {
      assert.doesNotMatch(migration, new RegExp(`\\bTO\\s+${role}\\b`, 'i'));
      assert.doesNotMatch(migration, new RegExp(`\\b${role}\\b[^;]*\\bPOLICY\\b`, 'i'));
    }
    assert.doesNotMatch(migration, /\bCREATE\s+POLICY\b/i);
  });

  test('migration defines private storage bucket with raster size and MIME limits', () => {
    const migration = readRepoFile(MIGRATION_PATH);

    assertPrivateBucketContract(migration);
  });

  test('migration defines table keys, checks, foreign keys, and indexes', () => {
    const migration = readRepoFile(MIGRATION_PATH);
    const tableBlocks = extractTableBlocks(migration);
    const tableByName = new Map(tableBlocks.map((block) => [block.tableName, block]));

    assertTableContains(tableByName, 'ai_tutor_identities', [
      'chat_user_name TEXT NOT NULL UNIQUE',
      'profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL',
      "status TEXT NOT NULL DEFAULT 'pending'",
      "CHECK (status IN ('pending', 'active', 'revoked'))",
      'pairing_code_hash TEXT',
      'pairing_code_expires_at TIMESTAMPTZ',
      'paired_at TIMESTAMPTZ',
      'revoked_at TIMESTAMPTZ',
    ]);
    assertTableContains(tableByName, 'ai_tutor_conversations', [
      'profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE',
      'chat_space_name TEXT NOT NULL',
      'chat_thread_name TEXT',
      'channel_type TEXT NOT NULL',
      "CHECK (channel_type IN ('dm', 'named_space', 'group_space', 'unknown'))",
    ]);
    assertTableContains(tableByName, 'ai_tutor_turns', [
      'profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE',
      'conversation_id UUID NOT NULL REFERENCES public.ai_tutor_conversations(id) ON DELETE CASCADE',
      'inbound_message_name TEXT NOT NULL UNIQUE',
      'status TEXT NOT NULL',
      'question_text TEXT',
      'answer_text TEXT',
      'provider TEXT',
      'model_alias TEXT',
      'prompt_version TEXT',
      'subject_slug TEXT',
      'concept_tags TEXT[]',
      'error_tags TEXT[]',
      'confidence NUMERIC',
      'needs_teacher_review BOOLEAN NOT NULL DEFAULT FALSE',
      'escalation_reason TEXT',
      'latency_ms INTEGER',
      'input_tokens INTEGER',
      'output_tokens INTEGER',
      'raw_content_deleted_at TIMESTAMPTZ',
      'image_deleted_at TIMESTAMPTZ',
      'metadata_deleted_at TIMESTAMPTZ',
    ]);
    assertTableContains(tableByName, 'ai_tutor_attachments', [
      'turn_id UUID NOT NULL REFERENCES public.ai_tutor_turns(id) ON DELETE CASCADE',
      'profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE',
      'attachment_resource_name TEXT NOT NULL',
      'declared_mime_type TEXT NOT NULL',
      'normalized_mime_type TEXT NOT NULL',
      'size_bytes INTEGER NOT NULL',
      'sha256 TEXT NOT NULL',
      'private_storage_path TEXT',
      'status TEXT NOT NULL',
      'image_deleted_at TIMESTAMPTZ',
      'metadata_deleted_at TIMESTAMPTZ',
    ]);

    for (const fragment of [
      'ai_tutor_identities_profile_idx',
      'ai_tutor_identities_pairing_code_hash_idx',
      'ai_tutor_conversations_profile_recent_idx',
      'ai_tutor_conversations_profile_channel_key',
      'ai_tutor_turns_profile_recent_idx',
      'ai_tutor_turns_review_queue_idx',
      'ai_tutor_turns_retention_idx',
      'ai_tutor_attachments_turn_resource_key',
      'ai_tutor_attachments_profile_retention_idx',
      'ai_tutor_attachments_private_path_idx',
    ]) {
      assertIncludesNormalized(migration, fragment);
    }
  });

  test('atomic claim function is unique, idempotent, and profile-scoped', () => {
    const migration = readRepoFile(MIGRATION_PATH);
    assertClaimFunctionContract(migration);
  });

  test('rollback drops function, tables in FK order, then only an empty tutor bucket', () => {
    const rollback = readRepoFile(ROLLBACK_PATH);
    const normalized = normalizeSql(rollback);

    assert(normalized.indexOf('drop function if exists public.ai_tutor_claim_inbound_turn') >= 0);
    assertOrder(normalized, [
      'drop function if exists public.ai_tutor_claim_inbound_turn',
      'drop table if exists public.ai_tutor_attachments',
      'drop table if exists public.ai_tutor_turns',
      'drop table if exists public.ai_tutor_conversations',
      'drop table if exists public.ai_tutor_identities',
      "delete from storage.buckets where id = 'ai-tutor-private'",
    ]);
    assert.match(rollback, /NOT EXISTS\s*\(\s*SELECT 1\s+FROM storage\.objects\s+WHERE bucket_id = 'ai-tutor-private'/i);
    assert.doesNotMatch(rollback, /DELETE\s+FROM\s+storage\.objects/i);
    assert.doesNotMatch(rollback, /DROP\s+TABLE\s+IF\s+EXISTS\s+public\.(?!ai_tutor_)/i);
  });

  test('negative contracts reject public buckets, disabled RLS, and missing profile filter', () => {
    assert.throws(() => assertPrivateBucketContract(NEGATIVE_PUBLIC_BUCKET_SQL), /private_bucket/);
    assert.throws(() => assertRlsEnabledOnly(NEGATIVE_DISABLED_RLS_SQL, ['ai_tutor_turns']), /rls_disabled/);
    assert.throws(() => assertClaimFunctionContract(NEGATIVE_MISSING_PROFILE_FILTER_FUNCTION), /profile_filter/);
  });
});

function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function extractTableBlocks(sql: string): readonly TableBlock[] {
  const matches = sql.matchAll(/CREATE TABLE IF NOT EXISTS public\.([a-z0-9_]+)\s*\(([\s\S]*?)\n\);/gi);
  return Array.from(matches, (match) => ({
    tableName: match[1] ?? '',
    body: match[2] ?? '',
  }));
}

function assertNoExistingTableMutation(sql: string): void {
  for (const match of sql.matchAll(/\bALTER TABLE public\.([a-z0-9_]+)\b/gi)) {
    const tableName = match[1] ?? '';
    assert(
      tableName.startsWith('ai_tutor_'),
      `existing_table_mutation: migration alters public.${tableName}`,
    );
  }
}

function assertRlsEnabledOnly(sql: string, tableNames: readonly string[]): void {
  for (const tableName of tableNames) {
    assert.doesNotMatch(
      sql,
      new RegExp(`ALTER TABLE public\\.${tableName}\\s+DISABLE ROW LEVEL SECURITY`, 'i'),
      `rls_disabled: public.${tableName}`,
    );
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${tableName}\\s+ENABLE ROW LEVEL SECURITY`, 'i'));
  }
}

function assertPrivateBucketContract(sql: string): void {
  const normalized = normalizeSql(sql);
  assert.match(
    normalized,
    /values\s*\(\s*'ai-tutor-private',\s*'ai-tutor-private',\s*false,\s*8388608/,
    'private_bucket: bucket must be private with 8 MiB cap',
  );
  assert(
    normalized.includes("on conflict (id) do update set public = false"),
    'private_bucket: conflict path must keep bucket private',
  );
  assert(
    normalized.includes("allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]"),
    'private_bucket: bucket must restrict MIME types',
  );
}

function assertTableContains(
  tableByName: ReadonlyMap<string, TableBlock>,
  tableName: string,
  fragments: readonly string[],
): void {
  const block = tableByName.get(tableName);
  assert(block !== undefined, `missing_table: ${tableName}`);
  const normalized = normalizeSql(block.body);
  for (const fragment of fragments) {
    assert(
      normalized.includes(normalizeSql(fragment)),
      `missing_fragment: ${tableName} lacks ${fragment}`,
    );
  }
}

function assertIncludesNormalized(sql: string, fragment: string): void {
  assert(normalizeSql(sql).includes(normalizeSql(fragment)), `missing_fragment: ${fragment}`);
}

function assertClaimFunctionContract(sql: string): void {
  const normalized = normalizeSql(sql);
  for (const fragment of [
    'create or replace function public.ai_tutor_claim_inbound_turn',
    'p_profile_id uuid',
    'p_conversation_id uuid',
    'p_inbound_message_name text',
    'returns public.ai_tutor_turns',
    'on conflict (inbound_message_name) do nothing',
    'where inbound_message_name = p_inbound_message_name and profile_id = p_profile_id',
    'for update',
    'if v_turn.profile_id <> p_profile_id then',
    'raise exception',
    'security definer',
  ]) {
    assert(normalized.includes(normalizeSql(fragment)), `profile_filter: missing claim contract ${fragment}`);
  }
}

function assertOrder(haystack: string, fragments: readonly string[]): void {
  let previousIndex = -1;
  for (const fragment of fragments) {
    const index = haystack.indexOf(fragment);
    assert(index > previousIndex, `rollback_order: expected ${fragment} after previous fragment`);
    previousIndex = index;
  }
}
