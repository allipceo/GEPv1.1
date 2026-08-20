/**
 * src/pages/ChallengeMode.jsx — /unified-wrong/challenge/:minCount
 * 오답 도전 모드 — N회 이상 오답 집중 풀기
 * GEP_099 Phase 6-3 STEP 3
 *
 * 단계:
 *   start → quiz → done
 *
 * 문제 내용 조회:
 *   MCQ/MOCK/CUSTOM : examStore.questions에서 id 매칭
 *   OX              : id와 source로 식별, O/X 선택지만 제공
 *
 * 즉시 피드백:
 *   정답 → "✅ 약점 극복!" → 다음 문제
 *   오답 → "❌ N+1회로 이동" → 다음 문제
 *
 * 완료 후:
 *   reclassifyResults 호출 (fire-and-forget) → navigate(-1) 복귀
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuthStore }                   from '../stores/authStore'
import useExamStore                       from '../stores/examStore'
import useStatsStore                      from '../stores/statsStore'
import { recordAttempt }                  from '../services/statsService'
import { oxService }                      from '../services/oxService'
import {
  getCachedWrongQuestions,
  filterByWrongCount,
  reclassifyResults,
}  from '../services/unifiedWrongService'
import { OX_SUBJECTS }         from '../config/oxSubjects'
import WrongCountBadge         from '../components/wrong/WrongCountBadge'
import ReclassificationAnimation from '../components/wrong/ReclassificationAnimation'

// ── 상수 ──────────────────────────────────────────────────────────────────────
const ANSWER_LABELS  = ['①', '②', '③', '④']
const SUBJECT_BG     = {
  '법령':   'bg-blue-600',
  '손보1부': 'bg-green-600',
  '손보2부': 'bg-purple-600',
}
const SOURCE_LABEL   = { MCQ: 'MCQ', OX: 'OX', MOCK: '모의', CUSTOM: '맞춤' }
const TYPE_LABEL_KO  = { MCQ: '선택형', OX: '진위형' }   // GEPv30-138 모드 타이틀용
// attempts.subject는 OX의 경우 짧은 키('law'|'p1'|'p2')로 저장된다(oxStore.js) — 표시용 한글 라벨 매핑
const OX_SUBJECT_LABEL = Object.fromEntries(OX_SUBJECTS.map(s => [s.key, s.label]))

// ── 유틸 ──────────────────────────────────────────────────────────────────────

/** wrong 아이템 + examStore 문제 조인 */
function enrichQuestion(wrongItem, examQuestions) {
  if (wrongItem.source === 'OX') {
    // GEPv30-136: RPC가 이미 subject/sub_subject를 반환한다(016 마이그레이션) — 그대로 사용.
    // ox_subject_key는 정답(ox_result) 조회용 원본 키('law'|'p1'|'p2'), subject는 표시용 한글 라벨.
    return {
      ...wrongItem,
      questionRaw:    null,
      answer:         null,
      ox_subject_key: wrongItem.subject ?? null,
      subject:        OX_SUBJECT_LABEL[wrongItem.subject] ?? wrongItem.subject ?? null,
      subSubject:     wrongItem.sub_subject ?? null,
      isOX:           true,
      ox_result:      null,   // loadOxResultMap()이 비동기로 채운다
    }
  }

  const base = {
    ...wrongItem,
    questionRaw: null,
    answer:      null,
    subject:     wrongItem.subject     ?? null,
    subSubject:  wrongItem.sub_subject ?? null,
    isOX:        false,
  }

  const found = examQuestions.find(q => q.id === wrongItem.id)
  if (!found) return base

  return {
    ...base,
    questionRaw: found.questionRaw ?? null,
    answer:      found.answer      ?? null,
    subject:     found.subject     ?? base.subject,
    subSubject:  found.subSubject  ?? base.subSubject,
  }
}

// ── OX 정답(ox_result) + 문제 원문(statement_display) 조회 ──────────────────
// attempts 원장에는 정답·원문이 없으므로(선택값·정오답만 기록) 재도전 채점과
// 화면 표시를 위해 원본 OX 문제 JSON에서 ox_id → {result, text} 맵을 조회한다.
// 원문(statement_display)을 채우지 않으면 화면에 "OX 문제 원문은 OX 풀기 화면에서
// 확인 가능합니다" 플레이스홀더만 뜨고 실제 문제를 읽을 수 없다(2026-08-20 발견).
// 세션 내 파일당 1회만 fetch.
const oxResultCache = new Map()   // subjectKey → Map(ox_id -> { result, text })

