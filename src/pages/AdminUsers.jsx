import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const STATUS_LABEL = {
  pending: '승인 대기',
  approved: '승인 완료',
  rejected: '승인 거절',
  paused: '일시 중지',
}

export default function AdminUsers() {
  const navigate = useNavigate()
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const userId = useAuthStore((s) => s.userId)
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [memoByUser, setMemoByUser] = useState({})

  useEffect(() => {
    if (isAdmin) loadUsers()
  }, [isAdmin])

  const loadUsers = async () => {
    setIsLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('users')
      .select('user_id,real_name,phone_number,approval_status,approval_requested_at,approved_at,approval_memo,status,is_paused,created_at')
      .order('approval_requested_at', { ascending: false, nullsFirst: false })
      .limit(100)

    if (loadError) {
      setError(loadError.message)
      setUsers([])
    } else {
      setUsers(data ?? [])
    }

    setIsLoading(false)
  }

  const updateApproval = async (targetUserId, approvalStatus) => {
    setError('')
    const memo = memoByUser[targetUserId]?.trim() || null
    const payload = {
      approval_status: approvalStatus,
      approved_by: userId,
      approved_at: new Date().toISOString(),
      approval_memo: memo,
      status: approvalStatus === 'paused' ? 'active' : 'active',
      is_paused: approvalStatus === 'paused',
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(payload)
      .eq('user_id', targetUserId)

    if (updateError) {
      setError(updateError.message)
      return
    }

    await loadUsers()
  }

  if (!isAdmin) {
    return (
      <AdminShell>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">운영자 권한이 필요합니다.</p>
          <p className="mt-1 text-sm text-red-600">
            `VITE_GEP_ADMIN_EMAILS`와 Supabase `gep_admin_emails`에 운영자 이메일을 등록해야 합니다.
          </p>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">사용자 승인 관리</h1>
          <p className="mt-1 text-sm text-gray-500">파일럿 사용자의 승인 상태를 관리합니다.</p>
        </div>
        <button
          type="button"
          onClick={loadUsers}
          className="min-h-[40px] rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-600"
        >
          새로고침
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-500">불러오는 중...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <div key={user.user_id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-gray-900">{user.real_name || '실명 미입력'}</p>
                  <p className="mt-1 text-sm text-gray-500">{user.phone_number || '전화번호 미입력'}</p>
                  <p className="mt-1 text-xs text-gray-400">{user.user_id}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                  {STATUS_LABEL[user.approval_status] ?? user.approval_status}
                </span>
              </div>

              <textarea
                value={memoByUser[user.user_id] ?? user.approval_memo ?? ''}
                onChange={(event) => setMemoByUser((prev) => ({ ...prev, [user.user_id]: event.target.value }))}
                className="mt-3 min-h-[64px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="승인 또는 거절 메모"
              />

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => updateApproval(user.user_id, 'approved')}
                  className="min-h-[40px] rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white"
                >
                  승인
                </button>
                <button
                  type="button"
                  onClick={() => updateApproval(user.user_id, 'rejected')}
                  className="min-h-[40px] rounded-lg bg-red-50 px-3 text-sm font-semibold text-red-700"
                >
                  거절
                </button>
                <button
                  type="button"
                  onClick={() => updateApproval(user.user_id, 'paused')}
                  className="min-h-[40px] rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700"
                >
                  중지
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">표시할 사용자가 없습니다.</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/')}
        className="min-h-[44px] rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-600"
      >
        홈으로 돌아가기
      </button>
    </AdminShell>
  )
}

function AdminShell({ children }) {
  return (
    <div className="min-h-screen max-w-[640px] mx-auto bg-gray-50 px-4 py-6 flex flex-col gap-4">
      {children}
    </div>
  )
}
