// Supabase client setup for server-side operations
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Lazily initialize clients so module import doesn't crash during Next.js
// build-time static analysis (env vars aren't injected until runtime).
function createLazy(factory: () => ReturnType<typeof createSupabaseClient>) {
  let instance: ReturnType<typeof createSupabaseClient> | null = null
  return new Proxy({} as ReturnType<typeof createSupabaseClient>, {
    get(_, prop: string | symbol) {
      if (!instance) instance = factory()
      return (instance as any)[prop]
    },
  })
}

// Client for server-side operations (uses anon key)
export const supabase = createLazy(() =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
)

// Admin client for server-side operations (uses service role key)
export const supabaseAdmin = createLazy(() =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
)
