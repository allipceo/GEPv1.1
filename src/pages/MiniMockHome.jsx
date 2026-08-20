/**
 * src/pages/MiniMockHome.jsx — /mini-mock
 * 간이 모의고사 세트 선택 화면
 * GEPv30-109 STEP 6 (+ GEPv30-110 레벨 게이트 정정 반영)
 *
 * 레벨 게이트는 App.jsx 라우트 레벨(serviceKey: 'MINI_MOCK')로 이관됨 (GEPv30-120)
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import useMiniMockStore, { MINI_PROGRESS_KEY, MINI_RESULT_KEY } from '../stores/miniMockStore'
import miniMockConfig from '../config/miniMockConfig'

// ── 세트별 상태 계산 (localStorage 기준) ──────────────────────────────────────
function readSetStatus(setId) {
  try {
    const result = JSON.parse(localStorage.getItem(MINI_RESULT_KEY(setId)) || 'null')
    if (result) {
      return { state: 'done', isPassed: result.isPassed, averageScore: result.averageScore }
    }
  } catch (_) {}

  try {
    const progress = JSON.parse(localStorage.getItem(MINI_PROGRESS_KEY(setId)) || 'null')
    if (progress) {
      const remaining = Math.max(0, miniMockConfig.timeLimit - (progress.elapsedTime ?? 0))
      return { state: 'progress', remainingMin: Math.ceil(remaining / 60) }
    }
  } catch (_) {}

  return { state: 'new' }
}

// ── 세트 카드 ─────────────────────────────────────────────────────────────────
function SetCard({ setId, status, onClick }) {
  const label = `SET ${String(setId).padStart(2, '0')}`

  const styleByState = {
    new:      'bg-gray-50 border-gray-200 text-gray-500',
    progress: 'bg-amber-50 border-amber-200 text-amber-700',
    done:     status.isPassed
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : 'bg-red-50 border-red-200 text-red-600',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-3 text-center transition-colors active:opacity-80 ${styleByState[status.state]}`}
    >
      <span className="text-sm font-bold">{label}</span>
      {status.state === 'progress' && (
        <span className="text-[10px] font-semibold">남은 {status.remainingMin}분</span>
      )}
      {status.state === 'done' && (
        <span className="text-[10px] font-semibold">{status.averageScore}점</span>
      )}
      {status.state === 'new' && (
        <span className="text-[10px] text-gray-300">미응시</span>
      )}
    </button>
  )
}

// ── 확인 다이얼로그 ────────────────────────────────────────────────────────────
function ChoiceModal({ title, options, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-[640px] rounded-t-2xl px-5 py-6 flex flex-col gap-3">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <div className="flex flex-col gap-2 mt-1">
          {options.map(opt => (
            <button
              key={opt.label}
              onClick={opt.onClick}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${opt.className}`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl text-gray-400 text-sm font-medium"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function MiniMockHome() {
  const navigate = useNavigate()

  const [dialogSetId, setDialogSetId] = useState(null)

  const setIds = useMemo(() => Array.from({ length: miniMockConfig.setCount }, (_, i) => i + 1), [])
  const statuses = useMemo(() => {
    const map = {}
    setIds.forEach(id => { map[id] = readSetStatus(id) })
    return map
  }, [setIds, dialogSetId])

  function handleCardClick(setId) {
    const status = statuses[setId]
    if (status.state === 'new') {
      navigate(`/mini-mock/${setId}`)
      return
    }
    setDialogSetId(setId)
  }

  const dialogStatus = dialogSetId ? statuses[dialogSetId] : null

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">
      <AppHeader title="간이 모의고사" />
      <div className="flex justify-end -mt-3">
        <button
          onClick={() => navigate('/mini-mock/stats')}
          className="text-sm text-indigo-500 font-semibold hover:text-indigo-700 transition-colors"
        >
          통계 ›
        </button>
      </div>

      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex flex-col gap-1">
        <p className="text-xs font-bold text-indigo-700">간이 모의고사 안내</p>
        <p className="text-xs text-indigo-600">30문제 · 30분 · 3대 과목 비율 유지</p>
        <p className="text-xs text-indigo-400">합격 기준: 과목당 40점 이상 · 전체 평균 60점 이상</p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {setIds.map(setId => (
          <SetCard
            key={setId}
            setId={setId}
            status={statuses[setId]}
            onClick={() => handleCardClick(setId)}
          />
        ))}
      </div>

      {dialogSetId && dialogStatus?.state === 'progress' && (
        <ChoiceModal
          title={`SET ${String(dialogSetId).padStart(2, '0')} — 이어서 풀까요?`}
          onCancel={() => setDialogSetId(null)}
          options={[
            {
              label: `이어서 풀기 (남은 ${dialogStatus.remainingMin}분)`,
              className: 'bg-amber-500 text-white hover:bg-amber-600',
              onClick: () => navigate(`/mini-mock/${dialogSetId}`),
            },
            {
              label: '처음부터 다시 풀기',
              className: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              onClick: () => {
                // store.clearProgress()는 로컬+DB(state_json) 양쪽을 모두 지운다 —
                // 로컬만 지우면 DB에 남은 예전 진행분이 "이어풀기"로 되살아난다
                // (GEPv30-145, 로컬/DB 중 최신 것을 신뢰하는 병합 로직 때문).
                useMiniMockStore.getState().clearProgress(dialogSetId)
                navigate(`/mini-mock/${dialogSetId}`)
              },
            },
          ]}
        />
      )}

      {dialogSetId && dialogStatus?.state === 'done' && (
        <ChoiceModal
          title={`SET ${String(dialogSetId).padStart(2, '0')} — ${dialogStatus.averageScore}점 (${dialogStatus.isPassed ? '합격' : '불합격'})`}
          onCancel={() => setDialogSetId(null)}
          options={[
            {
              label: '성적표 보기',
              className: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              onClick: () => navigate(`/mini-mock/${dialogSetId}/result`),
            },
            {
              label: '다시 도전하기',
              className: 'bg-indigo-600 text-white hover:bg-indigo-700',
              onClick: () => {
                // store.clearProgress()는 로컬+DB(state_json) 양쪽을 모두 지운다 —
                // 로컬만 지우면 DB에 남은 예전 진행분이 "이어풀기"로 되살아난다
                // (GEPv30-145, 로컬/DB 중 최신 것을 신뢰하는 병합 로직 때문).
                useMiniMockStore.getState().clearProgress(dialogSetId)
                navigate(`/mini-mock/${dialogSetId}`)
              },
            },
          ]}
        />
      )}
    </div>
  )
}
