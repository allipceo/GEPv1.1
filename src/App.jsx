/**
 * App.jsx — 라우팅 + 데이터 초기 로드 담당
 * 앱 진입 시 loadQuestions() 1회 호출
 */

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import useExamStore from './stores/examStore'
import { useAuthStore } from './stores/authStore'
import Home from './pages/Home'
import Question from './pages/Question'
import Result from './pages/Result'
import WrongReview from './pages/WrongReview'
import OXHome from './pages/OXHome'
import OXSubject from './pages/OXSubject'
import OXQuiz from './pages/OXQuiz'
import OXReview from './pages/OXReview'

export default function App() {
  const loadQuestions    = useExamStore((s) => s.loadQuestions)
  const initAuthListener = useAuthStore((s) => s.initAuthListener)

  useEffect(() => {
    loadQuestions()
    const subscription = initAuthListener()
    return () => subscription?.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/question" element={<Question />} />
        <Route path="/result" element={<Result />} />
        <Route path="/wrong-review" element={<WrongReview />} />
        <Route path="/ox" element={<OXHome />} />
        <Route path="/ox/:subjectKey" element={<OXSubject />} />
        <Route path="/ox/:subjectKey/:subSubject" element={<OXQuiz />} />
        <Route path="/ox/:subjectKey/:subSubject/review" element={<OXReview />} />
      </Routes>
    </BrowserRouter>
  )
}
