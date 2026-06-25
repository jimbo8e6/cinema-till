import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  document.body.innerHTML =
    '<div style="font-family:sans-serif;padding:2rem;color:#f87171;background:#111;min-height:100vh">' +
    '<h2>Missing Supabase environment variables</h2>' +
    '<p>VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in Vercel project settings.</p>' +
    '</div>'
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
