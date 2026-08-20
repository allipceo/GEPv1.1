/**
 * Home.jsx — 홈 화면
 * GEPv30-084: S3-c 선택형+진위형 통합 대시보드(L1-DB) + 6개 메뉴(L2-A~F)로 전면 교체
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useStatsStore from '../stores/statsStore'
import LoginButton from '../components/LoginButton'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { canCountAttempts } from '../services/countingEligibility'
import { isServiceEnabled } from '../config/featureFlags'

const EXAM_DATE = new Date('2026-11-15')
const SUBJECTS = ['법령', '손보1부', '손보2부']
const TOTAL_BY_SUBJECT = { '법령': 360, '손보1부': 360, '손보2부': 360 }

/**
 * bySubject 키는 세부과목(subSubject)으로 저장됨 (statsService.js 참조).
 * 주요과목 통계는 해당 세부과목들을 합산하여 계산.
 * 값은 exams.json의 실제 subSubject 값과 일치해야 함.
 */
const SUBJECTS_MAP = {
  '법령':    ['보험업법', '상법', '세제재무', '위험관리'],
  '손보1부': ['보증보험', '연금저축', '자동차보험', '특종보험'],
  '손보2부': ['재보험', '항공우주', '해상보험', '화재보험'],
}

function calcDday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((EXAM_DATE - today) / (1000 * 60 * 60 * 24))
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()

  const stats = useStatsStore((s) => s.stats)
  const authStatus = useAuthStore((s) => s.authStatus)
  const serviceLevel = useAuthStore((s) => s.serviceLevel)
  const realName = useAuthStore((s) => s.realName)
  const userId = useAuthStore((s) => s.userId)
  const approvalStatus = useAuthStore((s) => s.approvalStatus)
  const status = useAuthStore((s) => s.status)
  const isPaused = useAuthStore((s) => s.isPaused)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const prevDevice = useAuthStore((s) => s.prevDevice)
  const dismissDeviceBanner = useAuthStore((s) => s.dismissDeviceBanner)

  const [oxTotal, setOxTotal] = useState(() => {
    try {
      const cached = localStorage.getItem(`gep_oxTotal:${useAuthStore.getState().userId}`)
      return cached ? parseInt(cached, 10) : 0
    } catch { return 0 }
  })

  useEffect(() => {
    if (authStatus !== 'authenticated' || !userId) return
    supabase
      .from('attempts')
      .select('attempt_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('study_mode', 'ox')
      .then(({ count, error }) => {
        if (error) { console.warn('[GEP] oxTotal 조회 실패:', error.message); return }
        if (count != null) {
          setOxTotal(count)
          try { localStorage.setItem(`gep_oxTotal:${userId}`, count) } catch {}
        }
      })
  }, [authStatus, userId, location.key])

  if (authStatus === 'guest') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-gray-100 flex flex-col items-center gap-5">
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">GEP V3.0 손해보험중개사</h1>
            <p className="text-sm text-gray-500">학습 시스템</p>
          </div>
          <LoginButton />
        </div>
      </div>
    )
  }

  const canUseCounting = canCountAttempts({
    authStatus, serviceLevel, userId, approvalStatus, status, isPaused, isAdmin,
  })

  // 서비스 순차 가동 잠금 표시 (GEPv30-120) — 관리자는 QA를 위해 잠금 표시 없음
  const isLocked = (serviceKey) => !isAdmin && !isServiceEnabled(serviceKey)

  const dDay = calcDday()

  // S4: 기기 전환 감지 배너 표시 여부
  const currentDevice = window.innerWidth < 768 ? 'mobile' : 'desktop'
  const showDeviceBanner = prevDevice !== null && prevDevice !== currentDevice

  // 세부과목 합산으로 주요과목 정답률 계산
  // (bySubject는 세부과목 키로 저장되므로 SUBJECTS_MAP으로 집계)
  const getSubjectAgg = (subject) => {
    const subs = SUBJECTS_MAP[subject] ?? []
    return subs.reduce(
      (acc, sub) => {
        const d = stats.bySubject[sub] ?? { solved: 0, correct: 0 }
        return { solved: acc.solved + d.solved, correct: acc.correct + d.correct }
      },
      { solved: 0, correct: 0 }
    )
  }

  const getAccuracy = (subject) => {
    const agg = getSubjectAgg(subject)
    if (agg.solved === 0) return 0
    return Math.round((agg.correct / agg.solved) * 100)
  }

  const accuracies = SUBJECTS.map(getAccuracy)
  const hasAnyRecord = Object.values(stats.bySubject).some((s) => s.solved > 0)
  const avgAccuracy = hasAnyRecord
    ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
    : 0

  // 선택형+진위형 통합 풀이현황 (L1-DB)
  const mcqTotal = SUBJECTS.reduce((sum, s) => sum + getSubjectAgg(s).solved, 0)
  const mcqTotalQuestions = 1080  // 고정값
  const oxTotalQuestions = 3824   // 고정값 (ox_*.json 총합)
  const combinedTotal = mcqTotal + oxTotal
  const combinedGoal = mcqTotalQuestions + oxTotalQuestions  // 4904
  const combinedPct = combinedGoal > 0
    ? Math.min(100, Math.round((combinedTotal / combinedGoal) * 100))
    : 0
  const mcqPct = mcqTotalQuestions > 0
    ? Math.min(100, Math.round((mcqTotal / mcqTotalQuestions) * 100))
    : 0
  const oxPct = oxTotalQuestions > 0
    ? Math.min(100, Math.round((oxTotal / oxTotalQuestions) * 100))
    : 0

  const handleLogout = async () => {
    // Step 1: 메모리 상태 즉시 guest로 전환 (UI 반응)
    useAuthStore.getState().clearAuth()

    // Step 2: Supabase 서버 + 모든 기기 세션 삭제
    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch (e) {
      console.warn('[GEP] signOut exception:', e)
    }

    // Step 3: 인증 관련 키만 삭제 — 통계·진도 데이터(gep_stats_v1:*, gep:v1:examStore:*)는 절대 삭제 금지
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') || k === 'gep_auth_v1')
        .forEach(k => localStorage.removeItem(k))
    } catch {}

    // Step 4: SPA 네비게이션 — 강제 풀 리로드(window.location.href)는 signOut() 직후
    // Navigator LockManager 잠금 해제 타이밍과 겹쳐 재로그인 시도가 무한 대기(브라우저 먹통)에
    // 빠지는 사례가 있어 제거함 (GEPv30-092). SIGNED_OUT은 이미 authStore가 처리함.
    navigate('/', { replace: true })
  }

  return (
    <div className="max-w-[640px] mx-auto flex flex-col">

      {/* S4: 기기 전환 감지 배너 */}
      {showDeviceBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2">
          <span className="text-base mt-0.5 flex-shrink-0">
            {prevDevice === 'mobile' ? '📱' : '💻'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">
              {prevDevice === 'mobile' ? '모바일' : 'PC'}에서 학습 중이었습니다
            </p>
            <p className="text-xs text-amber-600">
              이어서 학습하려면 {prevDevice === 'mobile' ? '모바일' : 'PC'}에서 접속하세요
            </p>
          </div>
          <button
            onClick={dismissDeviceBanner}
            className="text-amber-400 hover:text-amber-600 text-sm font-bold flex-shrink-0 mt-0.5 leading-none"
            aria-label="배너 닫기"
          >
            ✕
          </button>
        </div>
      )}

      <div className="px-4 py-6 flex flex-col gap-4">

      {/* 섹터1: 헤더 */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
        <div>
          <span className="font-bold text-lg">{realName || '학습자'} 님</span>
          <span className="ml-3 text-gray-500 text-sm">
            시험까지{' '}
            <span className="text-blue-600 font-bold">
              {dDay >= 0 ? `D-${dDay}` : '시험 종료'}
            </span>
            일<span className="text-xs text-gray-400 ml-1">(2026.11.15)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="text-sm text-gray-500 border rounded px-2 py-1"
            >
              관리자
            </button>
          )}

          {/* [GEPv30-104] 일반 회원 설정 버튼 */}
          {!isAdmin && authStatus === 'authenticated' && (
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="text-sm text-gray-500 border rounded px-2 py-1"
            >
              설정
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2"
            style={{ minHeight: '44px' }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* ── L1-DB 통합 대시보드 ── */}
      <div className="flex flex-col gap-3">

        {/* 통합 풀이현황 카드 */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-500 px-4 py-4 text-white">
          <p className="text-xs opacity-75 mb-1">전체 누적 풀이</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold">{combinedTotal.toLocaleString()}</span>
            <span className="text-sm opacity-75">문제</span>
          </div>
          <div className="h-1.5 bg-white/25 rounded-full mt-3 overflow-hidden">
            <div className="h-1.5 bg-white rounded-full" style={{ width: `${combinedPct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs opacity-70">
            <span>전체 목표 대비 {combinedPct}% 완료</span>
            <span>목표 {combinedGoal.toLocaleString()}문제</span>
          </div>
        </div>

        {/* 선택형 / 진위형 분리 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white border border-gray-100 px-3 py-3">
            <p className="text-xs text-gray-400 mb-1"><span className="text-blue-500 font-bold">■</span> 선택형</p>
            <p className="text-xl font-extrabold text-gray-900">
              {mcqTotal.toLocaleString()}
              <span className="text-xs font-normal text-gray-400 ml-1">/ {mcqTotalQuestions}</span>
            </p>
            <div className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className="h-1 bg-blue-400 rounded-full" style={{ width: `${mcqPct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">평균 {avgAccuracy}% 정답</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 px-3 py-3">
            <p className="text-xs text-gray-400 mb-1"><span className="text-emerald-500 font-bold">■</span> 진위형</p>
            <p className="text-xl font-extrabold text-gray-900">
              {oxTotal.toLocaleString()}
              <span className="text-xs font-normal text-gray-400 ml-1">/ {oxTotalQuestions}</span>
            </p>
            <div className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className="h-1 bg-emerald-400 rounded-full" style={{ width: `${oxPct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">OX 누적 풀이</p>
          </div>
        </div>

        {/* D-Day 배너 */}
        <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-amber-700">🎯 시험까지</span>
          <span className="text-xl font-extrabold text-orange-600">
            {dDay >= 0 ? `D-${dDay}` : 'D-Day'}
          </span>
          <span className="text-xs text-amber-600 text-right">
            2026.11.15<br/>
            <span className="text-[10px]">보험중개사 1차</span>
          </span>
        </div>
      </div>

      {/* ── L2 메뉴 버튼 6개 ── */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-gray-400 px-1">학습 메뉴</p>

        {/* L2-A */}
        <button
          type="button"
          onClick={() => navigate('/service-a')}
          className={`w-full flex items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3.5 text-left active:bg-blue-100 ${isLocked('SERVICE_A') ? 'opacity-50 cursor-default active:bg-blue-50' : ''}`}
        >
          <span className="text-2xl">📋</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-800">선택형 풀기 — 회차순</p>
            <p className="text-xs text-blue-500 mt-0.5">23~31회 기출 순서대로</p>
          </div>
          {isLocked('SERVICE_A')
            ? <span className="text-gray-400 text-lg">🔒</span>
            : <span className="text-xs font-bold text-blue-300 bg-blue-100 px-1.5 py-0.5 rounded-full">L2-A</span>}
          <span className="text-gray-300 text-lg">›</span>
        </button>

        {/* L2-B */}
        <button
          type="button"
          onClick={() => navigate('/service-b')}
          className="w-full flex items-center gap-3 rounded-2xl bg-green-50 px-4 py-3.5 text-left active:bg-green-100"
        >
          <span className="text-2xl">📚</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-green-800">선택형 풀기 — 과목별</p>
            <p className="text-xs text-green-500 mt-0.5">법령·손보1·손보2 랜덤</p>
          </div>
          <span className="text-xs font-bold text-green-300 bg-green-100 px-1.5 py-0.5 rounded-full">L2-B</span>
          <span className="text-gray-300 text-lg">›</span>
        </button>

        {/* L2-C */}
        <button
          type="button"
          onClick={() => navigate('/ox')}
          className={`w-full flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5 text-left active:bg-emerald-100 ${isLocked('OX') ? 'opacity-50 cursor-default active:bg-emerald-50' : ''}`}
        >
          <span className="text-2xl">⭕</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-800">진위형 풀기 — 과목별</p>
            <p className="text-xs text-emerald-500 mt-0.5">O/X 세부과목 선택</p>
          </div>
          {isLocked('OX')
            ? <span className="text-gray-400 text-lg">🔒</span>
            : <span className="text-xs font-bold text-emerald-300 bg-emerald-100 px-1.5 py-0.5 rounded-full">L2-C</span>}
          <span className="text-gray-300 text-lg">›</span>
        </button>

        {/* L2-D — canUseCounting 조건 유지 */}
        {canUseCounting && (
          <button
            type="button"
            onClick={() => navigate('/wrong-review/subjects')}
            className="w-full flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3.5 text-left active:bg-orange-100"
          >
            <span className="text-2xl">✏️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-800">틀린 문제 풀기</p>
              <p className="text-xs text-orange-400 mt-0.5">세부과목·유형·횟수별 정밀 복습</p>
            </div>
            <span className="text-xs font-bold text-orange-300 bg-orange-100 px-1.5 py-0.5 rounded-full">L2-D</span>
            <span className="text-gray-300 text-lg">›</span>
          </button>
        )}

        {/* L2-E 모의고사 — 신규 연결 */}
        <button
          type="button"
          onClick={() => navigate('/mock')}
          className={`w-full flex items-center gap-3 rounded-2xl bg-violet-50 px-4 py-3.5 text-left active:bg-violet-100 ${isLocked('MOCK_EXAM') ? 'opacity-50 cursor-default active:bg-violet-50' : ''}`}
        >
          <span className="text-2xl">📝</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-violet-800">모의고사</p>
            <p className="text-xs text-violet-400 mt-0.5">회차별 120문제 · 실전 타이머</p>
          </div>
          {isLocked('MOCK_EXAM')
            ? <span className="text-gray-400 text-lg">🔒</span>
            : <span className="text-xs font-bold text-violet-300 bg-violet-100 px-1.5 py-0.5 rounded-full">L2-E</span>}
          <span className="text-gray-300 text-lg">›</span>
        </button>

        {/* 간이 모의고사 — GEPv30-109/110 신규 연결 */}
        <button
          type="button"
          onClick={() => navigate('/mini-mock')}
          className={`w-full flex items-center gap-3 rounded-2xl bg-cyan-50 px-4 py-3.5 text-left active:bg-cyan-100 ${isLocked('MINI_MOCK') ? 'opacity-50 cursor-default active:bg-cyan-50' : ''}`}
        >
          <span className="text-2xl">⏱️</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-cyan-800">간이 모의고사</p>
            <p className="text-xs text-cyan-500 mt-0.5">30문제 · 30분 · 빠른 실전 연습</p>
          </div>
          {isLocked('MINI_MOCK') && <span className="text-gray-400 text-lg">🔒</span>}
          <span className="text-gray-300 text-lg">›</span>
        </button>

        {/* E-2 맞춤형 모의고사 — GEPv30-120 신규 메뉴 추가 */}
        <button
          type="button"
          onClick={() => navigate('/custom-mock')}
          className={`w-full flex items-center gap-3 rounded-2xl bg-fuchsia-50 px-4 py-3.5 text-left active:bg-fuchsia-100 ${isLocked('CUSTOM_MOCK') ? 'opacity-50 cursor-default active:bg-fuchsia-50' : ''}`}
        >
          <span className="text-2xl">🎯</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-fuchsia-800">맞춤형 모의고사</p>
            <p className="text-xs text-fuchsia-400 mt-0.5">과목·난이도·문항수 직접 설정</p>
          </div>
          {isLocked('CUSTOM_MOCK')
            ? <span className="text-gray-400 text-lg">🔒</span>
            : <span className="text-xs font-bold text-fuchsia-300 bg-fuchsia-100 px-1.5 py-0.5 rounded-full">L2-E2</span>}
          <span className="text-gray-300 text-lg">›</span>
        </button>

        {/* L2-F 통합오답 — 신규 연결 */}
        <button
          type="button"
          onClick={() => navigate('/unified-wrong')}
          className="w-full flex items-center gap-3 rounded-2xl bg-pink-50 px-4 py-3.5 text-left active:bg-pink-100"
        >
          <span className="text-2xl">🔥</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-pink-800">통합 오답 복습</p>
            <p className="text-xs text-pink-400 mt-0.5">MCQ+OX+모의 오답 한번에</p>
          </div>
          <span className="text-xs font-bold text-pink-300 bg-pink-100 px-1.5 py-0.5 rounded-full">L2-F</span>
          <span className="text-gray-300 text-lg">›</span>
        </button>
      </div>

      {/* 학습 분석 대시보드 — GEPv30-093 신규 연결 */}
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs font-bold text-gray-400 px-1 mb-2">학습 분석</p>
        <button
          type="button"
          onClick={() => navigate('/stats-dashboard')}
          className="w-full flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3.5 text-left active:bg-indigo-100"
        >
          <span className="text-2xl">📊</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-indigo-800">내 학습 분석</p>
            <p className="text-xs text-indigo-400 mt-0.5">취약점 · 반복오답 · 합격확률</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </button>
      </div>

    </div>
    </div>
  )
}
