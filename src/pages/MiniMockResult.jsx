/**
 * src/pages/MiniMockResult.jsx — /mini-mock/:setId/result
 * 간이 모의고사 성적표 화면
 * GEPv30-109 STEP 8 (+ GEPv30-110 subSubjectResults·오답재학습 정정 반영)
 *
 * 데이터 수신:
 *   - 방금 제출: navigate state ({ scores })
 *   - 재방문(Home에서 "성적표 보기"): localStorage (MINI_RESULT_KEY) 폴백
 */

import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import useMiniMockStore from '../stores/miniMockStore'

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

function SubjectScoreRow({ subject, data }) {
  const { correct, total, score } = data
  const passed = score >= 40
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{subject} ({total}문)</span>
        <span className={`text-base font-bold ${scoreTextColor(score)}`}>{score}점</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-2 rounded-full transition-all ${scoreBarColor(score)}`} style={{ width: `${score}%` }} />
        </div>
        <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">{correct}/{total}</span>
      </div>
      <p className={`text-xs font-semibold ${passed ? 'text-green-600' : 'text-red-500'}`}>
        {passed ? '✅ 과락 없음' : '❌ 과락 (40점 미만)'}
      </p>
    </div>
  )
}

function SubSubjectBar({ subSubject, data }) {
  const { correct, total, score } = data
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 flex-shrink-0 text-xs text-gray-600 truncate">{subSubject}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full ${scoreBarColor(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-16 flex-shrink-0 text-right text-xs text-gray-400 tabular-nums">
        {correct}/{total} ({score}%)
      </span>
    </div>
  )
}

export default function MiniMockResult() {
  const { setId } = useParams()
  const navigate   = useNavigate()
  const location   = useLocation()

  const scores = location.state?.scores ?? useMiniMockStore.getState().loadResult(Number(setId))

  if (!scores) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">
        <AppHeader title="간이 모의고사 결과" backTo="/mini-mock" />
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-gray-400">결과 데이터를 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate('/mini-mock')}
            className="px-5 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            세트 목록으로
          </button>
        </div>
      </div>
    )
  }

  const { subjectResults, subSubjectResults, averageScore, totalCorrect, isPassed } = scores

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">
      <AppHeader title={`SET ${String(setId).padStart(2, '0')} 결과`} backTo="/mini-mock" />

      {/* 합격 판정 배너 */}
      <div className={`rounded-2xl px-5 py-6 flex flex-col items-center gap-2 ${isPassed ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
        <span className="text-3xl">{isPassed ? '🎉' : '❌'}</span>
        <p className={`text-lg font-bold ${isPassed ? 'text-emerald-700' : 'text-red-600'}`}>
          {isPassed ? '합격' : '불합격'}
        </p>
        <p className="text-sm text-gray-500">
          전체 평균 <span className="font-bold text-gray-800">{averageScore}점</span> ({totalCorrect}/30 정답)
        </p>
      </div>

      {/* 3대 과목별 성적표 */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-500 px-1">과목별 성적</p>
        {Object.entries(subjectResults).map(([subject, data]) => (
          <SubjectScoreRow key={subject} subject={subject} data={data} />
        ))}
      </div>

      {/* 12개 세부과목 취약도 (정답률 낮은 순) */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-gray-500 px-1">세부과목별 취약도</p>
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 flex flex-col gap-2.5">
          {subSubjectResults.map(({ subSubject, correct, total, score }) => (
            <SubSubjectBar key={subSubject} subSubject={subSubject} data={{ correct, total, score }} />
          ))}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex flex-col gap-2 mt-1">
        <button
          onClick={() => navigate('/wrong-review')}
          className="w-full py-3 rounded-xl bg-orange-100 text-orange-700 text-sm font-semibold hover:bg-orange-200"
        >
          오답 재학습
        </button>
        <button
          onClick={() => navigate('/mini-mock')}
          className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
        >
          다른 세트 풀기
        </button>
      </div>
    </div>
  )
}