async function loadOxResultMap(subjectKey) {
  if (oxResultCache.has(subjectKey)) return oxResultCache.get(subjectKey)
  const info = OX_SUBJECTS.find(s => s.key === subjectKey)
  if (!info) return new Map()
  try {
    const res = await fetch(`/data/${info.file}`)
    const all = await res.json()
    const map = new Map(all.map(q => [q.ox_id, { result: q.ox_result, text: q.statement_display }]))
    oxResultCache.set(subjectKey, map)
    return map
  } catch {
    return new Map()
  }
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────────────────────

/** 진행 바 */
function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1 px-4 pt-3">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{current} / {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-1.5 bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** MCQ 선택지 버튼 */
function McqButton({ num, label, status, onClick }) {
  const style = {
    default:  'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 active:bg-gray-100',
    correct:  'bg-green-50 border-green-400 text-green-700 font-semibold',
    wrong:    'bg-red-50 border-red-400 text-red-700 font-semibold',
    disabled: 'bg-gray-50 border-gray-100 text-gray-400',
  }
  return (
    <button
      onClick={onClick}
      disabled={status !== 'default'}
      className={`w-full flex items-center gap-3 border rounded-xl px-4 py-3 text-left
        transition-colors ${style[status] ?? style.default}`}
    >
      <span className="text-sm font-bold w-5 shrink-0">{label}</span>
      <span className="text-sm">{num}</span>
    </button>
  )
}

/** OX 버튼 */
function OXButton({ value, status, onClick }) {
  const style = {
    default:  'bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
    correct:  'bg-green-50 border-green-400 text-green-700',
    wrong:    'bg-red-50 border-red-400 text-red-700',
    disabled: 'bg-gray-50 border-gray-100 text-gray-400',
  }
  return (
    <button
      onClick={onClick}
      disabled={status !== 'default'}
      className={`flex-1 py-5 rounded-2xl border-2 text-3xl font-bold
        transition-colors ${style[status] ?? style.default}`}
    >
      {value}
    </button>
  )
}

/** 피드백 배너 */
function FeedbackBanner({ isCorrect, wrongCount, onNext, isLast }) {
  return (
    <div className={`mx-4 rounded-xl px-4 py-3 flex items-center justify-between
      ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
      <div className="flex flex-col gap-0.5">
        <p className={`text-sm font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
          {isCorrect ? '✅ 약점 극복!' : `❌ ${wrongCount + 1}회로 이동`}
        </p>
        <p className="text-[11px] text-gray-400">
          {isCorrect ? '오답 목록에서 제거됩니다' : 'wrong_count +1 반영됩니다'}
        </p>
      </div>
      <button
        onClick={onNext}
        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold
          hover:bg-indigo-700 active:bg-indigo-800 transition-colors shrink-0"
      >
        {isLast ? '완료' : '다음 →'}
      </button>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function ChallengeMode() {
  const navigate      = useNavigate()
  const location      = useLocation()
  const { minCount: minCountParam } = useParams()
  const minCount      = parseInt(minCountParam, 10) || 1
  const subjectFilter = location.state?.subject ?? null    // GEPv30-136 모드①(세부과목 기준)
  const sourceFilter  = location.state?.source ?? null      // GEPv30-138: 'MCQ'|'OX' 유형 필터
  const exactCount    = location.state?.exactCount ?? null  // GEPv30-138: 정확한 틀린횟수(6=6회+ 단일버킷)

  const userId        = useAuthStore(s => s.userId)
  const authStatus    = useAuthStore(s => s.authStatus)
  const examQuestions = useExamStore(s => s.questions)

  const [phase,         setPhase]         = useState('start')   // start|quiz|done
  const [questions,     setQuestions]     = useState([])        // enriched
  const [currentIndex,  setCurrentIndex]  = useState(0)
  const [selected,      setSelected]      = useState(null)      // 선택한 답안
  const [showFeedback,  setShowFeedback]  = useState(false)
  const [results,       setResults]       = useState([])        // [{id, source, isCorrect}]
  const [isReclassing,  setIsReclassing]  = useState(false)

  // ── 문제 로드 (캐시 우선) ────────────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'loading' || !userId) return

    let cancelled = false

    async function load() {
      const cached = getCachedWrongQuestions(userId)
      const pool   = cached ?? []
      const byCount = filterByWrongCount(pool, minCount)

      // GEPv30-138: subjectFilter/sourceFilter/exactCount는 각각 null이면 무시 —
      // 기존 L2-F 흐름(subjectFilter만 사용)의 동작은 그대로 유지된다.
      let filtered = byCount
      if (subjectFilter) filtered = filtered.filter(q => q.sub_subject === subjectFilter)
      if (sourceFilter)  filtered = filtered.filter(q => q.source === sourceFilter)
      if (exactCount)    filtered = filtered.filter(q =>
        exactCount >= 6 ? (q.wrong_count ?? 1) >= 6 : (q.wrong_count ?? 1) === exactCount
      )

      // examStore 조인 (examQuestions 없으면 빈 배열)
      const enriched = filtered.map(w => enrichQuestion(w, examQuestions))

      // OX 문제가 섞여 있으면 정답(ox_result) 맵을 비동기로 채운다
      const oxSubjectKeys = [...new Set(
        enriched.filter(q => q.isOX && q.ox_subject_key).map(q => q.ox_subject_key)
      )]
      if (oxSubjectKeys.length === 0) {
        if (!cancelled) setQuestions(enriched)
        return
      }

      const maps = await Promise.all(oxSubjectKeys.map(loadOxResultMap))
      const combined = new Map()
      maps.forEach(m => m.forEach((v, k) => combined.set(k, v)))

      if (!cancelled) {
        setQuestions(enriched.map(q => {
          if (!q.isOX) return q
          const info = combined.get(q.id)
          return {
            ...q,
            ox_result:   info?.result ?? null,
            questionRaw: info?.text   ?? null,
          }
        }))
      }
    }

    load()
    return () => { cancelled = true }
  }, [authStatus, userId, minCount, subjectFilter, sourceFilter, exactCount, examQuestions])

  // ── 파생값 ──────────────────────────────────────────────────────────────
  const modeTitle = (() => {
    if (subjectFilter && sourceFilter && exactCount) {
      const countLabel = exactCount >= 6 ? '6회+' : `${exactCount}회`
      return `${subjectFilter} · ${TYPE_LABEL_KO[sourceFilter] ?? sourceFilter} · ${countLabel}`
    }
    if (subjectFilter) return `${subjectFilter} 복습`
    return `${minCount}회+ 도전`
  })()
  const current   = questions[currentIndex]
  const isLast    = currentIndex === questions.length - 1
  const passCount = results.filter(r => r.isCorrect).length
  const failCount = results.filter(r => !r.isCorrect).length

  // 과목별 분포 (start 화면용)
  const subjectDist = useMemo(() => {
    const dist = {}
    for (const q of questions) {
      const key = q.subject ?? q.source
      dist[key] = (dist[key] ?? 0) + 1
    }
    return Object.entries(dist).sort((a, b) => b[1] - a[1])
  }, [questions])

  // 과목별 복습 성과 (done 화면용)
  const subjectSummary = useMemo(() => {
    const map = {}
    for (const r of results) {
      const q = questions.find(q => q.id === r.id)
      const key = q?.subject ?? q?.source ?? '기타'
      if (!map[key]) map[key] = { subject: key, correct: 0, wrong: 0 }
      r.isCorrect ? map[key].correct++ : map[key].wrong++
    }
    return Object.values(map)
  }, [results, questions])

  // ── 답안 제출 ────────────────────────────────────────────────────────────
  function handleAnswer(answerValue) {
    if (showFeedback) return

    const isCorrect = current.isOX
      ? answerValue === (current.ox_result ?? 'O')   // OX 정답 비교
      : Number(answerValue) === Number(current.answer) // MCQ 정답 비교

    setSelected(answerValue)
    setShowFeedback(true)
    setResults(prev => [...prev, {
      id:        current.id,
      source:    current.source,
      isCorrect,
    }])

    // attempts 기록 (fire-and-forget) — 재도전 결과가 attempts 원장에 남아야
    // get_unified_wrong_questions RPC가 다음 조회 시 "최근 정답"으로 반영한다.
    const authState = useAuthStore.getState()
    if (current.isOX) {
      // subject/subSubject를 넘기지 않으면 오답 원장에 빈 값('')이 기록되어
      // 이후 RPC가 이 문제를 어떤 세부과목에도 매칭하지 못하는 버그가 있었다(2026-08-20 발견).
      // ox_subject_key는 enrichQuestion()이 보존해둔 원본 키('law'|'p1'|'p2').
      const round = Number(current.id?.split('-')?.[1]) || 0
      oxService.recordAttempt(authState, current.id, isCorrect, {
        answer:     answerValue,
        round,
        subject:    current.ox_subject_key,
        subSubject: current.subSubject,
      }).catch(() => {})
    } else {
      const found = examQuestions.find(q => q.id === current.id)
      if (found) {
        recordAttempt(useStatsStore.getState(), authState, {
          question:       found,
          selectedAnswer: answerValue,
          isCorrect,
          studyMode:      'unified_wrong_challenge',
        }).catch(() => {})
      }
    }
  }

  // ── 다음 문제 / 완료 ─────────────────────────────────────────────────────
  async function handleNext() {
    setSelected(null)
    setShowFeedback(false)

    if (isLast) {
      setIsReclassing(true)

      // 결과 계산
      const correctCnt = results.filter(r => r.isCorrect).length
      const wrongCnt   = results.filter(r => !r.isCorrect).length

      // 과목별 통계 계산 (인라인 — 클로저 안정성 보장)
      const subjectMap = {}
      for (const r of results) {
        const q   = questions.find(q => q.id === r.id)
        const key = q?.subject ?? q?.source ?? '기타'
        if (!subjectMap[key]) subjectMap[key] = { subject: key, correct: 0, wrong: 0 }
        r.isCorrect ? subjectMap[key].correct++ : subjectMap[key].wrong++
      }

      // localStorage 저장 — ChallengeResult.jsx에서 읽음
      try {
        localStorage.setItem('gep:unified_wrong:challenge_result', JSON.stringify({
          beforeCount:  questions.length,
          correctCount: correctCnt,
          wrongCount:   wrongCnt,
          subjectStats: Object.values(subjectMap),
          minCount,
          timestamp:    Date.now(),
          // GEPv30-138: L2-D(세부과목→유형→정확한횟수) 세션이면 컨텍스트를 보존해
          // ChallengeResult.jsx가 "이어서 복습" 시 같은 세부과목/유형으로 되돌아갈 수 있게 한다.
          l2dContext: (subjectFilter && sourceFilter && exactCount)
            ? { subject: subjectFilter, source: sourceFilter }
            : null,
        }))

        // 주간 세션 기록 — ProgressTracker.jsx 주간 차트용
        const today    = new Date().toISOString().slice(0, 10)
        const sessRaw  = localStorage.getItem('gep:unified_wrong:weekly_sessions')
        const sessions = sessRaw ? JSON.parse(sessRaw) : {}
        sessions[today] = (sessions[today] ?? 0) + 1
        localStorage.setItem('gep:unified_wrong:weekly_sessions', JSON.stringify(sessions))
      } catch {}

      reclassifyResults(userId, results).catch(() => {})  // fire-and-forget
      navigate('/unified-wrong/result')
      return
    }
    setCurrentIndex(i => i + 1)
  }

  // ── MCQ 선택지 상태 계산 ─────────────────────────────────────────────────
  function mcqStatus(num) {
    if (!showFeedback) return 'default'
    if (num === Number(current.answer))  return 'correct'
    if (num === Number(selected))        return 'wrong'
    return 'disabled'
  }

  // ── OX 버튼 상태 ─────────────────────────────────────────────────────────
  function oxStatus(val) {
    if (!showFeedback) return 'default'
    if (val === (current.ox_result ?? 'O')) return 'correct'
    if (val === selected)                   return 'wrong'
    return 'disabled'
  }

  // ── 빈 데이터 ────────────────────────────────────────────────────────────
  if (!isReclassing && phase === 'start' && questions.length === 0 && authStatus !== 'loading') {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 p-1 -ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">{modeTitle}</h1>
        </div>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">🎉</span>
          <p className="text-base font-semibold text-gray-600">
            {subjectFilter && sourceFilter && exactCount
              ? `${modeTitle}에 해당하는 오답이 없습니다!`
              : subjectFilter
                ? `${subjectFilter}에 남은 오답이 없습니다!`
                : `${minCount}회 이상 오답이 없습니다!`}
          </p>
          <p className="text-sm text-gray-400">열심히 공부한 결과입니다.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  // ── START 화면 ────────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 p-1 -ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">{modeTitle} 모드</h1>
        </div>

        {/* 문제 수 카드 */}
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-5
          flex flex-col items-center gap-2">
          <p className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wide">
            {subjectFilter && sourceFilter && exactCount ? modeTitle
              : subjectFilter ? subjectFilter
              : `${minCount}회 이상 오답`}
          </p>
          <p className="text-5xl font-bold text-indigo-700 tabular-nums">{questions.length}</p>
          <p className="text-sm text-indigo-500">문제</p>
        </div>

        {/* 과목별 분포 */}
        {subjectDist.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-gray-500 px-1">과목별 분포</p>
            <div className="flex flex-col gap-1.5">
              {subjectDist.map(([key, cnt]) => {
                const pct = Math.round((cnt / questions.length) * 100)
                const bg  = SUBJECT_BG[key] ?? 'bg-gray-400'
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-16 shrink-0">{key}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full ${bg}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-gray-400 w-12 text-right shrink-0">
                      {cnt}개
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 안내 */}
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
          <p className="text-xs text-amber-700 leading-relaxed">
            💡 정답 맞히면 오답 목록에서 제거,<br />
            틀리면 오답 횟수가 +1 올라갑니다.
          </p>
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={() => setPhase('quiz')}
          className="w-full py-4 rounded-2xl bg-indigo-600 text-white text-base font-bold
            hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-md"
        >
          지금 시작하기 →
        </button>
      </div>
    )
  }

  // ── QUIZ 화면 ─────────────────────────────────────────────────────────────
  if (!current) return null

  const headerBg = SUBJECT_BG[current.subject] ?? 'bg-indigo-600'

  return (
    <div className="max-w-[640px] mx-auto flex flex-col min-h-screen">

      {/* 상단 헤더 */}
      <div className={`${headerBg} px-4 pt-4 pb-3 flex items-center gap-3`}>
        <button
          onClick={() => navigate('/')}
          className="text-white/80 hover:text-white text-base min-w-[56px] text-left"
        >
          ← 이전
        </button>
        <span className="text-sm font-bold text-white flex-1 text-center">
          {modeTitle}
        </span>
        <button
          onClick={() => navigate('/')}
          className="text-white/80 hover:text-white text-base min-w-[56px] text-right"
        >
          홈
        </button>
        <div className="flex items-center gap-2">
          <WrongCountBadge wrongCount={current.wrong_count} />
        </div>
        <span className="text-xs text-white/70 ml-1">
          {SOURCE_LABEL[current.source] ?? current.source}
        </span>
      </div>

      {/* 진행 바 */}
      <ProgressBar current={currentIndex + 1} total={questions.length} />

      {/* 문제 본문 */}
      <div className="flex-1 flex flex-col gap-4 px-4 py-4 overflow-y-auto">

        {/* 과목 태그 */}
        {current.subject && (
          <p className="text-xs font-semibold text-indigo-500">
            {current.subject}
            {current.subSubject && ` · ${current.subSubject}`}
          </p>
        )}

        {/* 문제 원문 — \n 기준 분리, 각 줄 독립 블록, 화면폭 자연 줄바꿈 */}
        {current.questionRaw ? (
          <div className="text-sm text-gray-900 leading-relaxed">
            {current.questionRaw.split('\n').map((line, i) =>
              line.trim() === '' ? (
                <div key={i} className="h-2" />
              ) : (
                <p key={i} className="mb-0.5">{line}</p>
              )
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-6 text-center">
            <p className="text-sm text-gray-400">
              {current.isOX
                ? 'OX 문제 원문은 OX 풀기 화면에서 확인 가능합니다.'
                : '문제 원문을 불러올 수 없습니다.'}
            </p>
            <p className="text-xs text-gray-300 mt-1">ID: {current.id}</p>
          </div>
        )}

        {/* MCQ 선택지 */}
        {!current.isOX && current.answer && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map(num => (
              <McqButton
                key={num}
                num={num}
                label={ANSWER_LABELS[num - 1]}
                status={mcqStatus(num)}
                onClick={() => handleAnswer(num)}
              />
            ))}
          </div>
        )}

        {/* OX 선택지 */}
        {current.isOX && (
          <div className="flex gap-3">
            <OXButton value="O" status={oxStatus('O')} onClick={() => handleAnswer('O')} />
            <OXButton value="X" status={oxStatus('X')} onClick={() => handleAnswer('X')} />
          </div>
        )}

        {/* 문제 내용 없는 MCQ fallback */}
        {!current.isOX && !current.answer && (
          <div className="flex gap-3">
            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                onClick={() => handleAnswer(num)}
                disabled={showFeedback}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-colors
                  ${selected === num ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
                  disabled:opacity-50`}
              >
                {ANSWER_LABELS[num - 1]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 피드백 배너 (고정) */}
      {showFeedback && current && (
        <div className="sticky bottom-0 pb-5 bg-white pt-2">
          <FeedbackBanner
            isCorrect  ={results[results.length - 1]?.isCorrect ?? false}
            wrongCount ={current.wrong_count}
            onNext     ={handleNext}
            isLast     ={isLast}
          />
        </div>
      )}
    </div>
  )
}
