/**
 * App.jsx — 라우팅 + 데이터 초기 로드 담당
 * 앱 진입 시 loadQuestions() 1회 호출
 */

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import useExamStore from './stores/examStore'
import Home from './pages/Home'
import Question from './pages/Question'
import Result from './pages/Result'

export default function App() {
  const loadQuestions = useExamStore((s) => s.loadQuestions)

  useEffect(() => {
    loadQuestions()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/question" element={<Question />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
  )
}
