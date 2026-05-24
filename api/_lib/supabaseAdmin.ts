import { createClient } from '@supabase/supabase-js'
import type { BackendConfig } from './backendConfig'
import type { PublicMemoryRow } from './memoryPayload'

export const createSupabaseAdmin = (config: Pick<BackendConfig, 'supabaseUrl' | 'supabaseServiceRoleKey'>) =>
  createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

export const listVisibleMemories = async (config: BackendConfig) => {
  const supabase = createSupabaseAdmin(config)
  return supabase
    .from('memories')
    .select('*, responses(*)')
    .eq('hidden', false)
    .order('sort_order', { ascending: true })
    .returns<PublicMemoryRow[]>()
}

export const writeAuditEvent = async (
  config: BackendConfig,
  eventType: string,
  subjectId: string | null,
  metadata: Record<string, unknown> = {},
) => {
  const supabase = createSupabaseAdmin(config)
  await supabase.from('editor_audit_events').insert({
    event_type: eventType,
    subject_id: subjectId,
    metadata,
  })
}
