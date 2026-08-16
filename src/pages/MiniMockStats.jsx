/**
 * src/pages/MiniMockStats.jsx — /mini-mock/stats
 * 간이모의고사 통계 화면
 * GEPv30-128 STEP 3
 *
 * 세션 테이블이 없어 세트별 점수 추이(타임라인)는 제공하지 않음.
 * 공용 attempts 테이블(study_mode='mini_mock') 기반 약점 분석 중심.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getMiniMockAttempts } from '../services/miniMockService'
import WeaknessHeatmap from '../components/stats/WeaknessHeatmap'
import StudyRoadmap    from '../components/stats/StudyRoadmap'
import AppHeader        from '../components/AppHeader'

// ── 요약 카드 ─────────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-4">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
      <span className="text-xs text-gray-500 mt-0.5">{label}</span>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function MiniMockStats() {
  const navigate   = useNavigate()
  const userId     = useAuthStore((s) => s.userId)
  const authStatus = useAuthStore((s) => s.authStatus)

  const [attempts,  setAttempts]  = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (authStatus !== 'authenticated' || !userId) {
        setIsLoading(false)
        return
      }
      const data = await getMiniMockAttempts(userId)
      setAttempts(data)
      setIsLoading(false)
    }
    load()
  }, [authStatus, userId])

  const totalAttempts = attempts.length
  const correctCount  = attempts.filter((a) => a.is_correct).length
  const accuracy      = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

      {/* 상단 헤더 */}
      <AppHeader title="간이 모의고사 통계" backTo="/mini-mock" />

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-gray-400 animate-pulse">통계를 불러오는 중···</p>
        </div>
      )}

      {/* 데이터 없음 */}
      {!isLoading && totalAttempts === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">📊</span>
          <p className="text-base font-semibold text-gray-600">아직 학습 기록이 없습니다</p>
          <p className="text-sm text-gray-400">세트를 풀면 세부과목별 약점 분석이 여기에 표시됩니다.</p>
          <button
            onClick={() => navigate('/mini-mock')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            간이 모의고사 시작하기
          </button>
        </div>
      )}

      {!isLoading && totalAttempts > 0 && (
        <>
          {/* ── 전체 요약 ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 px-1">전체 요약</p>
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard label="총 학습 문항" value={totalAttempts} sub="문항" />
              <SummaryCard
                label="전체 정답률"
                value={`${accuracy}%`}
                sub={`${correctCount}정답`}
                color={accuracy >= 60 ? 'text-green-600' : accuracy >= 40 ? 'text-amber-500' : 'text-red-500'}
              />
            </div>
          </div>

          {/* ── 세부과목 약점 분석 ────────────────────────────────────────── */}
          <WeaknessHeatmap questionAttempts={attempts} />

          {/* ── 맞춤 학습 로드맵 ──────────────────────────────────────────── */}
          <StudyRoadmap questionAttempts={attempts} />
        </>
      )}

    </div>
  )
}
