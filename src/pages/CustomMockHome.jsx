/**
 * src/pages/CustomMockHome.jsx — /custom-mock
 * 맞춤 모의고사 모드 선택 화면
 * GEP_074 Phase 6-1 STEP 3
 *
 * 레벨5 게이트: serviceLevel >= FEATURE_FLAGS.CUSTOMMOCK_MIN_LEVEL
 * 모드: 표준(standard) / 약점 집중(weakness)
 * 타이머: FULL(실제시간) / SHORT(단축80%)
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useCustomMockStore } from '../stores/customMockStore'
import { FEATURE_FLAGS } from '../config/featureFlags'
import { customMockConfig } from '../config/customMockConfig'
import { analyzeWeakness, customMockSupabase } from '../services/customMockService'

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function relativeDate(isoString) {
  if (!isoString) return ''
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '1일 전'
  if (diff < 7)  return `${diff}일 전`
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`
  return `${Math.floor(diff / 30)}달 전`
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

// 모드 선택 카드
function ModeCard({ mode, selected, onSelect, disabled, weakSubjects, isLoading }) {
  const isStandard = mode === 'standard'
  const selectedBg  = isStandard ? 'border-blue-500 bg-blue-50'   : 'border-orange-500 bg-orange-50'
  const normalBg    = isStandard ? 'border-gray-200 bg-white'      : 'border-gray-200 bg-white'
  const disabledBg  = 'border-gray-100 bg-gray-50 opacity-60'

  const borderClass = disabled ? disabledBg : selected ? selectedBg : normalBg

  return (
    <button
      onClick={() => !disabled && onSelect(mode)}
      disabled={disabled}
      className={`w-full rounded-xl border-2 px-4 py-4 flex flex-col gap-2 text-left transition-all ${borderClass}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{isStandard ? '📊' : '🎯'}</span>
          <span className="text-sm font-bold text-gray-900">
            {isStandard ? '표준 모드' : '약점 집중 모드'}
          </span>
        </div>
        {/* 선택 인디케이터 */}
        <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all
          ${selected && !disabled
            ? isStandard ? 'border-blue-500 bg-blue-500' : 'border-orange-500 bg-orange-500'
            : 'border-gray-300 bg-white'
          }`}
        />
      </div>

      {isStandard ? (
        <p className="text-xs text-gray-500 leading-relaxed">
          1,080개 풀에서 과목별 균등 랜덤 추출<br />
          법령 40 + 손보1부 40 + 손보2부 40 = 120문제
        </p>
      ) : (
        <p className="text-xs text-gray-500 leading-relaxed">
          정답률 하위 3개 세부과목 비중 2배 집중 훈련
        </p>
      )}

      {/* 약점 모드 전용 영역 */}
      {!isStandard && (
        <div className="mt-1">
          {disabled ? (
            <p className="text-xs text-gray-400 font-medium">
              최소 10회 풀이 후 사용 가능
            </p>
          ) : isLoading ? (
            <p className="text-xs text-gray-400 animate-pulse">약점 분석 중···</p>
          ) : weakSubjects?.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-0.5">
              <span className="text-xs text-orange-600 font-semibold">집중 과목:</span>
              {weakSubjects.map(sub => (
                <span key={sub}
                  className="text-xs font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                  {sub} ↑
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">약점 세부과목 분석 완료</p>
          )}
        </div>
      )}
    </button>
  )
}

// 타이머 라디오
function TimerRadio({ value, selected, onChange }) {
  const isFull = value === 'full'
  return (
    <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all
      ${selected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-200'}`}>
      <input
        type="radio"
        name="timerType"
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        className="accent-indigo-600"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-gray-800">
          {isFull ? '실제 시험 시간' : '단축 모드 (80%)'}
        </span>
        <span className="text-xs text-gray-400">
          {isFull
            ? `1교시 ${customMockConfig.timers.full.part1 / 60}분 + 2교시 ${customMockConfig.timers.full.part2 / 60}분`
            : `1교시 ${customMockConfig.timers.short.part1 / 60}분 + 2교시 ${customMockConfig.timers.short.part2 / 60}분`
          }
        </span>
      </div>
    </label>
  )
}

