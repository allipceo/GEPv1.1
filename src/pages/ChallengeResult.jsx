/**
 * src/pages/ChallengeResult.jsx — /unified-wrong/result
 * 오답 도전 완료 결과 화면
 * GEP_108 Phase 6-3 STEP 4
 *
 * 데이터: localStorage 'gep:unified_wrong:challenge_result'
 * { beforeCount, correctCount, wrongCount, subjectStats, minCount, timestamp }
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReclassificationAnimation from '../components/wrong/ReclassificationAnimation'

export default function ChallengeResult() {
  const navigate = useNavigate()

  const result = useMemo(() => {
    try {
      const raw = localStorage.getItem('gep:unified_wrong:challenge_result')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  // 결과 데이터 없음 — 도전 모드 미완료 상태
  if (!result) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">😅</span>
          <p className="text-base font-semibold text-gray-600">결과 데이터가 없습니다</p>
          <p className="text-sm text-gray-400">도전 모드를 먼저 완료해 주세요.</p>
          <button
            onClick={() => navigate('/unified-wrong')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold
              hover:bg-indigo-700 transition-colors"
          >
            오답 복습으로 이동
          </button>
        </div>
      </div>
    )
  }

  const {
    beforeCount  = 0,
    correctCount = 0,
    wrongCount   = 0,
    subjectStats = [],
    minCount     = 5,
  } = result

  const correctPct = beforeCount > 0 ? Math.round((correctCount / beforeCount) * 100) : 0
  const wrongPct   = 100 - correctPct

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/unified-wrong')}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">도전 완료!</h1>
        <span className="ml-auto text-xs text-gray-400">{minCount}회+ 모드</span>
      </div>

      {/* ── Before/After 시각화 ───────────────────────────────────────────── */}
      <ReclassificationAnimation
        beforeCount    ={beforeCount}
        afterCorrect   ={correctCount}
        afterWrong     ={wrongCount}
        subjectSummary ={subjectStats}
        isVisible      ={true}
      />

      {/* ── 결과 요약 카드 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-4 text-center">
          <p className="text-[11px] text-green-500 font-semibold mb-1">✅ 정답</p>
          <p className="text-3xl font-bold text-green-600 tabular-nums">{correctCount}개</p>
          <p className="text-xs text-green-400 mt-1">{correctPct}%</p>
        </div>
        <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-4 text-center">
          <p className="text-[11px] text-red-400 font-semibold mb-1">❌ 오답</p>
          <p className="text-3xl font-bold text-red-500 tabular-nums">{wrongCount}개</p>
          <p className="text-xs text-red-400 mt-1">{wrongPct}%</p>
        </div>
      </div>

      {/* ── 다음 학습 제안 ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-500 px-1">다음 학습 제안</p>

        {wrongCount > 0 && (
          <button
            onClick={() => navigate('/unified-wrong/challenge/6')}
            className="w-full py-3.5 rounded-2xl bg-red-600 text-white text-sm font-bold
              flex items-center justify-center gap-2
              hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm"
          >
            🔥 6회+ 긴급 재도전
            <span className="text-xs font-normal opacity-80">({wrongCount}개 오답)</span>
          </button>
        )}

        <button
          onClick={() => navigate('/unified-wrong/challenge/5')}
          className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold
            flex items-center justify-center gap-2
            hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
        >
          📚 5회+ 남은 문제 풀기
        </button>

        <button
          onClick={() => navigate('/unified-wrong/progress')}
          className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold
            hover:bg-gray-200 transition-colors"
        >
          📊 학습 진행도 확인
        </button>
      </div>

      {/* ── 홈으로 ───────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/')}
        className="w-full py-3 rounded-xl border border-gray-200 text-gray-500 text-sm
          hover:bg-gray-50 transition-colors"
      >
        홈으로
      </button>
    </div>
  )
}
