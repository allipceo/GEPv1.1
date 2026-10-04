import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { resetCountingBaseline } from '../services/countingResetService'
import AdminTabs from '../components/AdminTabs'

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

  const [newRealName, setNewRealName] = useState('')
  const [previewId, setPreviewId] = useState('')        // 자동 생성될 아이디/초기 비밀번호 미리보기 (읽기전용)
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [editingUserId, setEditingUserId] = useState(null)
  const [editRealName, setEditRealName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [resettingPwUserId, setResettingPwUserId] = useState(null)

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
      loadPreviewId()
    }
  }, [isAdmin])

  // 자동 생성될 아이디 미리보기 — 엣지 함수 dryRun 모드
  const loadPreviewId = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dryRun: true }),
        }
      )
      const result = await res.json()
      setPreviewId(res.ok ? (result.employeeId ?? '') : '')
    } catch {
      setPreviewId('')
    }
  }

  const loadUsers = async () => {
    setIsLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('users')
      .select('user_id,real_name,phone_number,approval_status,approval_requested_at,approved_at,approval_memo,status,is_paused,reset_baseline_at,created_at')
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

  const resetUserCounting = async (targetUser) => {
    const confirmed = window.confirm('이 사용자의 카운팅 기준선을 초기화하시겠습니까? 기존 원장은 보존됩니다.')
    if (!confirmed) return

    const authState = useAuthStore.getState()
    const result = await resetCountingBaseline(authState, {
      targetUserId: targetUser.user_id,
      previousBaselineAt: targetUser.reset_baseline_at,
      reason: 'operator_reset',
    })

    if (!result.success) {
      setError(result.error)
      return
    }

    await loadUsers()
  }

  const resetUserPassword = async (targetUser) => {
    const confirmed = window.confirm(
      `${targetUser.real_name || '이 사용자'}의 비밀번호를 관리자 기준 8자리(${targetUser.phone_number?.slice(-8)})로 초기화하시겠습니까?`
    )
    if (!confirmed) return

    setResettingPwUserId(targetUser.user_id)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ targetUserId: targetUser.user_id }),
        }
      )
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? '비밀번호 초기화 실패')
        return
      }
      window.alert(`비밀번호가 ${targetUser.phone_number?.slice(-8)}(으)로 초기화되었습니다.`)
    } catch (err) {
      setError(err.message ?? '비밀번호 초기화 중 오류')
    } finally {
      setResettingPwUserId(null)
    }
  }

  const handleUpdateUser = async (targetUserId) => {
    if (!editRealName.trim()) {
      window.alert('실명을 입력해 주세요.')
      return
    }
    if (editPhone.length !== 8) {
      window.alert('초기화 기준 8자리를 정확히 입력해 주세요.')
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        real_name: editRealName.trim(),
        phone_number: editPhone,
      })
      .eq('user_id', targetUserId)

    if (updateError) {
      window.alert('수정 실패: ' + updateError.message)
      return
    }

    setEditingUserId(null)
    await loadUsers()
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    setCreateError('')

    if (!newRealName.trim()) {
      setCreateError('성명을 입력해 주세요.')
      return
    }
    setIsCreating(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            realName: newRealName.trim(),
          }),
        }
      )

      const result = await res.json()
      if (!res.ok) {
        setCreateError(result.error ?? '계정 생성에 실패했습니다.')
        return
      }

      window.alert(
        `계정 생성 완료\n성명: ${result.realName}\n아이디: ${result.employeeId}\n초기 비밀번호: ${result.initialPassword ?? result.employeeId}`
      )
      setNewRealName('')
      await loadUsers()
      await loadPreviewId()
    } catch (err) {
      setCreateError(err.message ?? '계정 생성 중 오류가 발생했습니다.')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isAdmin) {
    return (
      <AdminShell>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">운영자 권한이 필요합니다.</p>
          <p className="mt-1 text-sm text-red-600">
            Supabase `users` 테이블에서 해당 계정의 `is_admin`을 `true`로 설정해야 합니다.
          </p>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <AdminTabs active="users" />

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-base font-bold text-gray-900">신규 사용자 계정 생성</h2>
        <form onSubmit={handleCreateUser} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
            아이디 / 초기 비밀번호 (자동 생성)
            <input
              value={previewId || '불러오는 중…'}
              readOnly
              tabIndex={-1}
              className="min-h-[44px] rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-normal text-gray-500 outline-none"
            />
            <span className="text-xs font-normal text-gray-400">
              아이디와 초기 비밀번호는 동일한 숫자 8자리로 자동 발급됩니다.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
            성명
            <input
              value={newRealName}
              onChange={(event) => setNewRealName(event.target.value)}
              className="min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm font-normal outline-none focus:border-blue-500"
              placeholder="홍길동"
            />
          </label>
          {createError && <p className="text-sm font-semibold text-red-600">{createError}</p>}
          <button
            type="submit"
            disabled={isCreating}
            className="min-h-[44px] rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isCreating ? '생성 중...' : '계정 생성'}
          </button>
        </form>
      </div>

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
                  <p className="mt-1 text-sm text-gray-500">
                    초기화 기준값: {user.phone_number || '미입력'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{user.user_id}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                  {STATUS_LABEL[user.approval_status] ?? user.approval_status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingUserId(user.user_id)
                  setEditRealName(user.real_name || '')
                  setEditPhone((user.phone_number || '').replace(/[^0-9]/g, '').slice(-8))
                }}
                className="text-xs text-blue-600 underline mt-1"
              >
                정보 수정
              </button>

              {editingUserId === user.user_id && (
                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
                    실명
                    <input
                      value={editRealName}
                      onChange={(event) => setEditRealName(event.target.value)}
                      className="min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm font-normal outline-none focus:border-blue-500 bg-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
                    초기화 기준 8자리
                    <div className="flex items-center min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm bg-white focus-within:border-blue-500">
                      <input
                        value={editPhone}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/[^0-9]/g, '').slice(0, 8)
                          setEditPhone(digits)
                        }}
                        className="flex-1 outline-none text-sm font-normal"
                        placeholder="20261002"
                        inputMode="numeric"
                        maxLength={8}
                      />
                    </div>
                  </label>
                  <p className="text-xs text-gray-400">* 아이디 변경은 지원하지 않습니다. 이 값은 관리자 비밀번호 초기화 기준으로만 사용됩니다.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateUser(user.user_id)}
                      className="flex-1 min-h-[40px] rounded-lg bg-blue-600 text-sm font-semibold text-white"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="flex-1 min-h-[40px] rounded-lg border border-gray-300 text-sm font-semibold text-gray-600"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={memoByUser[user.user_id] ?? user.approval_memo ?? ''}
                onChange={(event) => setMemoByUser((prev) => ({ ...prev, [user.user_id]: event.target.value }))}
                className="mt-3 min-h-[64px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="승인 또는 거절 메모"
              />

              <div className="mt-3 grid grid-cols-4 gap-2">
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
                <button
                  type="button"
                  onClick={() => resetUserCounting(user)}
                  className="min-h-[40px] rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-700"
                >
                  통계초기화
                </button>
              </div>

              {/* [GEPv30-105] 2행: 비밀번호 초기화 */}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => resetUserPassword(user)}
                  disabled={resettingPwUserId === user.user_id}
                  className="w-full min-h-[40px] rounded-lg border border-orange-200 bg-orange-50 px-3 text-sm font-semibold text-orange-700 disabled:opacity-50"
                >
                  {resettingPwUserId === user.user_id ? '초기화 중...' : '비밀번호 초기화 (기준 8자리)'}
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
