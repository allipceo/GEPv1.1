/**
 * src/stores/authStore.js
 * 인증 상태 전역 스토어
 *
 * localStorage 키: 'gep_auth_v1'
 * authStatus: 'guest' | 'authenticated'
 * serviceLevel: 1~5 (1=기본, 2+=Supabase 통계, 3+=오답노트, 5+=모의고사)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      authStatus:   'guest',   // 'guest' | 'authenticated'
      serviceLevel: 1,         // 1~5
      userFeatures: {
        canStats:    false,
        canWrongNote: false,
        canMockExam: false,
      },

      // 로그인 시 호출
      setAuth: (serviceLevel, userFeatures) => set({
        authStatus: 'authenticated',
        serviceLevel,
        userFeatures,
      }),

      // 로그아웃 시 호출
      clearAuth: () => set({
        authStatus:   'guest',
        serviceLevel: 1,
        userFeatures: {
          canStats:    false,
          canWrongNote: false,
          canMockExam: false,
        },
      }),
    }),
    { name: 'gep_auth_v1' }
  )
)
