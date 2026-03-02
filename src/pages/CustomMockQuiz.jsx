/**
 * src/pages/CustomMockQuiz.jsx — /custom-mock/:sessionId/part1 | part2
 * 맞춤 모의고사 문제 풀기 화면
 * GEP_076 Phase 6-1 STEP 4
 *
 * MockExamQuiz.jsx 100% 재활용 — 변경점:
 *   1. Store: mockExamStore → customMockStore
 *   2. 초기화: examStore 필터링 없음 (store에 이미 생성된 문제 보유)
 *   3. 헤더: "맞춤 모의고사 {교시}" + 모드 배지
 *   4. 제출: submitPart1 → part2 이동 / submitPart2 → result 이동
 *   5. 저장: store.saveProgress() 위임
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useCustomMockStore, loadPersistedSession, loadProgress } from '../stores/customMockStore'
import { customMockConfig } from '../config/customMockConfig'
import { useAuthStore } from '../stores/authStore'

// ── 상수 ──────────────────────────────────────────────────────────────────────
const PART_META = {
  part1: { bg: 'bg-blue-600',  label: '1교시 법령', btnBg: 'bg-blue-600'  },
  part2: { bg: 'bg-green-600', label: '2교시 손보',  btnBg: 'bg-green-600' },
}

const SUBJECT_BADGE = {
  '법령':   'bg-blue-600',
  '손보1부': 'bg-green-600',
  '손보2부': 'bg-purple-600',
}

const ANSWER_LABELS = ['①', '②', '③', '④']

const MODE_BADGE = {
  standard: { label: '표준',     className: 'bg-blue-100   text-blue-700'   },
  weakness: { label: '약점 집중', className: 'bg-orange-100 text-orange-700' },
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────
// MockExamQuiz와 동일 — 그대로 재사용

function QuestionPalette({ total, answers, currentIndex, onSelect }) {
  return (
    <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const answered  = answers[i + 1] != null
          const isCurrent = i === currentIndex
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`
                w-7 h-7 rounded text-xs font-semibold transition-all
                ${isCurrent ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}
                ${answered ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}
              `}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SubmitModal({ unanswered, total, isTimeout, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-[640px] rounded-t-2xl px-5 py-6 flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-900">
          {isTimeout ? '⏰ 제한 시간 종료' : '📋 답안 제출'}
        </h2>

        {unanswered.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-red-600 font-semibold">
              미응답 문제 {unanswered.length}개
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {unanswered.map(n => (
                <span
                  key={n}
                  className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-semibold border border-red-100"
                >
                  {n}번
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400">미응답 문제는 오답 처리됩니다.</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            {total}문제 모두 응답했습니다. 제출하시겠습니까?
          </p>
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

function ExitModal({ onSaveExit, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-[640px] rounded-t-2xl px-5 py-6 flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-900">시험 중단</h2>
        <p className="text-sm text-gray-600">
          현재까지의 답안과 경과 시간이 저장됩니다.<br />
          나중에 이어풀기로 재개할 수 있습니다.
        </p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
          >
            계속 풀기
          </button>
          <button
            onClick={onSaveExit}
            className="flex-1 py-3 rounded-xl bg-gray-700 text-white text-sm font-semibold hover:bg-gray-800"
          >
            저장하고 나가기
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

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function CustomMockQuiz() {
  const navigate          = useNavigate()
  const { sessionId }     = useParams()
  const { pathname }      = useLocation()

  // part1 / part2 판별 — URL 마지막 세그먼트 기준
  const part = pathname.endsWith('part2') ? 'part2' : 'part1'

  const userId = useAuthStore(s => s.userId)

  // ── customMockStore ────────────────────────────────────────────────────────
  const questions      = useCustomMockStore(s => s.questions)
  const currentIndex   = useCustomMockStore(s => s.currentIndex)
  const answers        = useCustomMockStore(s => s.answers)
  const mode           = useCustomMockStore(s => s.mode)
  const selectAnswer   = useCustomMockStore(s => s.selectAnswer)
  const nextQuestion   = useCustomMockStore(s => s.nextQuestion)
  const prevQuestion   = useCustomMockStore(s => s.prevQuestion)
  const goToQuestion   = useCustomMockStore(s => s.goToQuestion)
  const submitPart1    = useCustomMockStore(s => s.submitPart1)
  const submitPart2    = useCustomMockStore(s => s.submitPart2)
  const resumeSession  = useCustomMockStore(s => s.resumeSession)
  const storeSave      = useCustomMockStore(s => s.saveProgress)

  // ── UI 상태 ───────────────────────────────────────────────────────────────
  const [remainingTime,   setRemainingTime]   = useState(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showExitModal,   setShowExitModal]   = useState(false)
  const [showPalette,     setShowPalette]     = useState(false)
  const [isTimeoutSubmit, setIsTimeoutSubmit] = useState(false)
  const [isSubmitting,    setIsSubmitting]    = useState(false)
  const [savedFlash,      setSavedFlash]      = useState(false)

  const startedRef   = useRef(false)
  const prevIndexRef = useRef(-1)

  // ── 초기화 (1회만) ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const store = useCustomMockStore.getState()

    // 스토어에 이미 현재 파트 문제가 있으면 그대로 사용
    if (store.questions.length > 0 && store.currentPart === part) return

    // 스토어 비어 있음 (새로고침) → localStorage에서 복원
    const sessionMeta = loadPersistedSession()
    if (!sessionMeta || sessionMeta.sessionLocalId !== sessionId) {
      navigate('/custom-mock')
      return
    }

    const progress = loadProgress(sessionMeta.sessionLocalId, part)
    resumeSession(
      sessionMeta,
      part,
      progress?.answers      ?? {},
      progress?.currentIndex ?? 0,
      progress?.elapsedTime  ?? 0,
    )
  }, [])

  // ── 타이머 (1초마다) ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useCustomMockStore.getState()
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

  // ── 10문제마다 자동 저장 ────────────────────────────────────────────────────
  useEffect(() => {
    if (questions.length === 0) return
    if (currentIndex === prevIndexRef.current) return
    prevIndexRef.current = currentIndex
    if ((currentIndex + 1) % customMockConfig.autoSaveInterval === 0) {
      storeSave()
    }
  }, [currentIndex, questions.length])

  // ── 핸들러 ───────────────────────────────────────────────────────────────
  function handleManualSave() {
    storeSave()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  function handleSubmit() {
    if (isSubmitting) return
    setIsSubmitting(true)

    if (part === 'part1') {
      // 1교시 채점 + 저장 → store가 part2 준비
      submitPart1(userId)
      navigate(`/custom-mock/${sessionId}/part2`)
    } else {
      // 2교시 채점 + 저장 → 최종 완료
      submitPart2(userId)
      navigate(`/custom-mock/${sessionId}/result`)
    }
  }

  function handleSaveExit() {
    storeSave()
    navigate('/custom-mock')
  }

  // ── 가드 ────────────────────────────────────────────────────────────────
  if (questions.length === 0) return <LoadingView />
  const question = questions[currentIndex]
  if (!question) return <LoadingView />

  // ── 파생 값 ──────────────────────────────────────────────────────────────
  const partMeta       = PART_META[part] ?? PART_META.part1
  const isLastQuestion = currentIndex === questions.length - 1
  const selectedAnswer = answers[currentIndex + 1] ?? null
  const answeredCount  = Object.keys(answers).length
  const progressPct    = (answeredCount / questions.length) * 100
  const subjectBadge   = SUBJECT_BADGE[question.subject] ?? 'bg-gray-500'
  const modeBadgeData  = MODE_BADGE[mode] ?? MODE_BADGE.standard

  // 타이머 컬러
  const timerClass = remainingTime == null
    ? 'text-white/80'
    : remainingTime <= 60
      ? 'text-red-200 animate-pulse font-bold'
      : remainingTime <= 300
        ? 'text-yellow-200 font-semibold'
        : 'text-white/90'

  // 미응답 목록 (모달 열릴 때만 계산)
  const unanswered = showSubmitModal
    ? useCustomMockStore.getState().getUnansweredQuestions()
    : []

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen max-w-[640px] mx-auto bg-white">

      {/* 모달 */}
      {showSubmitModal && (
        <SubmitModal
          unanswered={unanswered}
          total={questions.length}
          isTimeout={isTimeoutSubmit}
          onConfirm={handleSubmit}
          onCancel={() => { setShowSubmitModal(false); setIsSubmitting(false) }}
        />
      )}
      {showExitModal && (
        <ExitModal
          onSaveExit={handleSaveExit}
          onCancel={() => setShowExitModal(false)}
        />
      )}

      {/* ── 상단 헤더 ──────────────────────────────────────────────────────── */}
      <div className={`flex-shrink-0 ${partMeta.bg} px-4 pt-3 pb-2`}>
        <div className="flex items-center justify-between mb-2">

          {/* 좌: 홈 나가기 */}
          <button
            onClick={() => setShowExitModal(true)}
            className="text-white/80 hover:text-white text-sm flex items-center gap-1"
          >
            🏠
            <span className="text-xs">나가기</span>
          </button>

          {/* 중: 맞춤 모의고사 헤더 + 모드 배지 */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/80 font-medium">
                맞춤 모의고사 {partMeta.label}
              </span>
              {/* 모드 배지 — MockExamQuiz에 없는 추가 요소 */}
              {mode && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${modeBadgeData.className}`}>
                  {modeBadgeData.label}
                </span>
              )}
            </div>
            <span className={`text-base font-mono ${timerClass}`}>
              {remainingTime != null ? formatTime(remainingTime) : '--:--'}
            </span>
          </div>

          {/* 우: 저장 + 문제 번호(팔레트 토글) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSave}
              className="text-white/70 hover:text-white text-lg relative"
              title="저장"
            >
              💾
              {savedFlash && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white/90 whitespace-nowrap font-semibold">
                  저장됨
                </span>
              )}
            </button>
            <button
              onClick={() => setShowPalette(p => !p)}
              className="text-xs text-white/90 hover:text-white font-semibold min-w-[40px] text-right"
            >
              {currentIndex + 1}/{questions.length}
            </button>
          </div>
        </div>

        {/* 진행바 */}
        <div className="w-full bg-white/30 rounded-full h-1">
          <div
            className="bg-white rounded-full h-1 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── 문제 팔레트 (토글) ────────────────────────────────────────────── */}
      {showPalette && (
        <QuestionPalette
          total={questions.length}
          answers={answers}
          currentIndex={currentIndex}
          onSelect={(i) => { goToQuestion(i); setShowPalette(false) }}
        />
      )}

      {/* ── 문제 본문 (스크롤) ────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-5"
        style={{ paddingBottom: '180px' }}
      >
        {/* 과목 배지 + 세부과목 + 문제 번호 */}
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

        {/* 문제 원문 — white-space: pre-wrap으로 그대로 표시 */}
        <p
          className="text-sm text-gray-900 leading-relaxed"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {question.questionRaw}
        </p>
      </div>

      {/* ── 하단 고정 패널 ────────────────────────────────────────────────── */}
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
        {/* 답안 버튼 4개 */}
        <div className="grid grid-cols-4 gap-2 mb-2.5">
          {[1, 2, 3, 4].map(num => (
            <button
              key={num}
              onClick={() => selectAnswer(currentIndex + 1, num)}
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

        {/* 이전 / 다음·제출 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={prevQuestion}
            disabled={currentIndex === 0}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium disabled:opacity-30 transition-opacity"
          >
            이전
          </button>
          {isLastQuestion ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              {part === 'part1' ? '1교시 제출' : '최종 제출'}
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${partMeta.btnBg} hover:opacity-90`}
            >
              다음
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
