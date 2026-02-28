/**
 * src/pages/OXReview.jsx — /ox/:subjectKey/:subSubject/review
 * OX 라운드 완료 + 모아풀기 설정 화면
 * GEP_043 Phase4 STEP4
 *
 * 세션 통계: navigate state로 수신 (completeRound 이후 answeredSet은 리셋됨)
 * 모아풀기 필터: wrongMap에서 실시간 계산
 */

import { useState, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import useOxStore from '../stores/oxStore'
import { OX_SUBJECTS } from '../config/oxSubjects'

// 과목별 헤더 컬러
const HEADER_BG = {
  law: 'bg-blue-600',
  p1:  'bg-green-600',
  p2:  'bg-purple-600',
}

// ── 세션 통계 카드 아이템 ─────────────────────────────────────────────────────
function StatItem({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-2xl font-bold ${color}`}>{value ?? 0}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function OXReview() {
  const navigate               = useNavigate()
  const { subjectKey, subSubject } = useParams()
  const location               = useLocation()

  // ── 세션 통계 (navigate state에서 수신) ─────────────────────────────────────
  const {
    sessionAnswered  = 0,
    sessionCorrect   = 0,
    sessionWrong     = 0,
    sessionSkipped   = 0,
    totalQuestions   = 0,
  } = location.state ?? {}

  // ── 스토어 상태 ──────────────────────────────────────────────────────────────
  const wrongMap    = useOxStore((s) => s.wrongMap)
  const questions   = useOxStore((s) => s.questions)
  const startReview = useOxStore((s) => s.startReview)

  // ── 모아풀기 필터 상태 (기본: 3회 이상) ──────────────────────────────────────
  const [minWrong, setMinWrong] = useState(3)

  // ── 틀린 문제 수 (wrongMap 실시간 계산) ──────────────────────────────────────
  const wrongCounts = useMemo(() => ({
    1: questions.filter((q) => (wrongMap.get(q.ox_id) ?? 0) >= 1).length,
    2: questions.filter((q) => (wrongMap.get(q.ox_id) ?? 0) >= 2).length,
    3: questions.filter((q) => (wrongMap.get(q.ox_id) ?? 0) >= 3).length,
  }), [wrongMap, questions])

  const filteredCount = wrongCounts[minWrong] ?? 0
  const hasFiltered   = filteredCount > 0

  // ── config ───────────────────────────────────────────────────────────────────
  const subjectInfo = OX_SUBJECTS.find((s) => s.key === subjectKey)
  const headerBg    = HEADER_BG[subjectKey] ?? 'bg-gray-600'

  // ── 모아풀기 시작 핸들러 ─────────────────────────────────────────────────────
  const handleStartReview = () => {
    startReview(minWrong)
    navigate(`/ox/${subjectKey}/${subSubject}`)
  }

  // ── 렌더링 ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* 상단 타이틀 */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎉</span>
        <div>
          <h1 className="text-lg font-bold text-gray-900">라운드 완료!</h1>
          <p className="text-xs text-gray-400">
            {subjectInfo?.label ?? subjectKey}
            {subSubject !== 'ALL' ? ` · ${subSubject}` : ' · 전체'}
          </p>
        </div>
      </div>

      {/* 세션 요약 카드 */}
      <div className="rounded-2xl bg-gray-50 border border-gray-200 px-5 py-5">
        <p className="text-xs font-semibold text-gray-500 mb-4">이번 라운드 요약</p>
        <div className="grid grid-cols-4 gap-3 text-center">
          <StatItem label="응답"   value={sessionAnswered} />
          <StatItem label="정답"   value={sessionCorrect}  color="text-green-600" />
          <StatItem label="오답"   value={sessionWrong}    color="text-red-500" />
          <StatItem label="건너뜀" value={sessionSkipped}  color="text-gray-400" />
        </div>
        {totalQuestions > 0 && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-500 rounded-full h-1.5 transition-all"
              style={{ width: `${Math.round((sessionCorrect / totalQuestions) * 100)}%` }}
            />
          </div>
        )}
        {totalQuestions > 0 && (
          <p className="text-right text-xs text-gray-400 mt-1">
            정답률 {totalQuestions > 0 ? Math.round((sessionCorrect / totalQuestions) * 100) : 0}%
          </p>
        )}
      </div>

      {/* 모아풀기 필터 카드 */}
      <div className="rounded-2xl bg-white border border-gray-200 px-5 py-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-500">틀린 문제 모아풀기</p>

        {/* 필터 라디오 3개 */}
        {[1, 2, 3].map((n) => (
          <label
            key={n}
            className="flex items-center gap-3 cursor-pointer py-0.5"
          >
            <input
              type="radio"
              name="minWrong"
              value={n}
              checked={minWrong === n}
              onChange={() => setMinWrong(n)}
              className="accent-blue-600 w-4 h-4"
            />
            <span className="flex-1 text-sm text-gray-700">
              {n}회 이상 틀린 문제
            </span>
            <span className={`text-sm font-bold tabular-nums ${wrongCounts[n] > 0 ? 'text-red-500' : 'text-gray-300'}`}>
              {wrongCounts[n]}개
            </span>
          </label>
        ))}

        {/* 필터 결과 0개 가드 */}
        {!hasFiltered && (
          <p className="text-xs text-gray-400 text-center pt-1 leading-relaxed">
            조건에 맞는 틀린 문제가 없습니다.<br />
            필터를 변경하거나 이어서 풀기를 선택하세요.
          </p>
        )}

        {/* 모아풀기 시작 버튼 */}
        <button
          disabled={!hasFiltered}
          onClick={handleStartReview}
          className={`mt-1 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity
            ${headerBg} ${!hasFiltered ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-90'}`}
        >
          모아풀기 시작 ({filteredCount}개)
        </button>
      </div>

      {/* 하단 버튼 2개 */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate(`/ox/${subjectKey}/${subSubject}`)}
          className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 active:bg-gray-200 transition-colors"
        >
          이어서 풀기
        </button>
        <button
          onClick={() => navigate(`/ox/${subjectKey}`)}
          className="w-full py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 active:bg-gray-50 transition-colors"
        >
          과목 선택으로
        </button>
      </div>

    </div>
  )
}
