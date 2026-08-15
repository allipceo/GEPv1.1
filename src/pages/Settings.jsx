import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { resetCountingBaseline } from '../services/countingResetService'
import AppHeader from '../components/AppHeader'

export default function Settings() {
  const authState = useAuthStore.getState()
  const realName  = useAuthStore((s) => s.realName)
  const email     = useAuthStore((s) => s.email)      // 사번@gep.local
  const userId    = useAuthStore((s) => s.userId)
  const serviceLevel = useAuthStore((s) => s.serviceLevel)
  const resetBaselineAt = useAuthStore((s) => s.resetBaselineAt)

  // 사번 추출 (이메일에서 @gep.local 제거)
  const employeeId = email ? email.replace('@gep.local', '') : '-'

  // ── 성명 수정 ──
  const [editName, setEditName] = useState(false)
  const [newName, setNewName]   = useState(realName ?? '')
  const [nameMsg, setNameMsg]   = useState('')

  const handleNameSave = async () => {
    if (!newName.trim()) { setNameMsg('성명을 입력해 주세요.'); return }
    const { error } = await supabase
      .from('users')
      .update({ real_name: newName.trim() })
      .eq('user_id', userId)
    if (error) { setNameMsg('저장 실패: ' + error.message); return }
    // authStore realName 갱신
    useAuthStore.setState({ realName: newName.trim() })
    setEditName(false)
    setNameMsg('성명이 변경되었습니다.')
  }

  // ── 비밀번호 변경 ──
  const [pw, setPw]         = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwMsg, setPwMsg]   = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const handlePwSave = async () => {
    if (pw.length < 8) { setPwMsg('비밀번호는 8자리 이상이어야 합니다.'); return }
    if (pw !== pwConfirm) { setPwMsg('비밀번호가 일치하지 않습니다.'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwSaving(false)
    if (error) { setPwMsg('변경 실패: ' + error.message); return }
    setPw(''); setPwConfirm('')
    setPwMsg('비밀번호가 변경되었습니다.')
  }

  // ── 통계 초기화 ──
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetMsg, setResetMsg]         = useState('')
  const [resetting, setResetting]       = useState(false)

  const handleReset = async () => {
    if (resetConfirm !== '초기화') { setResetMsg('"초기화"를 정확히 입력해 주세요.'); return }
    setResetting(true)
    const result = await resetCountingBaseline(authState, {
      previousBaselineAt: resetBaselineAt,
      reason: 'self_reset',
    })
    setResetting(false)
    if (!result.success) { setResetMsg('초기화 실패: ' + result.error); return }
    // authStore resetBaselineAt 갱신
    useAuthStore.setState({ resetBaselineAt: result.resetBaselineAt })
    setResetConfirm('')
    setResetMsg('학습 데이터가 초기화되었습니다. 새로운 기준으로 시작합니다.')
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">
      <AppHeader title="설정" backTo="/" />

      {/* ── 섹션 1: 내 계정 ── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">내 계정</p>
        <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">

          {/* 사번 (read-only) */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500">사번</span>
            <span className="text-sm font-medium text-gray-400">{employeeId}</span>
          </div>

          {/* 성명 */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">성명</span>
              {!editName
                ? <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{realName ?? '-'}</span>
                    <button onClick={() => { setEditName(true); setNameMsg('') }}
                      className="text-xs text-blue-500 hover:text-blue-700">수정</button>
                  </div>
                : <div className="flex items-center gap-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-sm w-28 text-right"
                      maxLength={20}
                    />
                    <button onClick={handleNameSave}
                      className="text-xs text-blue-600 font-semibold">저장</button>
                    <button onClick={() => { setEditName(false); setNewName(realName ?? '') }}
                      className="text-xs text-gray-400">취소</button>
                  </div>
              }
            </div>
            {nameMsg && <p className="text-xs mt-1 text-right text-blue-500">{nameMsg}</p>}
          </div>

          {/* 서비스 레벨 */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500">서비스 레벨</span>
            <span className="text-sm font-medium text-gray-400">Lv.{serviceLevel}</span>
          </div>
        </div>
      </section>

      {/* ── 섹션 2: 보안 ── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">보안</p>
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">비밀번호 변경</p>
          <p className="text-xs text-gray-400">8자리 이상의 새 비밀번호를 입력해 주세요.</p>
          <input
            type="password"
            placeholder="새 비밀번호 (8자리 이상)"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setPwMsg('') }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={pwConfirm}
            onChange={(e) => { setPwConfirm(e.target.value); setPwMsg('') }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          {pwMsg && <p className={`text-xs ${pwMsg.includes('변경되었') ? 'text-blue-500' : 'text-red-500'}`}>{pwMsg}</p>}
          <button
            onClick={handlePwSave}
            disabled={pwSaving}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {pwSaving ? '변경 중…' : '비밀번호 변경'}
          </button>
        </div>
      </section>

      {/* ── 섹션 3: 학습 데이터 ── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">학습 데이터</p>
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-red-700">통계 초기화</p>
          <p className="text-xs text-red-500 leading-relaxed">
            지금 시점을 새 기준으로 설정합니다. 이후부터 풀이 카운터가 새로 시작됩니다.
            기존 데이터는 삭제되지 않으나 통계에서 제외됩니다. <strong>되돌릴 수 없습니다.</strong>
          </p>
          <input
            placeholder='확인을 위해 "초기화" 를 입력하세요'
            value={resetConfirm}
            onChange={(e) => { setResetConfirm(e.target.value); setResetMsg('') }}
            className="border border-red-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          {resetMsg && <p className={`text-xs ${resetMsg.includes('되었습니다') ? 'text-blue-500' : 'text-red-500'}`}>{resetMsg}</p>}
          <button
            onClick={handleReset}
            disabled={resetting || resetConfirm !== '초기화'}
            className="w-full py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40"
          >
            {resetting ? '초기화 중…' : '통계 초기화'}
          </button>
        </div>
      </section>

      {/* ── 섹션 4: 앱 정보 ── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">앱 정보</p>
        <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500">버전</span>
            <span className="text-sm text-gray-400">GEP v3.0</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500">시험일</span>
            <span className="text-sm text-gray-400">2026.11.15</span>
          </div>
        </div>
      </section>

    </div>
  )
}
