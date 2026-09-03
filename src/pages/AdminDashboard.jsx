/**
 * AdminDashboard.jsx — 파일럿 학습 현황 대시보드 (관리자 전용)
 * GEPv30-157: 파일럿 참가자 실시간 모니터링. 외부 차트 라이브러리 없이 CSS 바 차트.
 *
 * 데이터: attempts 원장 전체 + users 목록을 받아 JS에서 집계 (파일럿 규모 = 소량).
 * ⚠️ attempts RLS(attempts_self)로 인해 관리자도 타 사용자 행을 못 볼 수 있음 —
 *    조회 결과가 비면 안내 배너 표시 (GEPv30-157 결과보고서 참조).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const PILOT_START = '2026-09-03'
// 파일럿 개시일(2026-09-03) 00:00 KST = 2026-09-02T15:00:00Z.
// 모든 집계를 이 시점 이후 attempts로 한정 — 개시 전 개발·테스트 데이터 제외.
const PILOT_START_TS = '2026-09-02T15:00:00+00:00'
const ACTIVE_WINDOW_DAYS = 3

const MODE_LABEL = {
  service_a_sequence: '선택형(회차순)',
  service_b_subject_random: '선택형(과목별)',
  ox: '진위형 OX',
  mini_mock: '간이 모의고사',
  mock_exam: '모의고사',
  custom_mock: '맞춤형 모의고사',
  wrong_review: '틀린문제 복습',
  unified_wrong_challenge: '통합오답',
}

const CARD = 'bg-white rounded-xl shadow-sm border border-gray-100 p-4'

const localDate = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD (로컬 타임존)
}

const accuracyColor = (rate) =>
  rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-500'

const accuracyBar = (rate) =>
  rate >= 70 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-400'

const topKey = (counter) => {
  let best = null
  let bestN = 0
  for (const [k, n] of Object.entries(counter)) {
    if (n > bestN) { best = k; bestN = n }
  }
  return best
}

const dateRange = (startStr, endStr) => {
  const out = []
  const start = new Date(`${startStr}T00:00:00`)
  const end = new Date(`${endStr}T00:00:00`)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toLocaleDateString('en-CA'))
  }
  return out
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const isAdmin = useAuthStore((s) => s.isAdmin)

  const [attempts, setAttempts] = useState([])
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshedAt, setRefreshedAt] = useState(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    const [aRes, uRes] = await Promise.all([
      supabase
        .from('attempts')
        .select('attempt_id, is_correct, attempted_at, study_mode, device_type, user_id')
        .gte('attempted_at', PILOT_START_TS),
      supabase
        .from('users')
        .select('user_id, real_name, last_access_at, last_device')
        .eq('status', 'active')
        .eq('is_admin', false)
        .order('real_name'),
    ])

    if (aRes.error) setError(`attempts 조회 실패: ${aRes.error.message}`)
    if (uRes.error) setError((prev) => prev || `users 조회 실패: ${uRes.error.message}`)

    setAttempts(aRes.data ?? [])
    setUsers(uRes.data ?? [])
    setRefreshedAt(new Date())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  const agg = useMemo(() => {
    const total = attempts.length
    const correct = attempts.filter((a) => a.is_correct).length
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0

    const today = new Date().toLocaleDateString('en-CA')
    const todayCount = attempts.filter((a) => localDate(a.attempted_at) === today).length

    const cutoff = Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000
    const activeUsers = users.filter(
      (u) => u.last_access_at && new Date(u.last_access_at).getTime() >= cutoff
    ).length

    // 일별 추이
    const byDay = {}
    attempts.forEach((a) => {
      const d = localDate(a.attempted_at)
      if (d) byDay[d] = (byDay[d] ?? 0) + 1
    })
    const days = dateRange(PILOT_START, today).map((d) => ({ date: d, count: byDay[d] ?? 0 }))
    const dayMax = Math.max(1, ...days.map((d) => d.count))

    // 서비스별 비중
    const byMode = {}
    attempts.forEach((a) => {
      const k = a.study_mode ?? 'unknown'
      byMode[k] = (byMode[k] ?? 0) + 1
    })
    const modes = Object.entries(byMode)
      .map(([mode, count]) => ({
        mode,
        label: MODE_LABEL[mode] ?? mode,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    // 기기 분포 (attempts.device_type 우선, 없으면 users.last_device 폴백)
    const dev = { mobile: 0, desktop: 0, unknown: 0 }
    let devSource = 'attempts'
    attempts.forEach((a) => {
      if (a.device_type === 'mobile') dev.mobile += 1
      else if (a.device_type === 'desktop') dev.desktop += 1
      else dev.unknown += 1
    })
    if (dev.mobile === 0 && dev.desktop === 0) {
      devSource = 'users.last_device'
      dev.mobile = users.filter((u) => u.last_device === 'mobile').length
      dev.desktop = users.filter((u) => u.last_device === 'desktop').length
      dev.unknown = users.filter((u) => !u.last_device).length
    }
    const devTotal = Math.max(1, dev.mobile + dev.desktop + dev.unknown)

    // 참가자별
    const perUser = {}
    attempts.forEach((a) => {
      const u = (perUser[a.user_id] ??= { total: 0, correct: 0, modes: {}, devices: {} })
      u.total += 1
      if (a.is_correct) u.correct += 1
      if (a.study_mode) u.modes[a.study_mode] = (u.modes[a.study_mode] ?? 0) + 1
      if (a.device_type) u.devices[a.device_type] = (u.devices[a.device_type] ?? 0) + 1
    })
    const participants = users.map((u) => {
      const s = perUser[u.user_id]
      const uTotal = s?.total ?? 0
      const uRate = uTotal > 0 ? Math.round((s.correct / uTotal) * 100) : 0
      const mainMode = s ? topKey(s.modes) : null
      const mainDevice = s && topKey(s.devices) ? topKey(s.devices) : u.last_device ?? null
      return {
        userId: u.user_id,
        name: u.real_name || '(이름 없음)',
        lastAccess: u.last_access_at,
        total: uTotal,
        rate: uRate,
        mainMode: mainMode ? MODE_LABEL[mainMode] ?? mainMode : null,
        mainDevice,
      }
    })

    return { total, rate, todayCount, activeUsers, days, dayMax, modes, dev, devTotal, devSource, participants }
  }, [attempts, users])

  if (!isAdmin) {
    return (
      <div className="min-h-screen max-w-[720px] mx-auto bg-gray-50 px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">운영자 권한이 필요합니다.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-3 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const fmtTime = (d) =>
    d ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'
  const fmtAccess = (iso) => {
    if (!iso) return '접속 기록 없음'
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen max-w-[720px] mx-auto bg-gray-50 px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">📊 파일럿 학습 현황 대시보드</h1>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isLoading ? '불러오는 중…' : '새로고침'}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        집계 기간: 파일럿 개시({PILOT_START}) ~ 현재 · 마지막 새로고침: {fmtTime(refreshedAt)}
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {!error && attempts.length === 0 && users.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          ⚠️ attempts 데이터가 조회되지 않았습니다. 관리자 계정이라도 <code>attempts</code> 테이블 RLS(<code>attempts_self</code>)로
          타 사용자 풀이가 보이지 않을 수 있습니다. 관리자 SELECT 정책 또는 집계 RPC 적용이 필요합니다.
        </div>
      )}

      {/* 전체 현황 4카드 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={CARD}>
          <p className="text-xs text-gray-400">총 풀이 수</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">{agg.total.toLocaleString()}</p>
        </div>
        <div className={CARD}>
          <p className="text-xs text-gray-400">전체 정답률</p>
          <p className={`mt-1 text-2xl font-extrabold ${accuracyColor(agg.rate)}`}>{agg.rate}%</p>
        </div>
        <div className={CARD}>
          <p className="text-xs text-gray-400">오늘 풀이 수</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">{agg.todayCount.toLocaleString()}</p>
        </div>
        <div className={CARD}>
          <p className="text-xs text-gray-400">활성 사용자 (최근 {ACTIVE_WINDOW_DAYS}일)</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">
            {agg.activeUsers}
            <span className="ml-1 text-sm font-normal text-gray-400">/ {users.length}</span>
          </p>
        </div>
      </div>

      {/* 일별 풀이 추이 */}
      <div className={`mt-4 ${CARD}`}>
        <p className="text-sm font-bold text-gray-800">일별 풀이 추이</p>
        <div className="mt-3 flex items-end gap-1.5" style={{ height: '120px' }}>
          {agg.days.map(({ date, count }) => (
            <div key={date} className="flex flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[10px] text-gray-500">{count}</span>
              <div
                className="w-full rounded-t bg-blue-500"
                style={{ height: `${Math.round((count / agg.dayMax) * 100)}%`, minHeight: count > 0 ? '4px' : '2px' }}
                title={`${date}: ${count}건`}
              />
              <span className="mt-1 text-[10px] text-gray-400">{date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 서비스별 이용 비중 */}
      <div className={`mt-4 ${CARD}`}>
        <p className="text-sm font-bold text-gray-800">서비스별 이용 비중</p>
        <div className="mt-3 flex flex-col gap-2">
          {agg.modes.length === 0 && <p className="text-xs text-gray-400">데이터 없음</p>}
          {agg.modes.map(({ mode, label, count, pct }) => (
            <div key={mode}>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{label}</span>
                <span className="font-semibold">{count.toLocaleString()} ({pct}%)</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 기기 분포 */}
      <div className={`mt-4 ${CARD}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">기기 분포</p>
          <span className="text-[10px] text-gray-400">출처: {agg.devSource}</span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {[
            ['모바일', agg.dev.mobile, 'bg-emerald-500'],
            ['데스크톱', agg.dev.desktop, 'bg-sky-500'],
            ['미상', agg.dev.unknown, 'bg-gray-300'],
          ].map(([label, n, color]) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{label}</span>
                <span className="font-semibold">
                  {n} ({Math.round((n / agg.devTotal) * 100)}%)
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100">
                <div className={`h-2 rounded-full ${color}`} style={{ width: `${(n / agg.devTotal) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 참가자별 카드 */}
      <div className="mt-4">
        <p className="text-sm font-bold text-gray-800">참가자별 현황 ({agg.participants.length}명)</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {agg.participants.map((p) => (
            <div key={p.userId} className={CARD}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">{p.name}</p>
                {p.total > 0 ? (
                  <span className={`text-sm font-bold ${accuracyColor(p.rate)}`}>{p.rate}%</span>
                ) : (
                  <span className="text-xs text-gray-400">아직 풀이 없음</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">마지막 접속: {fmtAccess(p.lastAccess)}</p>
              {p.total > 0 && (
                <>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                    <div className={`h-1.5 rounded-full ${accuracyBar(p.rate)}`} style={{ width: `${p.rate}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>누적 <b className="text-gray-700">{p.total.toLocaleString()}</b></span>
                    {p.mainMode && <span>주 이용 <b className="text-gray-700">{p.mainMode}</b></span>}
                    {p.mainDevice && <span>기기 <b className="text-gray-700">{p.mainDevice}</b></span>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
