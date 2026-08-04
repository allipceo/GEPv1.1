/**
 * src/lib/supabase.js
 * Supabase 클라이언트 싱글톤
 *
 * 환경변수 (.env.local):
 *   VITE_SUPABASE_URL      — Supabase 프로젝트 URL
 *   VITE_SUPABASE_ANON_KEY — Supabase anon (public) key
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

function disabledResponse() {
  return {
    data: null,
    error: {
      message: 'Supabase 환경변수가 설정되지 않았습니다. .env.local에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해 주세요.',
    },
  }
}

function createDisabledQuery() {
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    order: () => query,
    limit: () => query,
    insert: () => query,
    update: () => query,
    upsert: () => query,
    delete: () => query,
    single: async () => disabledResponse(),
    then: (resolve) => Promise.resolve(disabledResponse()).then(resolve),
    catch: (reject) => Promise.resolve(disabledResponse()).catch(reject),
  }
  return query
}

function createDisabledSupabaseClient() {
  return {
    auth: {
      onAuthStateChange: (callback) => {
        queueMicrotask(() => callback('INITIAL_SESSION', null))
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        }
      },
      signInWithOAuth: async () => disabledResponse(),
      signOut: async () => ({ error: null }),
    },
    from: () => createDisabledQuery(),
    rpc: async () => disabledResponse(),
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createDisabledSupabaseClient()
