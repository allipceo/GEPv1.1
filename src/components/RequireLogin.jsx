import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginButton from './LoginButton'
import { useAuthStore } from '../stores/authStore'

function LoginRequiredDialog() {
  const navigate = useNavigate()

  return (
    <AccessShell title="등록이 필요합니다">
      <p className="mt-2 text-sm leading-6 text-gray-600">
        문제풀이와 카운팅은 로그인한 사용자에게만 제공됩니다. 등록 후 승인된 사용자의 풀이 기록만 누적됩니다.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <LoginButton label="등록 / 로그인" />
        <HomeButton onClick={() => navigate('/')} />
      </div>
    </AccessShell>
  )
}

function ApprovalRequiredDialog() {
  const navigate = useNavigate()
  const approvalStatus = useAuthStore((s) => s.approvalStatus)
  const realName = useAuthStore((s) => s.realName)
  const phoneNumber = useAuthStore((s) => s.phoneNumber)
  const submitApprovalRequest = useAuthStore((s) => s.submitApprovalRequest)
  const [name, setName] = useState(realName ?? '')
  const [phone, setPhone] = useState(phoneNumber ?? '')
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const needsRequest = approvalStatus === 'pending' && (!realName || !phoneNumber)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('실명을 입력해 주세요.')
      return
    }

    if (phone.replace(/[^\d]/g, '').length < 9) {
      setError('전화번호를 정확히 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    const result = await submitApprovalRequest({ realName: name, phoneNumber: phone, memo })
    setIsSubmitting(false)

    if (!result.success) setError(result.error ?? '승인 요청 저장에 실패했습니다.')
  }

  const title = approvalStatus === 'rejected'
    ? '승인 요청이 거절되었습니다'
    : approvalStatus === 'paused'
      ? '사용이 일시 중지되었습니다'
      : needsRequest
        ? '승인 요청이 필요합니다'
        : '승인 대기 중입니다'

  return (
    <AccessShell title={title}>
      {needsRequest ? (
        <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
            실명
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm font-normal outline-none focus:border-blue-500"
              placeholder="홍길동"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
            전화번호
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm font-normal outline-none focus:border-blue-500"
              placeholder="01012345678"
              inputMode="tel"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
            메모
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              className="min-h-[72px] rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500"
              placeholder="소속 또는 응시 예정 정보를 입력해 주세요."
            />
          </label>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? '저장 중...' : '가입 승인 요청'}
          </button>
          <HomeButton onClick={() => navigate('/')} />
        </form>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            운영자 승인이 완료되면 문제풀이와 카운팅을 사용할 수 있습니다.
          </p>
          <div className="mt-5">
            <HomeButton onClick={() => navigate('/')} />
          </div>
        </>
      )}
    </AccessShell>
  )
}

function HomeButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[44px] rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
    >
      홈으로 돌아가기
    </button>
  )
}

function AccessShell({ title, children }) {
  return (
    <div className="min-h-screen max-w-[640px] mx-auto bg-white flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-required-title"
        className="relative z-10 w-full max-w-sm rounded-xl bg-white p-5 shadow-xl border border-gray-100"
      >
        <h2 id="access-required-title" className="text-lg font-bold text-gray-900">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

export default function RequireLogin({ children, requireApproval = true }) {
  const authStatus = useAuthStore((s) => s.authStatus)
  const approvalStatus = useAuthStore((s) => s.approvalStatus)
  const status = useAuthStore((s) => s.status)
  const isPaused = useAuthStore((s) => s.isPaused)
  const isAdmin = useAuthStore((s) => s.isAdmin)

  if (authStatus === 'guest') return <LoginRequiredDialog />
  if (!requireApproval) return children
  if (isAdmin || (approvalStatus === 'approved' && status === 'active' && !isPaused)) return children

  return <ApprovalRequiredDialog />
}
