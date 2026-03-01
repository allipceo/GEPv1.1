/**
 * src/pages/MockExamResult.jsx
 * 모의고사 성적표 화면 (1교시 / 2교시 / 최종 공용)
 * GEP_058 Phase5 STEP4
 *
 * 라우트:
 *   /mock/:round/part1/result → 1교시 성적표 (params.part = 'part1')
 *   /mock/:round/part2/result → 2교시 성적표 (params.part = 'part2')
 *   /mock/:round/result       → 최종 종합 성적표 (params.part = undefined)
 *
 * 데이터 수신:
 *   - 교시 결과: navigate state ({ scores, elapsedTime })
 *   - 최종 결과: localStorage (RESULT_LS_KEY) — part1 + part2 합산
 */

import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { checkPass, calcAverage, loadResult, PROGRESS_LS_KEY } from '../services/mockExamService'

// ── 유틸 ──────────────────────────────────────────────────────────────────────
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

// ── 점수 컬러 ─────────────────────────────────────────────────────────────────
function scoreBarColor(score) {
  if (score >= 60) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-red-400'
}

function scoreTextColor(score) {
  if (score >= 60) return 'text-green-600'
  if (score >= 40) return 'text-amber-500'
  return 'text-red-500'
}

// ── 과목 점수 카드 ─────────────────────────────────────────────────────────────
function SubjectScoreCard({ subject, data, showPassLine = false }) {
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
      {showPassLine && (
        <p className={`text-xs font-semibold ${score >= 40 ? 'text-green-600' : 'text-red-500'}`}>
          {score >= 40 ? '✅ 합격선 통과' : '❌ 합격선 미달 (40점 이상 필요)'}
        </p>
      )}
    </div>
  )
}

