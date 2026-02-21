/**
 * src/lib/supabase.js
 * Supabase 클라이언트 싱글톤
 *
 * 환경변수 (.env.local):
 *   VITE_SUPABASE_URL      — Supabase 프로젝트 URL
 *   VITE_SUPABASE_ANON_KEY — Supabase anon (public) key
 */
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
