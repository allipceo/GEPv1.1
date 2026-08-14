/**
 * src/pages/OXStats.jsx — /ox/stats
 * OX 진위형 통계 화면
 * GEPv30-083 S2-c
 *
 * - 전체 요약 (총 풀이 / 총 정답 / 전체 정답률)
 * - 3과목별 정답률 + 컬러 바
 * - 세부과목 12종 취약도 (정답률 낮은 순)
 * - 약점 세부과목 바로풀기 CTA
 *
 * 데이터 소스: attempts WHERE study_mode='ox' (DB 기반)
 * 게스트: 회원 전용 안내 표시
 */

import { useEffect, useState } from 'react'
import { useNavigate }         from 'react-router-dom'
import { useAuthStore }        from '../stores/authStore'
import { supabase }            from '../lib/supabase'
import { OX_SUBJECTS }         from '../config/oxSubjects'
import useOxStore              from '../stores/oxStore'
import AppHeader                from '../components/AppHeader'

// ── 상수 ──────────────────────────────────────────────────────────────────────

/** 세부과목명 → subjectKey 역방향 맵 (config 기반, 하드코딩 금지) */
const SUB_TO_KEY = {}
OX_SUBJECTS.forEach(({ key, subs }) => subs.forEach(sub => { SUB_TO_KEY[sub] = key }))

/** 알려진 세부과목 12종 (정렬 없이 config 순서 유지) */
const KNOWN_SUBS = OX_SUBJECTS.flatMap(s => s.subs)

/** 과목별 컬러 테마 */
const SUBJECT_COLOR = {
  law: { nameCls: 'text-blue-700',   barCls: 'bg-blue-500',   bgCls: 'bg-blue-50',   borderCls: 'border-blue-200' },
  p1:  { nameCls: 'text-green-700',  barCls: 'bg-green-500',  bgCls: 'bg-green-50',  borderCls: 'border-green-200' },
  p2:  { nameCls: 'text-purple-700', barCls: 'bg-purple-500', bgCls: 'bg-purple-50', borderCls: 'border-purple-200' },
}