// ── 1교시 성적표 ──────────────────────────────────────────────────────────────
function Part1Result({ round, scores, elapsedTime, navigate }) {
  const lawData = scores['법령']

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* 헤더 */}
      <div className="text-center py-4">
        <span className="text-3xl">📘</span>
        <h1 className="text-xl font-bold text-gray-900 mt-2">1교시 완료</h1>
        <p className="text-sm text-gray-400 mt-1">{round}회 법령 · {formatDuration(elapsedTime)} 소요</p>
      </div>

      {/* 점수 카드 */}
      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-5 flex flex-col gap-4">
        <p className="text-xs font-bold text-blue-600">법령 성적</p>

        {lawData && (
          <>
            {/* 큰 점수 */}
            <div className="flex items-end gap-2 justify-center py-2">
              <span className={`text-5xl font-bold ${scoreTextColor(lawData.score)}`}>
                {lawData.score.toFixed(1)}
              </span>
              <span className="text-lg text-gray-400 mb-1">점</span>
            </div>

            {/* 진행바 */}
            <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all ${scoreBarColor(lawData.score)}`}
                style={{ width: `${lawData.score}%` }}
              />
            </div>

            {/* 정답 수 + 합격선 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                40문제 중 <span className="font-bold text-gray-800">{lawData.correct}개</span> 정답
              </span>
              <span className={`font-semibold ${lawData.score >= 40 ? 'text-green-600' : 'text-red-500'}`}>
                {lawData.score >= 40 ? '✅ 합격선 통과' : '❌ 합격선 미달'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 합격 기준 안내 */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500">
        합격 기준: <span className="font-semibold">과목당 40점 이상</span> · <span className="font-semibold">전체 평균 60점 이상</span>
      </div>

      {/* 버튼 */}
      <div className="flex flex-col gap-2 mt-1">
        <button
          onClick={() => navigate(`/mock/${round}/break`)}
          className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          ☕ 15분 휴식 후 2교시
        </button>
        <button
          onClick={() => navigate(`/mock/${round}/part2`)}
          className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          바로 2교시 시작
        </button>
      </div>

    </div>
  )
}

// ── 2교시 성적표 ──────────────────────────────────────────────────────────────
function Part2Result({ round, scores, elapsedTime, navigate }) {
  const p1Data = scores['손보1부']
  const p2Data = scores['손보2부']

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* 헤더 */}
      <div className="text-center py-4">
        <span className="text-3xl">📗📕</span>
        <h1 className="text-xl font-bold text-gray-900 mt-2">2교시 완료</h1>
        <p className="text-sm text-gray-400 mt-1">{round}회 손보 · {formatDuration(elapsedTime)} 소요</p>
      </div>

      {/* 과목별 점수 */}
      <div className="flex flex-col gap-3">
        <SubjectScoreCard subject="손보1부" data={p1Data} showPassLine />
        <SubjectScoreCard subject="손보2부" data={p2Data} showPassLine />
      </div>

      {/* 버튼 */}
      <div className="flex flex-col gap-2 mt-2">
        <button
          onClick={() => navigate(`/mock/${round}/result`)}
          className="w-full py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          🏆 최종 성적표 보기
        </button>
        <button
          onClick={() => navigate('/mock')}
          className="w-full py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
        >
          회차 선택으로
        </button>
      </div>

    </div>
  )
}

// ── 최종 종합 성적표 ──────────────────────────────────────────────────────────
function FinalResult({ round, part1Result, part2Result, navigate }) {
  if (!part1Result || !part2Result) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-12 flex flex-col items-center gap-4 text-center">
        <span className="text-4xl">⚠️</span>
        <p className="text-sm text-gray-600">성적 데이터를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/mock')}
          className="px-5 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700"
        >
          회차 선택으로
        </button>
      </div>
    )
  }

  const allScores = { ...part1Result.scores, ...part2Result.scores }
  const average   = calcAverage(allScores)
  const isPass    = checkPass(allScores)
  const totalTime = (part1Result.elapsedTime ?? 0) + (part2Result.elapsedTime ?? 0)

  function handleRetry() {
    try {
      localStorage.removeItem(PROGRESS_LS_KEY(round, 'part1'))
      localStorage.removeItem(PROGRESS_LS_KEY(round, 'part2'))
    } catch (_) {}
    navigate(`/mock/${round}/part1`)
  }

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
        <p className="text-xs text-gray-400 mt-2">{round}회 · 총 {formatDuration(totalTime)}</p>
      </div>

      {/* 과목별 점수 상세 */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-500 px-1">과목별 성적</p>
        {['법령', '손보1부', '손보2부'].map(subject => (
          <SubjectScoreCard
            key={subject}
            subject={subject}
            data={allScores[subject]}
            showPassLine
          />
        ))}
      </div>

      {/* 합격 기준 */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex flex-col gap-1">
        <p className="text-xs font-semibold text-gray-500">합격 기준</p>
        <p className="text-xs text-gray-400">
          과목당 40점 이상 · 전체 평균 60점 이상
        </p>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleRetry}
            className="py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            다시풀기
          </button>
          <button
            onClick={() => navigate('/mock/stats')}
            className="py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
            title="STEP 6에서 활성화"
          >
            통계보기
          </button>
        </div>
        <button
          onClick={() => navigate('/mock')}
          className="w-full py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
        >
          회차 선택으로
        </button>
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

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function MockExamResult() {
  const navigate  = useNavigate()
  const { round: roundParam, part } = useParams()
  const location  = useLocation()
  const round     = parseInt(roundParam, 10)

  // navigate state로 수신한 채점 데이터 (1교시/2교시 결과 직후)
  const { scores = null, elapsedTime = 0 } = location.state ?? {}

  // 최종 성적표: localStorage에서 part1/part2 결과 로드
  const part1Result = loadResult(round, 'part1')
  const part2Result = loadResult(round, 'part2')

  // ── 모드 분기 ────────────────────────────────────────────────────────────────
  if (part === 'part1') {
    return (
      <Part1Result
        round={round}
        scores={scores ?? part1Result?.scores ?? {}}
        elapsedTime={elapsedTime || part1Result?.elapsedTime || 0}
        navigate={navigate}
      />
    )
  }

  if (part === 'part2') {
    return (
      <Part2Result
        round={round}
        scores={scores ?? part2Result?.scores ?? {}}
        elapsedTime={elapsedTime || part2Result?.elapsedTime || 0}
        navigate={navigate}
      />
    )
  }

  // part 없음 → 최종 성적표
  return (
    <FinalResult
      round={round}
      part1Result={part1Result}
      part2Result={part2Result}
      navigate={navigate}
    />
  )
}