// 최근 응시 기록 행
function SessionRow({ session, index }) {
  const isWeak = session.mode === 'weakness'
  const avg    = session.total_average ?? null
  return (
    <div className="flex items-center gap-3 px-1 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-bold text-gray-400 w-5 text-center">#{index + 1}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
        ${isWeak ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
        {isWeak ? '약점' : '표준'}
      </span>
      {avg != null ? (
        <>
          <span className="text-sm font-bold text-gray-800">{Number(avg).toFixed(1)}점</span>
          {session.is_pass != null && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full
              ${session.is_pass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
              {session.is_pass ? '합격' : '불합격'}
            </span>
          )}
        </>
      ) : (
        <span className="text-xs text-gray-400">미완료</span>
      )}
      <span className="ml-auto text-xs text-gray-400">
        {relativeDate(session.created_at)}
      </span>
    </div>
  )
}

// 레벨 게이트 화면
function LockScreen({ navigate }) {
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-700 p-1 -ml-1">
          <BackIcon />
        </button>
        <h1 className="text-lg font-bold text-gray-900">맞춤 모의고사</h1>
      </div>
      <div className="flex flex-col items-center gap-4 py-14 text-center">
        <span className="text-4xl">🔒</span>
        <p className="text-base font-semibold text-gray-700">레벨 5 전용 서비스입니다</p>
        <p className="text-sm text-gray-400">맞춤 모의고사는 레벨 5 이상 회원만 이용할 수 있습니다.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-5 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
        >
          ← 홈으로
        </button>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function CustomMockHome() {
  const navigate      = useNavigate()
  const userId        = useAuthStore(s => s.userId)
  const authStatus    = useAuthStore(s => s.authStatus)
  const serviceLevel  = useAuthStore(s => s.serviceLevel)

  const startSession  = useCustomMockStore(s => s.startSession)

  // 모드 / 타이머 선택
  const [mode,       setMode]       = useState(customMockConfig.MODES.STANDARD)
  const [timerType,  setTimerType]  = useState(customMockConfig.TIMER_TYPES.FULL)

  // 약점 분석 데이터
  const [weaknessData,  setWeaknessData]  = useState(null)
  const [isLoadingWeak, setIsLoadingWeak] = useState(true)

  // 최근 응시 기록
  const [recentSessions,  setRecentSessions]  = useState([])
  const [isLoadingHist,   setIsLoadingHist]   = useState(true)

  // 생성 버튼 로딩
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError,     setGenError]     = useState(null)

  // ── 레벨 게이트 ──────────────────────────────────────────────────────────
  const canCustomMock = serviceLevel >= FEATURE_FLAGS.CUSTOMMOCK_MIN_LEVEL

  // ── 데이터 로드 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canCustomMock || authStatus !== 'authenticated' || !userId) {
      setIsLoadingWeak(false)
      setIsLoadingHist(false)
      return
    }

    // 약점 분석
    analyzeWeakness(userId)
      .then(data => setWeaknessData(data))
      .catch(() => setWeaknessData({ subjectStats: {}, weakSubjects: [], hasEnoughData: false }))
      .finally(() => setIsLoadingWeak(false))

    // 최근 응시 기록 (최대 5개)
    customMockSupabase.getSessionHistory(userId)
      .then(data => setRecentSessions(data.slice(0, 5)))
      .catch(() => setRecentSessions([]))
      .finally(() => setIsLoadingHist(false))
  }, [canCustomMock, authStatus, userId])

  // ── 생성하기 ──────────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (isGenerating) return
    setIsGenerating(true)
    setGenError(null)

    const result = await startSession(mode, timerType, userId)

    if (!result.success) {
      const msg = result.error === 'INSUFFICIENT_DATA'
        ? '약점 분석 데이터가 부족합니다. 표준 모드로 시도해보세요.'
        : '문제 생성에 실패했습니다. 다시 시도해주세요.'
      setGenError(msg)
      setIsGenerating(false)
      return
    }

    // 세션 ID는 store에서 직접 조회
    const { sessionLocalId } = useCustomMockStore.getState()
    navigate(`/custom-mock/${sessionLocalId}/part1`)
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────

  if (!canCustomMock) return <LockScreen navigate={navigate} />

  const weaknessDisabled = !weaknessData?.hasEnoughData
  const isWeakMode       = mode === customMockConfig.MODES.WEAKNESS
  const generateDisabled = isGenerating || (isWeakMode && weaknessDisabled)

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
            aria-label="홈으로"
          >
            <BackIcon />
          </button>
          <h1 className="text-lg font-bold text-gray-900">맞춤 모의고사</h1>
        </div>
        <button
          onClick={() => navigate('/custom-mock/stats')}
          className="text-sm text-indigo-500 font-semibold hover:text-indigo-700 transition-colors"
        >
          통계 ›
        </button>
      </div>

      {/* 시험 구조 안내 */}
      <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 flex flex-col gap-1">
        <p className="text-xs font-bold text-green-700">맞춤 모의고사 구조</p>
        <p className="text-xs text-green-600">
          📘 1교시 법령 40문제 &nbsp;|&nbsp; 📗📕 2교시 손보 80문제 = 총 120문제
        </p>
        <p className="text-xs text-green-400">합격 기준: 과목당 40점 이상 · 전체 평균 60점 이상</p>
      </div>

      {/* ── 모드 선택 ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-500 px-1">모드 선택</p>

        <ModeCard
          mode="standard"
          selected={mode === 'standard'}
          onSelect={setMode}
          disabled={false}
          weakSubjects={[]}
          isLoading={false}
        />

        <ModeCard
          mode="weakness"
          selected={mode === 'weakness'}
          onSelect={setMode}
          disabled={weaknessDisabled}
          weakSubjects={weaknessData?.weakSubjects ?? []}
          isLoading={isLoadingWeak}
        />
      </div>

      {/* ── 타이머 설정 ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-500 px-1">타이머 설정</p>
        <div className="flex flex-col gap-2">
          <TimerRadio value="full"  selected={timerType === 'full'}  onChange={setTimerType} />
          <TimerRadio value="short" selected={timerType === 'short'} onChange={setTimerType} />
        </div>
      </div>

      {/* 에러 메시지 */}
      {genError && (
        <p className="text-sm text-red-600 font-medium text-center px-2">{genError}</p>
      )}

      {/* ── 생성하기 버튼 ─────────────────────────────────────────────────── */}
      <button
        onClick={handleGenerate}
        disabled={generateDisabled}
        className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all
          ${generateDisabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm'
          }`}
      >
        {isGenerating ? '문제 생성 중···' : '생성하기'}
      </button>

      {/* ── 최근 응시 기록 ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-500 px-1">최근 응시 기록</p>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-1 shadow-sm">
          {isLoadingHist ? (
            <p className="text-xs text-gray-400 text-center py-4 animate-pulse">기록을 불러오는 중···</p>
          ) : recentSessions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-5">아직 응시 기록이 없습니다.</p>
          ) : (
            recentSessions.map((s, i) => (
              <SessionRow key={s.id} session={s} index={i} />
            ))
          )}
        </div>
      </div>

    </div>
  )
}