// ── 취약도 레벨 계산 ──────────────────────────────────────────────────────────
function getLevel(accuracy) {
  if (accuracy === null)  return { label: '미학습', cls: 'text-gray-400', badge: 'bg-gray-100 text-gray-500' }
  if (accuracy >= 80)     return { label: '우수',   cls: 'text-green-700', badge: 'bg-green-100 text-green-700' }
  if (accuracy >= 60)     return { label: '보통',   cls: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' }
  return                         { label: '취약',   cls: 'text-red-700',   badge: 'bg-red-100 text-red-700' }
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function OXStats() {
  const navigate      = useNavigate()
  const userId        = useAuthStore((s) => s.userId)
  const authStatus    = useAuthStore((s) => s.authStatus)
  const resetStore    = useOxStore((s) => s.resetStore)
  const loadQuestions = useOxStore((s) => s.loadQuestions)

  const [isLoading,   setIsLoading]   = useState(true)
  const [totalStats,  setTotalStats]  = useState({ solved: 0, correct: 0 })
  const [bySubject,   setBySubject]   = useState([])
  const [bySub,       setBySub]       = useState([])

  // ── 데이터 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!userId) { setIsLoading(false); return }

      try {
        const { data, error } = await supabase
          .from('attempts')
          .select('subject, sub_subject, is_correct')
          .eq('user_id', userId)
          .eq('study_mode', 'ox')

        if (error) throw error

        let totalSolved = 0, totalCorrect = 0

        // 3과목 집계 맵
        const bySubMap = {
          law: { solved: 0, correct: 0 },
          p1:  { solved: 0, correct: 0 },
          p2:  { solved: 0, correct: 0 },
        }

        // 세부과목 집계 맵 (12종 초기화)
        const bySubSubMap = {}
        KNOWN_SUBS.forEach(s => { bySubSubMap[s] = { solved: 0, correct: 0 } })

        ;(data ?? []).forEach(({ subject, sub_subject, is_correct }) => {
          totalSolved++
          if (is_correct) totalCorrect++

          if (bySubMap[subject]) {
            bySubMap[subject].solved++
            if (is_correct) bySubMap[subject].correct++
          }

          // ⚠️ 의도된 설계: sub_subject === 'ALL'(전체 모드로 풀이한 레코드)은
          // KNOWN_SUBS(세부과목 12종)에 없으므로 이 가드에서 조용히 스킵된다.
          // → totalStats/bySubject(3과목 집계, subject 필드 기준)에는 정상 반영되지만
          //   세부과목 12종 취약도 그리드의 solved 합계는 총 풀이수보다 작게 표시될 수 있음.
          if (bySubSubMap[sub_subject]) {
            bySubSubMap[sub_subject].solved++
            if (is_correct) bySubSubMap[sub_subject].correct++
          }
        })

        setTotalStats({ solved: totalSolved, correct: totalCorrect })

        setBySubject(
          OX_SUBJECTS.map(({ key, label }) => ({
            key,
            label,
            solved:  bySubMap[key].solved,
            correct: bySubMap[key].correct,
          }))
        )

        const subList = KNOWN_SUBS.map(name => {
          const { solved, correct } = bySubSubMap[name]
          return {
            name,
            key:      SUB_TO_KEY[name],
            solved,
            correct,
            accuracy: solved > 0 ? Math.round((correct / solved) * 100) : null,
          }
        }).sort((a, b) => {
          if (a.accuracy === null && b.accuracy === null) return 0
          if (a.accuracy === null) return 1
          if (b.accuracy === null) return -1
          return a.accuracy - b.accuracy  // 낮은 정답률 순
        })

        setBySub(subList)
      } catch (err) {
        console.warn('[OXStats] 로드 실패:', err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [userId, authStatus])

  // ── 집계 ─────────────────────────────────────────────────────────────────────
  const overallRate = totalStats.solved > 0
    ? Math.round((totalStats.correct / totalStats.solved) * 100)
    : null

  // 취약점 CTA: accuracy가 null이 아닌 항목 중 최저
  const weakest = bySub.find(s => s.accuracy !== null)

  // ── 약점 세부과목 바로풀기 ────────────────────────────────────────────────────
  // OXSubject.jsx의 handleCardClick과 동일한 흐름: resetStore → loadQuestions → navigate
  // (직접 navigate만 하면 oxStore의 questions가 로드되지 않아 OXQuiz가 빈 화면을 표시함)
  const handleWeakestClick = async () => {
    if (!weakest) return
    resetStore()
    await loadQuestions(weakest.key, weakest.name)
    navigate(`/ox/${weakest.key}/${weakest.name}`)
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

      {/* 헤더 */}
      <AppHeader title="OX 학습 통계" backTo="/ox" />

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-gray-400 animate-pulse">통계를 불러오는 중···</p>
        </div>
      )}

      {/* 게스트 — 회원 전용 안내 */}
      {!isLoading && !userId && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-base font-semibold text-gray-600">OX 통계는 회원 전용입니다</p>
          <p className="text-sm text-gray-400">로그인 후 OX 풀이 기록이 쌓이면 통계가 표시됩니다.</p>
          <button
            onClick={() => navigate('/ox')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
          >
            ← OX 홈으로
          </button>
        </div>
      )}

      {/* 풀이 기록 없음 */}
      {!isLoading && userId && totalStats.solved === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">📊</span>
          <p className="text-base font-semibold text-gray-600">아직 OX 풀이 기록이 없습니다</p>
          <p className="text-sm text-gray-400">OX를 풀면 여기에 통계가 표시됩니다.</p>
          <button
            onClick={() => navigate('/ox')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            OX 학습 시작하기
          </button>
        </div>
      )}

      {/* 통계 본문 */}
      {!isLoading && userId && totalStats.solved > 0 && (
        <>
          {/* ① 전체 요약 */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 px-1">전체 요약</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-0.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-4">
                <span className="text-2xl font-bold text-gray-900">{totalStats.solved.toLocaleString()}</span>
                <span className="text-xs text-gray-500 mt-0.5">총 풀이</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-4">
                <span className="text-2xl font-bold text-green-600">{totalStats.correct.toLocaleString()}</span>
                <span className="text-xs text-gray-500 mt-0.5">총 정답</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-4">
                <span className="text-2xl font-bold text-blue-600">{overallRate}%</span>
                <span className="text-xs text-gray-500 mt-0.5">전체 정답률</span>
              </div>
            </div>
          </div>

          {/* ② 3과목별 정답률 */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 px-1">과목별 정답률</p>
            <div className="flex flex-col gap-2">
              {bySubject.map(({ key, label, solved, correct }) => {
                const rate = solved > 0 ? Math.round((correct / solved) * 100) : null
                const c    = SUBJECT_COLOR[key]
                return (
                  <div key={key} className={`rounded-xl border px-4 py-3 ${c.bgCls} ${c.borderCls}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold ${c.nameCls}`}>{label}</span>
                      <span className={`text-sm font-bold ${c.nameCls}`}>
                        {rate !== null ? `${rate}%` : '미학습'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
                      {rate !== null && (
                        <div
                          className={`h-full rounded-full ${c.barCls}`}
                          style={{ width: `${rate}%` }}
                        />
                      )}
                    </div>
                    {solved > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        {correct.toLocaleString()} / {solved.toLocaleString()} 정답
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ③ 세부과목 12종 취약도 */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 px-1">
              세부과목 취약도{' '}
              <span className="font-normal text-gray-300">· 정답률 낮은 순</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {bySub.map(({ name, accuracy }) => {
                const { label, cls, badge } = getLevel(accuracy)
                return (
                  <div key={name} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3">
                    <p className="text-xs text-gray-500 mb-1">{name}</p>
                    <p className={`text-xl font-bold ${cls}`}>
                      {accuracy !== null ? `${accuracy}%` : '—'}
                    </p>
                    <span className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded font-semibold ${badge}`}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ④ 약점 바로풀기 CTA */}
          {weakest && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleWeakestClick}
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {weakest.name} 집중 풀기
              </button>
              <p className="text-xs text-gray-400 text-center">
                정답률 최하위 세부과목 바로 진입
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
