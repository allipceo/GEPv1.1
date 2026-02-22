/**
 * src/stores/authStore.js
 * 인증 상태 전역 스토어
 *
 * localStorage 키: 'gep_auth_v1'
 * authStatus: 'guest' | 'authenticated'
 * serviceLevel: 1~5 (1=기본, 2+=Supabase 통계, 3+=오답노트, 5+=모의고사)
 *
 * GEP_039: initAuthListener 추가
 *   - SIGNED_IN → users 테이블 조회/INSERT → setAuth
 *   - SIGNED_OUT → clearAuth
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { FEATURE_FLAGS } from '../config/featureFlags'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      authStatus:   'guest',   // 'guest' | 'authenticated'
      serviceLevel: 1,         // 1~5
      email:        null,      // 로그인 사용자 이메일
      userFeatures: {
        canStats:    false,
        canWrongNote: false,
        canMockExam: false,
      },

      // 로그인 시 호출 (email 파라미터 추가)
      setAuth: (serviceLevel, userFeatures, email = null) => set({
        authStatus: 'authenticated',
        serviceLevel,
        userFeatures,
        email,
      }),

      // 로그아웃 시 호출
      clearAuth: () => set({
        authStatus:   'guest',
        serviceLevel: 1,
        email:        null,
        userFeatures: {
          canStats:    false,
          canWrongNote: false,
          canMockExam: false,
        },
      }),

      /**
       * Google OAuth 콜백 후 인증 상태 동기화
       * App.jsx useEffect에서 1회 호출 — subscription 반환 (cleanup용)
       *
       * SIGNED_IN:
       *   1. users 테이블에서 service_level 조회
       *   2. 없으면 user_id=auth.uid()로 INSERT (service_level=1)
       *   3. setAuth 호출
       * SIGNED_OUT: clearAuth 호출
       */
      initAuthListener: () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const user = session.user

              // users 테이블에서 service_level 조회
              const { data, error } = await supabase
                .from('users')
                .select('service_level')
                .eq('user_id', user.id)
                .single()

              let serviceLevel = 1

              if (error || !data) {
                // 신규 유저 — INSERT (user_id = auth.uid() 로 RLS 통과)
                const { error: insertErr } = await supabase
                  .from('users')
                  .insert({ user_id: user.id, service_level: 1 })

                if (insertErr) {
                  console.warn('[GEP] users INSERT 실패:', insertErr.message)
                }
                serviceLevel = 1
              } else {
                serviceLevel = data.service_level ?? 1
              }

              const features = {
                canStats:    serviceLevel >= FEATURE_FLAGS.STATS_MIN_LEVEL,
                canWrongNote: serviceLevel >= FEATURE_FLAGS.WRONGNOTE_MIN_LEVEL,
                canMockExam: serviceLevel >= FEATURE_FLAGS.MOCKEXAM_MIN_LEVEL,
              }

              get().setAuth(serviceLevel, features, user.email)

            } else if (event === 'SIGNED_OUT') {
              get().clearAuth()
            }
          }
        )

        return subscription
      },
    }),
    { name: 'gep_auth_v1' }
  )
)
