/**
 * src/pages/MiniMockQuiz.jsx — /mini-mock/:setId
 * 간이 모의고사 문제 풀기 화면 (30문제 연속 풀이 + 30분 절대 시간 타이머)
 * GEPv30-109 STEP 7 (+ GEPv30-110 isSubmitting 가드 반영)
 *
 * CustomMockQuiz.jsx 패턴 재활용 — 교시 분할 없음, 팔레트 없음, 단일 연속 흐름.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useMiniMockStore from '../stores/miniMockStore'
import { loadSet, calculateMiniMockScore, submitMiniMockStats } from '../services/miniMockService'

const SUBJECT_BADGE = {
  '법령':   'bg-blue-600',
  '손보1부': 'bg-green-600',
  '손보2부': 'bg-purple-600',
}
const ANSWER_LABELS = ['①', '②', '③', '④']

function formatTime(seconds) {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function SubmitModal({ unansweredCount, total, isTimeout, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-[640px] rounded-t-2xl px-5 py-6 flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-900">
          {isTimeout ? '⏰ 제한 시간 종료' : '📋 답안 제출'}
        </h2>
        {unansweredCount > 0 ? (
          <p className="text-sm text-red-600 font-semibold">
            미응답 문제 {unansweredCount}개 — 오답 처리됩니다.
          </p>
        ) : (
          <p className="text-sm text-gray-600">{total}문제 모두 응답했습니다. 제출하시겠습니까?</p>
        )}
        <div className="flex gap-2 mt-1">
          {!isTimeout && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
            >
              계속 풀기
            </button>
          )}
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            제출하기
          </button>
        </div>
      </div>
    </div>
  )
}

function ExitModal({ onSaveExit, onResetExit, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-[640px] rounded-t-2xl px-5 py-6 flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-900">시험 중단</h2>
        <p className="text-sm text-gray-600">현재까지 푼 내용을 저장하고 나갈까요?</p>
        <div className="flex flex-col gap-2 mt-1">
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
          >
            계속 풀기
          </button>
          <button
            onClick={onSaveExit}
            className="w-full py-3 rounded-xl bg-gray-700 text-white text-sm font-semibold hover:bg-gray-800"
          >
            저장하고 나가기
          </button>
          <button
            onClick={onResetExit}
            className="w-full py-2.5 rounded-xl text-red-500 text-xs font-semibold hover:bg-red-50"
          >
            초기화하고 나가기
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingView() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-sm text-gray-400 animate-pulse">문제를 불러오는 중입니다···</p>
    </div>
  )
}

export default function MiniMockQuiz() {
  const { setId }  = useParams()
  const navigate   = useNavigate()

  const questions      = useMiniMockStore(s => s.questions)
  const currentIndex   = useMiniMockStore(s => s.currentIndex)
  const answers        = useMiniMockStore(s => s.answers)
  const setAnswer      = useMiniMockStore(s => s.setAnswer)
  const setIndex       = useMiniMockStore(s => s.setIndex)

  const [remainingTime,   setRemainingTime]   = useState(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showExitModal,   setShowExitModal]   = useState(false)
  const [isTimeoutSubmit, setIsTimeoutSubmit] = useState(false)
  const [isSubmitting,    setIsSubmitting]    = useState(false)

  const startedRef = useRef(false)

  // ── 초기화 (1회) — 세트 로드 + 진행상황 복원 ─────────────────────────────
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const store = useMiniMockStore.getState()
    if (store.questions.length > 0 && store.setId === Number(setId)) return

    async function init() {
      const set = await loadSet(setId)
      if (!set) {
        navigate('/mini-mock')
        return
      }
      const progress = await store.loadProgress(Number(setId))
      store.startSet(Number(setId), set.questions, progress)
    }
    init()
  }, [setId])

  // ── 타이머 (1초마다, 절대 시간 기반) ─────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useMiniMockStore.getState()
      if (!store.startTime) return
      const remaining = store.getRemainingTime()
      setRemainingTime(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        setIsTimeoutSubmit(true)
        setShowSubmitModal(true)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // ── 제출 ──────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (isSubmitting) return   // 중복 트리거 방지 (수동+타이머 동시 방지)
    setIsSubmitting(true)

    const store = useMiniMockStore.getState()
    const scores = calculateMiniMockScore(store.questions, store.answers)

    store.saveResult(store.setId, scores)
    store.clearProgress(store.setId)
    submitMiniMockStats(store.questions, store.answers)   // fire-and-forget

    navigate(`/mini-mock/${store.setId}/result`, { state: { scores } })
    // isSubmitting 복원 불필요 — navigate로 언마운트
  }

  function handleSaveExit() {
    useMiniMockStore.getState().saveProgress()
    navigate('/mini-mock')
  }

  function handleResetExit() {
    useMiniMockStore.getState().clearProgress(Number(setId))
    navigate('/mini-mock')
  }

  // ── 가드 ─────────────────────────────────────────────────────────────────
  if (questions.length === 0) return <LoadingView />
  const question = questions[currentIndex]
  if (!question) return <LoadingView />

  // ── 파생 값 ──────────────────────────────────────────────────────────────
  const isLastQuestion = currentIndex === questions.length - 1
  const selectedAnswer = answers[currentIndex] ?? null
  const answeredCount  = Object.values(answers).filter(a => a != null).length
  const progressPct    = (answeredCount / questions.length) * 100
  const subjectBadge   = SUBJECT_BADGE[question.subject] ?? 'bg-gray-500'
  const unansweredCount = questions.length - answeredCount

  const timerClass = remainingTime == null
    ? 'text-white/80'
    : remainingTime <= 60
      ? 'text-red-200 animate-pulse font-bold'
      : remainingTime <= 300
        ? 'text-yellow-200 font-semibold'
        : 'text-white/90'

  return (
    <div className="flex flex-col h-screen max-w-[640px] mx-auto bg-white">

      {showSubmitModal && (
        <SubmitModal
          unansweredCount={unansweredCount}
          total={questions.length}
          isTimeout={isTimeoutSubmit}
          onConfirm={handleSubmit}
          onCancel={() => setShowSubmitModal(false)}
        />
      )}
      {showExitModal && (
        <ExitModal
          onSaveExit={handleSaveExit}
          onResetExit={handleResetExit}
          onCancel={() => setShowExitModal(false)}
        />
      )}

      {/* ── 상단 헤더 ── */}
      <div className="flex-shrink-0 bg-indigo-600 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowExitModal(true)}
            className="text-white/80 hover:text-white text-base min-w-[56px] text-left"
          >
            ← 이전
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-white/80 font-medium">간이 모의고사</span>
            <span className={`text-base font-mono ${timerClass}`}>
              {remainingTime != null ? formatTime(remainingTime) : '--:--'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/90 font-semibold min-w-[40px] text-right">
              {currentIndex + 1}/{questions.length}
            </span>
            <button
              onClick={() => setShowExitModal(true)}
              className="text-white/80 hover:text-white text-base min-w-[56px] text-right"
            >
              홈
            </button>
          </div>
        </div>

        <div className="w-full bg-white/30 rounded-full h-1">
          <div
            className="bg-white rounded-full h-1 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── 문제 본문 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5" style={{ paddingBottom: '180px' }}>
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${subjectBadge}`}>
            {question.subject}
          </span>
          {question.subSubject && (
            <span className="text-xs text-gray-400">{question.subSubject}</span>
          )}
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{currentIndex + 1}번</span>
        </div>
        {question.roundNumber != null && (
          <p className="text-xs text-gray-400 text-center -mt-2 mb-4">
            (원본: {question.round}회 {question.subject} {question.roundNumber}번 문제)
          </p>
        )}

        <div className="text-sm text-gray-900 leading-relaxed">
          {question.questionRaw.split('\n').map((line, i) =>
            line.trim() === '' ? (
              <div key={i} className="h-2" />
            ) : (
              <p key={i} className="mb-0.5">{line}</p>
            )
          )}
        </div>
      </div>

      {/* ── 하단 고정 패널 ── */}
      <div
        className="fixed bottom-0 bg-white border-t border-gray-200 px-4 pt-3 z-20"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '640px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="grid grid-cols-4 gap-2 mb-2.5">
          {[1, 2, 3, 4].map(num => (
            <button
              key={num}
              onClick={() => setAnswer(currentIndex, num)}
              className={`
                py-3 rounded-xl text-lg font-bold border-2 transition-all
                ${selectedAnswer === num
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 active:bg-blue-50'
                }
              `}
            >
              {ANSWER_LABELS[num - 1]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium disabled:opacity-30 transition-opacity"
          >
            이전
          </button>
          {isLastQuestion ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '제출 중...' : '제출'}
            </button>
          ) : (
            <button
              onClick={() => setIndex(Math.min(questions.length - 1, currentIndex + 1))}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              다음
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
