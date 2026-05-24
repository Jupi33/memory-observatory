export interface BackendConfig {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  mediaBucket: string
  editorSecretHash: string
  editorSessionSecret: string
}

const readEnv = (key: string) => process.env[key]?.trim()

export const getBackendConfig = (): BackendConfig => {
  const supabaseUrl = readEnv('SUPABASE_URL')
  const supabaseServiceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY')
  const editorSecretHash = readEnv('EDITOR_SECRET_HASH')
  const editorSessionSecret = readEnv('EDITOR_SESSION_SECRET')

  const missing = [
    ['SUPABASE_URL', supabaseUrl],
    ['SUPABASE_SERVICE_ROLE_KEY', supabaseServiceRoleKey],
    ['EDITOR_SECRET_HASH', editorSecretHash],
    ['EDITOR_SESSION_SECRET', editorSessionSecret],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing backend environment variables: ${missing.join(', ')}`)
  }

  return {
    supabaseUrl: supabaseUrl as string,
    supabaseServiceRoleKey: supabaseServiceRoleKey as string,
    mediaBucket: readEnv('SUPABASE_MEDIA_BUCKET') ?? 'memory-media',
    editorSecretHash: editorSecretHash as string,
    editorSessionSecret: editorSessionSecret as string,
  }
}

export const getOptionalSupabaseConfig = () => {
  const supabaseUrl = readEnv('SUPABASE_URL')
  const supabaseServiceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceRoleKey) return null
  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    mediaBucket: readEnv('SUPABASE_MEDIA_BUCKET') ?? 'memory-media',
  }
}
