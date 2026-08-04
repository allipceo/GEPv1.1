import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { FEATURE_FLAGS } from '../config/featureFlags'

const ADMIN_EMAILS = (import.meta.env.VITE_GEP_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

function buildFeatures(serviceLevel) {
  return {
    canStats: serviceLevel >= FEATURE_FLAGS.STATS_MIN_LEVEL,
    canWrongNote: serviceLevel >= FEATURE_FLAGS.WRONGNOTE_MIN_LEVEL,
    canMockExam: serviceLevel >= FEATURE_FLAGS.MOCKEXAM_MIN_LEVEL,
  }
}

const defaultProfile = {
  approvalStatus: 'guest',
  realName: null,
  phoneNumber: null,
  resetBaselineAt: null,
  status: 'active',
  isPaused: false,
  approvalMemo: null,
  isAdmin: false,
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      authStatus: 'guest',
      serviceLevel: 1,
      email: null,
      userId: null,
      userFeatures: buildFeatures(1),
      ...defaultProfile,

      setAuth: (serviceLevel, userFeatures, email = null, userId = null, profile = {}) => set({
        authStatus: 'authenticated',
        serviceLevel,
        userFeatures,
        email,
        userId,
        ...defaultProfile,
        ...profile,
      }),

      clearAuth: () => set({
        authStatus: 'guest',
        serviceLevel: 1,
        email: null,
        userId: null,
        userFeatures: buildFeatures(1),
        ...defaultProfile,
      }),

      refreshProfile: async () => {
        const { userId, email } = get()
        if (!userId) return null

        const { data, error } = await supabase
          .from('users')
          .select('service_level,status,is_paused,real_name,phone_number,approval_status,approval_memo,reset_baseline_at')
          .eq('user_id', userId)
          .single()

        if (error) {
          console.warn('[GEP] users profile refresh failed:', error.message)
          return null
        }

        const serviceLevel = data?.service_level ?? 1
        const profile = {
          approvalStatus: data?.approval_status ?? 'pending',
          realName: data?.real_name ?? null,
          phoneNumber: data?.phone_number ?? null,
          resetBaselineAt: data?.reset_baseline_at ?? null,
          status: data?.status ?? 'active',
          isPaused: data?.is_paused ?? false,
          approvalMemo: data?.approval_memo ?? null,
          isAdmin: ADMIN_EMAILS.includes((email ?? '').toLowerCase()),
        }

        get().setAuth(serviceLevel, buildFeatures(serviceLevel), email, userId, profile)
        return profile
      },

      submitApprovalRequest: async ({ realName, phoneNumber, memo = '' }) => {
        const { userId } = get()
        if (!userId) return { success: false, error: '로그인이 필요합니다.' }

        const normalizedPhone = phoneNumber.replace(/[^\d+]/g, '')
        const payload = {
          real_name: realName.trim(),
          phone_number: normalizedPhone,
          approval_status: 'pending',
          approval_requested_at: new Date().toISOString(),
          approval_memo: memo.trim() || null,
          status: 'active',
        }

        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('user_id', userId)

        if (error) return { success: false, error: error.message }

        set({
          approvalStatus: 'pending',
          realName: payload.real_name,
          phoneNumber: payload.phone_number,
          approvalMemo: payload.approval_memo,
          status: 'active',
        })

        return { success: true }
      },

      initAuthListener: () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            const isAuthEvent =
              event === 'SIGNED_IN' ||
              event === 'INITIAL_SESSION' ||
              event === 'TOKEN_REFRESHED'

            if (isAuthEvent && session?.user) {
              const user = session.user
              const email = user.email ?? null

              const { data, error } = await supabase
                .from('users')
                .select('service_level,status,is_paused,real_name,phone_number,approval_status,approval_memo,reset_baseline_at')
                .eq('user_id', user.id)
                .single()

              let profileData = data
              let serviceLevel = 1

              if (error || !data) {
                const { error: insertErr } = await supabase
                  .from('users')
                  .insert({
                    user_id: user.id,
                    service_level: 1,
                    status: 'active',
                    approval_status: 'pending',
                    approval_requested_at: new Date().toISOString(),
                  })

                if (insertErr) {
                  console.warn('[GEP] users insert failed:', insertErr.message)
                }

                profileData = {
                  service_level: 1,
                  status: 'active',
                  approval_status: 'pending',
                  is_paused: false,
                }
              } else {
                serviceLevel = data.service_level ?? 1
              }

              const profile = {
                approvalStatus: profileData?.approval_status ?? 'pending',
                realName: profileData?.real_name ?? null,
                phoneNumber: profileData?.phone_number ?? null,
                resetBaselineAt: profileData?.reset_baseline_at ?? null,
                status: profileData?.status ?? 'active',
                isPaused: profileData?.is_paused ?? false,
                approvalMemo: profileData?.approval_memo ?? null,
                isAdmin: ADMIN_EMAILS.includes((email ?? '').toLowerCase()),
              }

              get().setAuth(serviceLevel, buildFeatures(serviceLevel), email, user.id, profile)
            } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
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
