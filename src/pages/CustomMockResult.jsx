/**
 * src/pages/CustomMockResult.jsx — /custom-mock/:sessionId/result
 * 맞춤 모의고사 최종 성적표
 * GEP_078 Phase 6-1 STEP 5
 *
 * MockExamResult.jsx 90% 재활용
 * 추가: 약점 모드 시 WeaknessSection (개선 분석 + 다음 추천 과목)
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useCustomMockStore, loadPersistedSession } from '../stores/customMockStore'
import {
  loadResult,
  checkPass,
  calcAverage,
  analyzeWeakness,
} from '../services/customMockService'

// ── 유틸 (MockExamResult 재활용) ───────────────────────────────────────────────
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '-'
  const totalMin = Math.floor(seconds / 60)
  const sec      = seconds % 60
  if (totalMin >= 60) {
    const h   = Math.floor(totalMin / 60)
    const min = totalMin % 60
    return `${h}시간 ${min}분 ${sec}초`
  }
  return `${totalMin}분 ${sec}초`
}

function scoreTextColor(score) {
  if (score >= 60) return 'text-green-600'
  if (score >= 40) return 'text-amber-500'
  return 'text-red-500'
}

function scoreBarColor(score) {
  if (score >= 60) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-red-400'
}

// ── 과목 점수 카드 (MockExamResult SubjectScoreCard 재활용) ────────────────────
function SubjectScoreCard({ subject, data }) {
  if (!data) return null
  const { correct, total, score } = data
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{subject}</span>
        <span className={`text-lg font-bold ${scoreTextColor(score)}`}>
          {score.toFixed(1)}점
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${scoreBarColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
          {correct}/{total}
        </span>
      </div>
      <p className={`text-xs font-semibold ${score >= 40 ? 'text-green-600' : 'text-red-500'}`}>
        {score >= 40 ? '✅ 합격선 통과' : '❌ 합격선 미달 (40점 이상 필요)'}
      </p>
    </div>
  )
}

// ── 약점 개선 분석 섹션 (약점 모드 전용) ──────────────────────────────────────
function WeaknessSection({ weakSubjects, analysis, isLoading }) {
  if (!weakSubjects || weakSubjects.length === 0) return null

  // 다음 추천: 이번 세션에서 집중하지 않은 세부과목 중 정답률 낮은 순 2개
  const nextWeak = analysis
    ? Object.entries(analysis.subjectStats)
        .filter(([sub]) => !weakSubjects.includes(sub))
        .sort((a, b) => a[1].accuracy - b[1].accuracy)
        .slice(0, 2)
    : []

  return (
    <div className="flex flex-col gap-3">

      {/* 집중 훈련 세부과목 + 현재 정답률 */}
      <div className="rounded-2xl bg-orange-50 border border-orange-100 px-4 py-4 flex flex-col gap-3">
        <div>
          <p className="text-xs font-bold text-orange-600">📊 집중 훈련한 세부과목</p>
          <p className="text-[11px] text-orange-400 mt-0.5">이번 세션에서 2배 비중으로 출제된 약점 과목</p>
        </div>

        {isLoading && (
          <p className="text-xs text-gray-400 animate-pulse">정답률 분석 중···</p>
        )}

        {!isLoading && weakSubjects.map(sub => {
          const stat = analysis?.subjectStats?.[sub]
          return (
            <div key={sub} className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700 flex-1">{sub}</span>
              {stat ? (
                <>
                  <div className="flex-1 max-w-[100px] h-1.5 bg-orange-100 rounded-full overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${stat.accuracy >= 60 ? 'bg-green-400' : stat.accuracy >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${stat.accuracy}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${scoreTextColor(stat.accuracy)}`}>
                    {stat.accuracy}%
                  </span>
                  <span className="text-xs text-gray-300">({stat.total}회)</span>
                </>
              ) : (
                <span className="text-xs text-gray-400">데이터 없음</span>
              )}
            </div>
          )
        })}

        {!isLoading && (
          <p className="text-[10px] text-orange-300">* 전체 MCQ 풀이 기준 누적 정답률</p>
        )}
      </div>

      {/* 다음 약점 모드 추천 */}
      {!isLoading && nextWeak.length > 0 && (
        <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-blue-600">💡 다음 약점 모드 추천 세부과목</p>
          {nextWeak.map(([sub, stat]) => (
            <div key={sub} className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">{sub}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${scoreTextColor(stat.accuracy)}`}>
                  현재 정답률 {stat.accuracy}%
                </span>
                <span className="text-xs text-gray-300">({stat.total}회)</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function CustomMockResult() {
  const navigate      = useNavigate()
  const { sessionId } = useParams()
  const userId        = useAuthStore(s => s.userId)

  // 모드 정보: 스토어 우선 → localStorage 세션 메타 fallback
  const storeMode         = useCustomMockStore(s => s.mode)
  const storeWeakSubjects = useCustomMockStore(s => s.weakSubjects)
  const sessionMeta       = loadPersistedSession()
  const meta              = sessionMeta?.sessionLocalId === sessionId ? sessionMeta : null
  const mode              = storeMode || meta?.mode || null
  const weakSubjects      = storeWeakSubjects?.length > 0 ? storeWeakSubjects : (meta?.weakSubjects ?? [])

  // 결과 데이터 (localStorage)
  const part1Result = loadResult(sessionId, 'part1')
  const part2Result = loadResult(sessionId, 'part2')

  // 약점 분석 (약점 모드 전용)
  const [weaknessAnalysis, setWeaknessAnalysis] = useState(null)
  const [analysisLoading,  setAnalysisLoading]  = useState(false)

  useEffect(() => {
    if (mode === 'weakness' && userId) {
      setAnalysisLoading(true)
      analyzeWeakness(userId)
        .then(setWeaknessAnalysis)
        .finally(() => setAnalysisLoading(false))
    }
  }, [mode, userId])

  // ── 데이터 없음 ────────────────────────────────────────────────────────────
  if (!part1Result || !part2Result) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-12 flex flex-col items-center gap-4 text-center">
        <span className="text-4xl">⚠️</span>
        <p className="text-sm text-gray-600">성적 데이터를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/custom-mock')}
          className="px-5 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700"
        >
          맞춤 모의고사 홈으로
        </button>
      </div>
    )
  }

  // ── 집계 ───────────────────────────────────────────────────────────────────
  const allScores = { ...part1Result.scores, ...part2Result.scores }
  const average   = calcAverage(allScores)
  const isPass    = checkPass(allScores)
  const totalTime = (part1Result.elapsedTime ?? 0) + (part2Result.elapsedTime ?? 0)

  const modeBadge = mode === 'weakness'
    ? { label: '약점 집중 모드', className: 'bg-orange-100 text-orange-700' }
    : { label: '표준 모드',       className: 'bg-blue-100   text-blue-700'   }

  // ── 렌더 ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* 합격/불합격 헤더 */}
      <div className={`text-center py-6 rounded-2xl ${isPass ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
        <span className="text-4xl">{isPass ? '🎉' : '😞'}</span>
        <h1 className={`text-2xl font-bold mt-2 ${isPass ? 'text-green-700' : 'text-red-600'}`}>
          {isPass ? '합격' : '불합격'}
        </h1>
        <div className="flex items-end justify-center gap-1.5 mt-3">
          <span className={`text-4xl font-bold ${scoreTextColor(average)}`}>
            {average.toFixed(1)}
          </span>
          <span className="text-base text-gray-400 mb-1">점 (전체 평균)</span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${modeBadge.className}`}>
            {modeBadge.label}
          </span>
          <span className="text-xs text-gray-400">· 총 {formatDuration(totalTime)}</span>
        </div>
      </div>

      {/* 과목별 점수 상세 */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-500 px-1">과목별 성적</p>
        {['법령', '손보1부', '손보2부'].map(subject => (
          <SubjectScoreCard key={subject} subject={subject} data={allScores[subject]} />
        ))}
      </div>

      {/* 합격 기준 */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
        <p className="text-xs text-gray-400">
          합격 기준: <span className="font-semibold">과목당 40점 이상</span> ·{' '}
          <span className="font-semibold">전체 평균 60점 이상</span>
        </p>
      </div>

      {/* 약점 개선 분석 (약점 모드 전용) */}
      {mode === 'weakness' && (
        <WeaknessSection
          weakSubjects={weakSubjects}
          analysis={weaknessAnalysis}
          isLoading={analysisLoading}
        />
      )}

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate('/custom-mock')}
            className="py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            새 시험 생성
          </button>
          <button
            onClick={() => navigate('/custom-mock/stats')}
            className="py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            통계보기
          </button>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-xl border border-gray-100 text-gray-400 text-sm hover:bg-gray-50 transition-colors"
        >
          홈으로
        </button>
      </div>

    </div>
  )
}
