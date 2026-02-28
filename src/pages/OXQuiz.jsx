/**
 * src/pages/OXQuiz.jsx — /ox/:subjectKey/:subSubject
 * OX 문제 풀기 화면
 * GEP_043 Phase4 STEP4
 *
 * 원칙:
 *   - statement_display 원문 그대로 표시 (정제/교정 금지)
 *   - 하단 버튼 패널 position: fixed 고정
 *   - 화면 상태(localSelected, showResult)와 기록 상태(answeredSet, wrongMap) 혼용 금지
 */

import { useNavigate, useParams } from 'react-router-dom'
import useOxStore, { selectCurrentQuestions } from '../stores/oxStore'
import { OX_SUBJECTS } from '../config/oxSubjects'

// 과목별 헤더 컬러
const HEADER_BG = {
  law: 'bg-blue-600',
  p1:  'bg-green-600',
  p2:  'bg-purple-600',
}

// ── 크래시 가드용 서브 컴포넌트 ───────────────────────────────────────────────
function LoadingView() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-sm text-gray-400 animate-pulse">문제를 불러오는 중입니다 ···</p>
    </div>
  )
}

function EmptyView({ subjectKey }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
      <p className="text-sm text-gray-500 text-center">
        문제가 없습니다.<br />과목을 다시 선택해 주세요.
      </p>
      <button
        onClick={() => navigate(`/ox/${subjectKey ?? ''}`)}
        className="px-5 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700"
      >
        ← 과목 선택으로
      </button>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function OXQuiz() {
  const navigate               = useNavigate()
  const { subjectKey, subSubject } = useParams()

  // ── 스토어 상태 ──────────────────────────────────────────────────────────────
  const isLoading        = useOxStore((s) => s.isLoading)
  const currentIdx       = useOxStore((s) => s.currentIdx)
  const localSelected    = useOxStore((s) => s.localSelected)
  const showResult       = useOxStore((s) => s.showResult)
  const answeredSet      = useOxStore((s) => s.answeredSet)
  const wrongMap         = useOxStore((s) => s.wrongMap)
  const totalCumulative  = useOxStore((s) => s.totalCumulative)
  const roundNo          = useOxStore((s) => s.roundNo)
  const currentQs        = useOxStore(selectCurrentQuestions)

  // ── 스토어 액션 ──────────────────────────────────────────────────────────────
  const selectAnswer  = useOxStore((s) => s.selectAnswer)
  const goNext        = useOxStore((s) => s.goNext)
  const goPrev        = useOxStore((s) => s.goPrev)
  const skipQuestion  = useOxStore((s) => s.skipQuestion)
  const completeRound = useOxStore((s) => s.completeRound)

  // ── 크래시 가드 ──────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingView />

  const currentQuestion = currentQs[currentIdx]
  if (!currentQuestion || currentQs.length === 0) return <EmptyView subjectKey={subjectKey} />

  // ── 파생 상태 ────────────────────────────────────────────────────────────────
  const subjectInfo   = OX_SUBJECTS.find((s) => s.key === subjectKey)
  const headerBg      = HEADER_BG[subjectKey] ?? 'bg-gray-600'
  const isCorrect     = localSelected === currentQuestion.ox_result
  const isLastQuestion = currentIdx >= currentQs.length - 1
  const progressPct   = currentQs.length > 0
    ? Math.min((answeredSet.size / currentQs.length) * 100, 100)
    : 0

  // ── O/X 버튼 스타일 ──────────────────────────────────────────────────────────
  const getOXStyle = (btn) => {
    if (!showResult) {
      return 'bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-400 active:bg-gray-50'
    }
    if (localSelected !== btn) {
      return 'bg-white border-2 border-gray-100 text-gray-200 cursor-default'
    }
    return isCorrect
      ? 'bg-green-500 border-2 border-green-500 text-white'
      : 'bg-red-500 border-2 border-red-500 text-white'
  }

  const getOXLabel = (btn) => {
    if (!showResult || localSelected !== btn) return btn
    return isCorrect ? `${btn} ✓` : `${btn} ✗`
  }

  // ── 다음 버튼 핸들러 ─────────────────────────────────────────────────────────
  const handleNext = () => {
    if (isLastQuestion) {
      // 마지막 문항 (응답/미응답 모두) → 세션 통계 캡처 후 completeRound → /review 이동
      // ※ completeRound 전에 캡처해야 answeredSet이 리셋되기 전 값을 읽을 수 있음
      const sessionAnswered = answeredSet.size
      const sessionWrong    = [...answeredSet].filter((id) => wrongMap.has(id)).length
      const sessionCorrect  = sessionAnswered - sessionWrong
      const sessionSkipped  = currentQs.length - sessionAnswered

      completeRound()
      navigate(`/ox/${subjectKey}/${subSubject}/review`, {
        state: {
          sessionAnswered,
          sessionCorrect,
          sessionWrong,
          sessionSkipped,
          totalQuestions: currentQs.length,
        },
      })
      return
    }

    if (!showResult) {
      // 미응답 중간 → 건너뛰기 (기록 상태 변경 없음)
      skipQuestion()
      return
    }

    // 응답 후 중간 → 다음 문항
    goNext()
  }

  // ── 다음 버튼 레이블 ─────────────────────────────────────────────────────────
  const nextLabel = isLastQuestion ? '완료' : !showResult ? '건너뛰기' : '다음'

  // ── 렌더링 ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto bg-white min-h-screen">

      {/* 상단 헤더 + 프로그레스바 */}
      <div className={`${headerBg} px-4 pt-3 pb-2`}>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate(`/ox/${subjectKey}`)}
            className="text-white/80 hover:text-white text-sm"
          >
            ← 과목선택
          </button>
          <span className="text-xs text-white/90 font-medium">
            Round {roundNo}&nbsp;&nbsp;{answeredSet.size}/{currentQs.length}&nbsp;
            <span className="text-white/70">(누적 {totalCumulative})</span>
          </span>
        </div>
        <div className="w-full bg-white/30 rounded-full h-1.5">
          <div
            className="bg-white rounded-full h-1.5 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* 문제 카드 영역 — 하단 고정 패널 높이(약 200px) + 여유분 확보 */}
      <div className="px-4 py-5" style={{ paddingBottom: '220px' }}>

        {/* 출처 텍스트 */}
        <p className="text-xs text-gray-400 mb-4">
          {currentQuestion.round}회&nbsp;
          {subjectInfo?.label ?? subjectKey}&nbsp;
          {currentQuestion.choice_no}번 보기
        </p>

        {/* statement_display — 원문 그대로 표시 (white-space: pre-wrap) */}
        <p
          className="text-sm text-gray-900 leading-relaxed"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {currentQuestion.statement_display}
        </p>
      </div>

      {/* ── 하단 고정 패널 ────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 bg-white border-t border-gray-200 px-4 pt-3 z-20"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '640px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        {/* 피드백 텍스트 (고정 높이로 레이아웃 흔들림 방지) */}
        <div className="h-6 flex items-center justify-center mb-2">
          {showResult && (
            <p className={`text-sm font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {isCorrect
                ? '✅ 정답입니다!'
                : `❌ 정답은 ${currentQuestion.ox_result} 입니다`}
            </p>
          )}
        </div>

        {/* O / X 버튼 */}
        <div className="flex gap-3 mb-2.5">
          {['O', 'X'].map((btn) => (
            <button
              key={btn}
              disabled={showResult}
              onClick={() => selectAnswer(btn)}
              className={`flex-1 py-3.5 rounded-2xl text-2xl font-bold transition-all ${getOXStyle(btn)}`}
            >
              {getOXLabel(btn)}
            </button>
          ))}
        </div>

        {/* 이전 / 다음 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={goPrev}
            disabled={currentIdx === 0}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium disabled:opacity-30 transition-opacity"
          >
            이전
          </button>
          <button
            onClick={handleNext}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity ${headerBg}`}
          >
            {nextLabel}
          </button>
        </div>
      </div>

    </div>
  )
}
