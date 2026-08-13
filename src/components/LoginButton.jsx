import { useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const EMPLOYEE_EMAIL_DOMAIN = '@gep.local'
const LOGIN_TIMEOUT_MS = 10000

export default function LoginButton() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      window.alert('로컬 실행 환경에 Supabase 설정이 없습니다. .env.local에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해 주세요.')
      return
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setErrorMsg('')

    const normalizedId = employeeId.trim()
    if (!/^\d{6,}$/.test(normalizedId)) {
      setErrorMsg('사번은 숫자 6자리 이상이어야 합니다.')
      return
    }

    if (password.length < 8) {
      setErrorMsg('비밀번호는 8자리 이상이어야 합니다.')
      return
    }

    if (!isSupabaseConfigured) {
      window.alert('로컬 실행 환경에 Supabase 설정이 없습니다. .env.local에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해 주세요.')
      return
    }

    setIsSubmitting(true)

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), LOGIN_TIMEOUT_MS)
    })

    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({
          email: `${normalizedId}${EMPLOYEE_EMAIL_DOMAIN}`,
          password,
        }),
        timeoutPromise,
      ])

      if (result.timedOut) {
        setErrorMsg('로그인 응답이 지연되고 있습니다. 새로고침 후 다시 시도해 주세요.')
        return
      }

      if (result.error) {
        setErrorMsg('사번 또는 비밀번호가 올바르지 않습니다.')
      }
    } catch (e) {
      console.warn('[GEP] signInWithPassword exception:', e)
      setErrorMsg('로그인 중 오류가 발생했습니다. 새로고침 후 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-xs">
      <form onSubmit={handleLogin} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
          사번
          <input
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            className="min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm font-normal outline-none focus:border-blue-500"
            placeholder="예: 202504012"
            inputMode="numeric"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
          비밀번호
          <div className="flex items-center gap-1">
            <span className="min-h-[44px] flex items-center px-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 whitespace-nowrap">010-</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              maxLength={8}
              className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-3 text-sm font-normal outline-none focus:border-blue-500"
              placeholder="뒷번호 8자리"
            />
          </div>
        </label>
        {errorMsg && <p className="text-sm font-semibold text-red-600">{errorMsg}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-gray-400">
        문의: 관리자에게 연락하세요
      </p>

      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{ display: 'none' }}
        className="flex items-center gap-2 px-3 rounded-lg bg-white border border-gray-300 text-sm text-gray-700"
      >
        Google로 시작하기
      </button>
    </div>
  )
}
