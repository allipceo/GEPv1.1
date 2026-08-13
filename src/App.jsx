/**
 * App.jsx — 라우팅 + 데이터 초기 로드 담당
 * 앱 진입 시 loadQuestions() 1회 호출
 */

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import useExamStore from './stores/examStore'
import { useAuthStore } from './stores/authStore'
import useStatsStore from './stores/statsStore'
import Home from './pages/Home'
import ServiceAHome from './pages/ServiceAHome'
import ServiceBHome from './pages/ServiceBHome'
import Question from './pages/Question'
import Result from './pages/Result'
import WrongReview from './pages/WrongReview'
import OXHome from './pages/OXHome'
import OXSubject from './pages/OXSubject'
import OXQuiz from './pages/OXQuiz'
import OXReview from './pages/OXReview'
import OXStats from './pages/OXStats'
import MockExamHome from './pages/MockExamHome'
import MockExamQuiz from './pages/MockExamQuiz'
import MockExamResult from './pages/MockExamResult'
import MockExamBreak from './pages/MockExamBreak'
import MockExamStats from './pages/MockExamStats'
import CustomMockHome from './pages/CustomMockHome'
import CustomMockQuiz from './pages/CustomMockQuiz'
import CustomMockResult from './pages/CustomMockResult'
import CustomMockStats from './pages/CustomMockStats'
import UnifiedWrongReview from './pages/UnifiedWrongReview'
import ChallengeMode       from './pages/ChallengeMode'
import ChallengeResult     from './pages/ChallengeResult'
import ProgressTracker     from './pages/ProgressTracker'
import AdminUsers          from './pages/AdminUsers'
import StatsDashboard      from './pages/StatsDashboard'
import RequireLogin        from './components/RequireLogin'

function protectedPage(element, options = {}) {
  return <RequireLogin {...options}>{element}</RequireLogin>
}

export default function App() {
  const loadQuestions    = useExamStore((s) => s.loadQuestions)
  const isReady          = useExamStore((s) => s.isReady)
  const initAuthListener = useAuthStore((s) => s.initAuthListener)
  const userId           = useAuthStore((s) => s.userId)

  useEffect(() => {
    loadQuestions()
    const subscription = initAuthListener()
    return () => subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    useStatsStore.getState().bindUser(userId ?? null)
    useExamStore.getState().bindExamUser(userId ?? null)

    // isReady(=loadQuestions 완료) 이후에만 DB 동기화 — loadQuestions()의 최종 set()이
    // progressMap을 localStorage 기준으로 덮어쓰기 전에 DB 병합값이 먼저 적용되면
    // 그 병합값이 유실되는 경합을 피하기 위함 (GEPv30-092)
    if (isReady) {
      useExamStore.getState().syncProgressFromDB(userId ?? null)
    }
  }, [userId, isReady])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/service-a" element={protectedPage(<ServiceAHome />)} />
        <Route path="/service-b" element={protectedPage(<ServiceBHome />)} />
        <Route path="/admin/users" element={protectedPage(<AdminUsers />, { requireApproval: false })} />
        <Route path="/question" element={protectedPage(<Question />)} />
        <Route path="/result" element={protectedPage(<Result />)} />
        <Route path="/wrong-review" element={protectedPage(<WrongReview />)} />
        <Route path="/ox" element={protectedPage(<OXHome />)} />
        <Route path="/ox/stats" element={protectedPage(<OXStats />)} />
        <Route path="/ox/:subjectKey" element={protectedPage(<OXSubject />)} />
        <Route path="/ox/:subjectKey/:subSubject" element={protectedPage(<OXQuiz />)} />
        <Route path="/ox/:subjectKey/:subSubject/review" element={protectedPage(<OXReview />)} />
        <Route path="/mock" element={protectedPage(<MockExamHome />)} />
        <Route path="/mock/:round/:part" element={protectedPage(<MockExamQuiz />)} />
        <Route path="/mock/:round/:part/result" element={protectedPage(<MockExamResult />)} />
        <Route path="/mock/:round/result" element={protectedPage(<MockExamResult />)} />
        <Route path="/mock/:round/break" element={protectedPage(<MockExamBreak />)} />
        <Route path="/mock/stats" element={protectedPage(<MockExamStats />)} />
        <Route path="/custom-mock" element={protectedPage(<CustomMockHome />)} />
        <Route path="/custom-mock/:sessionId/part1" element={protectedPage(<CustomMockQuiz />)} />
        <Route path="/custom-mock/:sessionId/part2" element={protectedPage(<CustomMockQuiz />)} />
        <Route path="/custom-mock/:sessionId/result" element={protectedPage(<CustomMockResult />)} />
        <Route path="/custom-mock/stats" element={protectedPage(<CustomMockStats />)} />
        <Route path="/unified-wrong" element={protectedPage(<UnifiedWrongReview />)} />
        <Route path="/unified-wrong/challenge/:minCount" element={protectedPage(<ChallengeMode />)} />
        <Route path="/unified-wrong/result" element={protectedPage(<ChallengeResult />)} />
        <Route path="/unified-wrong/progress" element={protectedPage(<ProgressTracker />)} />
        <Route path="/stats-dashboard" element={protectedPage(<StatsDashboard />)} />
      </Routes>
    </BrowserRouter>
  )
}
