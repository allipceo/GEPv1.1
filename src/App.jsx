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
import WrongSubjectSelector from './pages/WrongSubjectSelector'
import WrongReviewSubjects      from './pages/WrongReviewSubjects'
import WrongReviewTypeSelector  from './pages/WrongReviewTypeSelector'
import WrongReviewCountSelector from './pages/WrongReviewCountSelector'
import ChallengeMode       from './pages/ChallengeMode'
import ChallengeResult     from './pages/ChallengeResult'
import ProgressTracker     from './pages/ProgressTracker'
import AdminUsers          from './pages/AdminUsers'
import StatsDashboard      from './pages/StatsDashboard'
import Settings            from './pages/Settings'
import MiniMockHome        from './pages/MiniMockHome'
import MiniMockQuiz        from './pages/MiniMockQuiz'
import MiniMockResult      from './pages/MiniMockResult'
import MiniMockStats       from './pages/MiniMockStats'
import RequireLogin        from './components/RequireLogin'

function protectedPage(element, options = {}) {
  const { serviceKey, ...restOptions } = options
  return (
    <RequireLogin {...restOptions} serviceKey={serviceKey}>
      {element}
    </RequireLogin>
  )
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
        <Route path="/service-a" element={protectedPage(<ServiceAHome />, { serviceKey: 'SERVICE_A' })} />
        <Route path="/service-b" element={protectedPage(<ServiceBHome />, { serviceKey: 'SERVICE_B' })} />
        <Route path="/admin/users" element={protectedPage(<AdminUsers />, { requireApproval: false })} />
        {/* /question, /result, /wrong-review는 서비스 A·B가 공유하는 화면(examStore.studyMode로 분기)이라
            단일 serviceKey를 물릴 수 없음 — 진입점(/service-a, /service-b)에서 게이트. GEPv30-121 참조 */}
        <Route path="/question" element={protectedPage(<Question />)} />
        <Route path="/result" element={protectedPage(<Result />)} />
        <Route path="/wrong-review" element={protectedPage(<WrongReview />)} />
        <Route path="/ox" element={protectedPage(<OXHome />, { serviceKey: 'OX' })} />
        <Route path="/ox/stats" element={protectedPage(<OXStats />, { serviceKey: 'OX' })} />
        <Route path="/ox/:subjectKey" element={protectedPage(<OXSubject />, { serviceKey: 'OX' })} />
        <Route path="/ox/:subjectKey/:subSubject" element={protectedPage(<OXQuiz />, { serviceKey: 'OX' })} />
        <Route path="/ox/:subjectKey/:subSubject/review" element={protectedPage(<OXReview />, { serviceKey: 'OX' })} />
        <Route path="/mock" element={protectedPage(<MockExamHome />, { serviceKey: 'MOCK_EXAM' })} />
        <Route path="/mock/:round/:part" element={protectedPage(<MockExamQuiz />, { serviceKey: 'MOCK_EXAM' })} />
        <Route path="/mock/:round/:part/result" element={protectedPage(<MockExamResult />, { serviceKey: 'MOCK_EXAM' })} />
        <Route path="/mock/:round/result" element={protectedPage(<MockExamResult />, { serviceKey: 'MOCK_EXAM' })} />
        <Route path="/mock/:round/break" element={protectedPage(<MockExamBreak />, { serviceKey: 'MOCK_EXAM' })} />
        <Route path="/mock/stats" element={protectedPage(<MockExamStats />, { serviceKey: 'MOCK_EXAM' })} />
        <Route path="/custom-mock" element={protectedPage(<CustomMockHome />, { serviceKey: 'CUSTOM_MOCK' })} />
        <Route path="/custom-mock/:sessionId/part1" element={protectedPage(<CustomMockQuiz />, { serviceKey: 'CUSTOM_MOCK' })} />
        <Route path="/custom-mock/:sessionId/part2" element={protectedPage(<CustomMockQuiz />, { serviceKey: 'CUSTOM_MOCK' })} />
        <Route path="/custom-mock/:sessionId/result" element={protectedPage(<CustomMockResult />, { serviceKey: 'CUSTOM_MOCK' })} />
        <Route path="/custom-mock/stats" element={protectedPage(<CustomMockStats />, { serviceKey: 'CUSTOM_MOCK' })} />
        <Route path="/unified-wrong" element={protectedPage(<UnifiedWrongReview />, { serviceKey: 'UNIFIED_WRONG' })} />
        <Route path="/unified-wrong/subjects" element={protectedPage(<WrongSubjectSelector />, { serviceKey: 'UNIFIED_WRONG' })} />
        {/* GEPv30-138: 홈 L2-D "틀린 문제 풀기" 신규 진입점 — 세부과목→유형→정확한 틀린횟수 */}
        <Route path="/wrong-review/subjects" element={protectedPage(<WrongReviewSubjects />, { serviceKey: 'UNIFIED_WRONG' })} />
        <Route path="/wrong-review/type/:subject" element={protectedPage(<WrongReviewTypeSelector />, { serviceKey: 'UNIFIED_WRONG' })} />
        <Route path="/wrong-review/count/:subject/:type" element={protectedPage(<WrongReviewCountSelector />, { serviceKey: 'UNIFIED_WRONG' })} />
        <Route path="/unified-wrong/challenge/:minCount" element={protectedPage(<ChallengeMode />, { serviceKey: 'UNIFIED_WRONG' })} />
        <Route path="/unified-wrong/result" element={protectedPage(<ChallengeResult />, { serviceKey: 'UNIFIED_WRONG' })} />
        <Route path="/unified-wrong/progress" element={protectedPage(<ProgressTracker />, { serviceKey: 'UNIFIED_WRONG' })} />
        <Route path="/stats-dashboard" element={protectedPage(<StatsDashboard />, { serviceKey: 'STATS' })} />
        <Route path="/settings" element={protectedPage(<Settings />)} />
        <Route path="/mini-mock" element={protectedPage(<MiniMockHome />, { serviceKey: 'MINI_MOCK' })} />
        <Route path="/mini-mock/stats" element={protectedPage(<MiniMockStats />, { serviceKey: 'MINI_MOCK' })} />
        <Route path="/mini-mock/:setId" element={protectedPage(<MiniMockQuiz />, { serviceKey: 'MINI_MOCK' })} />
        <Route path="/mini-mock/:setId/result" element={protectedPage(<MiniMockResult />, { serviceKey: 'MINI_MOCK' })} />
      </Routes>
    </BrowserRouter>
  )
}
