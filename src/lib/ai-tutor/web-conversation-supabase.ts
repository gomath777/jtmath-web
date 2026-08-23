import type { WebConversationRepository } from './web-conversation-repository';
import type { WebSupabaseDataClient } from './web-conversation-supabase-core';
import {
  claimRequest,
  readRecentTurns,
  upsertConversation,
} from './web-conversation-supabase-conversations';
import { listRetentionCandidates } from './web-conversation-supabase-retention';
import {
  markCompleted,
  markFailed,
} from './web-conversation-supabase-turns';
export type { WebSupabaseDataClient } from './web-conversation-supabase-core';

export function createSupabaseWebConversationRepository(client: WebSupabaseDataClient): WebConversationRepository {
  return {
    upsertConversation: async (input) => upsertConversation(client, input),
    claimRequest: async (input) => claimRequest(client, input),
    readRecentTurns: async (input) => readRecentTurns(client, input),
    markCompleted: async (input) => markCompleted(client, input),
    markFailed: async (input) => markFailed(client, input),
    listRetentionCandidates: async (input) => listRetentionCandidates(client, input),
  };
}
