/**
 * src/pages/MockExamHome.jsx — /mock
 * 모의고사 회차 선택 화면
 * GEP_054 Phase5 STEP2 | GEP_059 STEP5
 *
 * 레벨 게이트: userFeatures.canMockExam (serviceLevel >= 4)
 * 회차 카드 9개: mockExamConfig.rounds 기준 (23~31회)
 * 데이터 소스:
 *   - 회원: Supabase mock_exam_sessions 조회
 *   - 게스트: localStorage 결과 조합
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { FEATURE_FLAGS } from '../config/featureFlags'
import { mockExamConfig } from '../config/mockExamConfig'
import {
  mockExamSupabase,
  loadResult,
  calcAverage,
  checkPass,
  PROGRESS_LS_KEY,
} from '../services/mockExamService'

// ── 게스트: localStorage에서 세션 이력 구성 ──────────────────────────────────
function buildGuestSessions() {
  const sessions = {}
  for (const round of mockExamConfig.rounds) {
    const part1Result = loadResult(round, 'part1')
    const part2Result = loadResult(round, 'part2')

    if (part1Result && part2Result) {
      const allScores = { ...part1Result.scores, ...part2Result.scores }
      sessions[round] = {
        isComplete:      true,
        totalAverage:    calcAverage(allScores),
        isPass:          checkPass(allScores),
        part1Done:       true,
        progressPercent: 100,
      }
    } else if (part1Result) {
      sessions[round] = {
        isComplete:      false,
        part1Done:       true,
        progressPercent: 50,
      }
    } else {
      // 진행 중인 데이터 확인
      try {
        const inProgress = JSON.parse(
          localStorage.getItem(PROGRESS_LS_KEY(round, 'part1')) || 'null'
        )
        if (inProgress?.answers && Object.keys(inProgress.answers).length > 0) {
          const pct = Math.max(5, Math.round((Object.keys(inProgress.answers).length / 40) * 50))
          sessions[round] = {
            isComplete:      false,
            part1Done:       false,
            progressPercent: pct,
          }
        }
      } catch {}
    }
  }
  return sessions
}

// ── 합격/불합격 배지 ──────────────────────────────────────────────────────────
function PassBadge({ isPass }) {
  return isPass
    ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">합격</span>
    : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">불합격</span>
}

// ── 회차 카드 ─────────────────────────────────────────────────────────────────
function RoundCard({ round, session, navigate }) {
  const state = !session ? 'new' : session.isComplete ? 'done' : 'progress'

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 flex flex-col gap-3 shadow-sm">

      {/* 카드 헤더: 회차 + 과목 컬러 인디케이터 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-900">{round}회</span>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" title="법령" />
            <span className="w-2 h-2 rounded-full bg-green-500" title="손보1부" />
            <span className="w-2 h-2 rounded-full bg-purple-500" title="손보2부" />
          </div>
        </div>
        {state === 'done'     && <PassBadge isPass={session.isPass} />}
        {state === 'progress' && <span className="text-xs text-gray-400">진행 중</span>}
        {state === 'new'      && <span className="text-xs text-gray-300">미응시</span>}
      </div>

      {/* 완료: 점수 표시 */}
      {state === 'done' && (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-800">
            {Number(session.totalAverage).toFixed(1)}
            <span className="text-sm font-normal text-gray-400 ml-0.5">점</span>
          </span>
          <span className="text-xs text-gray-400">전체 평균</span>
        </div>
      )}

      {/* 진행 중: 진행률 바 */}
      {state === 'progress' && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{session.part1Done ? '2교시 진행 중' : '1교시 진행 중'}</span>
            <span>{session.progressPercent ?? 0}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-indigo-400 transition-all"
              style={{ width: `${session.progressPercent ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      {state === 'new' && (
        <button
          onClick={() => navigate(`/mock/${round}/part1`)}
          className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
        >
          시작하기
        </button>
      )}
      {state === 'progress' && (
        <button
          onClick={() => navigate(`/mock/${round}/${session.part1Done ? 'part2' : 'part1'}`)}
          className="w-full py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:bg-amber-700 transition-colors"
        >
          이어하기
        </button>
      )}
      {state === 'done' && (
        <button
          onClick={() => navigate(`/mock/${round}/result`)}
          className="w-full py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 active:bg-gray-300 transition-colors"
        >
          성적표 보기
        </button>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function MockExamHome() {
  const navigate    = useNavigate()
  const serviceLevel = useAuthStore((s) => s.serviceLevel)
  const userId       = useAuthStore((s) => s.userId)
  const authStatus   = useAuthStore((s) => s.authStatus)
  const canMockExam  = serviceLevel >= FEATURE_FLAGS.MOCKEXAM_MIN_LEVEL  // persist 캐시 대신 직접 계산

  const [sessions,   setSessions]   = useState({})
  const [isLoading,  setIsLoading]  = useState(true)

  // ── 세션 이력 로드 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canMockExam) {
      setIsLoading(false)
      return
    }

    async function loadSessions() {
      try {
        if (authStatus === 'authenticated' && userId) {
          // 회원: Supabase 조회
          const data = await mockExamSupabase.getSessionHistory(userId)
          setSessions(data)
        } else {
          // 게스트: localStorage 조합
          setSessions(buildGuestSessions())
        }
      } catch (err) {
        console.warn('[MockExamHome] 세션 로드 실패:', err.message)
        setSessions(buildGuestSessions())
      } finally {
        setIsLoading(false)
      }
    }

    loadSessions()
  }, [canMockExam, authStatus, userId])

  // ── 레벨 게이트 ──────────────────────────────────────────────────────────
  if (!canMockExam) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
            aria-label="홈으로"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">모의고사</h1>
        </div>

        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-base font-semibold text-gray-700">레벨 4 전용 서비스입니다</p>
          <p className="text-sm text-gray-400">모의고사는 레벨 4 이상 회원만 이용할 수 있습니다.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:bg-gray-200 transition-colors"
          >
            ← 홈으로
          </button>
        </div>
      </div>
    )
  }

  // ── 정상 화면 ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

      {/* 상단 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
            aria-label="홈으로"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">모의고사</h1>
        </div>
        {/* 통계 버튼: STEP 6에서 활성화 */}
        <button
          onClick={() => navigate('/mock/stats')}
          className="text-sm text-indigo-500 font-semibold hover:text-indigo-700 transition-colors"
        >
          통계 ›
        </button>
      </div>

      {/* 시험 구조 안내 */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex flex-col gap-1.5">
        <p className="text-xs font-bold text-indigo-700">시험 구조</p>
        <div className="flex gap-3 text-xs text-indigo-600">
          <span>📘 1교시 법령 · 40문제 · 40분</span>
          <span className="text-indigo-300">|</span>
          <span>📗📕 2교시 손보 · 80문제 · 80분</span>
        </div>
        <p className="text-xs text-indigo-400">합격 기준: 과목당 40점 이상 · 전체 평균 60점 이상</p>
      </div>

      {/* 회차 카드 목록 */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-500 px-1">회차 선택</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-gray-400 animate-pulse">이력을 불러오는 중···</p>
          </div>
        ) : (
          mockExamConfig.rounds.map((round) => (
            <RoundCard
              key={round}
              round={round}
              session={sessions[round] ?? null}
              navigate={navigate}
            />
          ))
        )}
      </div>

    </div>
  )
}
