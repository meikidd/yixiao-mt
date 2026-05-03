import { createClient } from '@supabase/supabase-js'

// Using untyped client to avoid complex join type inference issues.
// Our own types.ts models are used for explicit casting in pages/routes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEFAULT_USER_ID ?? '00000000-0000-0000-0000-000000000001'
