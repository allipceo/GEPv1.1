/**
 * Settings.jsx — 설정 팝업 (이름, 시험일)
 * localStorage 'gep:v1:settings' 에 저장 (store 무관)
 */

import { useState, useEffect } from 'react'

const SETTINGS_KEY = 'gep:v1:settings'

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : { name: '', examDate: '' }
  } catch {
    return { name: '', examDate: '' }
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

export default function Settings({ isOpen, onClose, onSave }) {
  const [name, setName]         = useState('')
  const [examDate, setExamDate] = useState('')

  // 팝업 열릴 때마다 저장값 로드
  useEffect(() => {
    if (isOpen) {
      const saved = loadSettings()
      setName(saved.name ?? '')
      setExamDate(saved.examDate ?? '')
    }
  }, [isOpen])

  const handleSave = () => {
    const settings = { name, examDate }
    saveSettings(settings)
    onSave(settings)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900">설정</h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">시험일</label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
