// Supabase client setup for server-side operations
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for server-side operations (uses anon key)
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (uses service role key)
export const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey)

