/**
 * AnswerButtons.jsx — 4지선다 답안 버튼 컨테이너
 * props만 보고 동작 (store 직접 참조 없음)
 *
 * props:
 *   selectedAnswer: 사용자가 선택한 답 (null이면 미선택)
 *   correctAnswer:  정답 번호
 *   onAnswer:       (number) => void
 */

import AnswerButton from './AnswerButton'

const LABELS = ['①', '②', '③', '④']

function getStatus(number, selectedAnswer, correctAnswer) {
  if (selectedAnswer === null || selectedAnswer === undefined) return 'default'

  if (number === correctAnswer)   return 'correct'
  if (number === selectedAnswer)  return 'wrong'
  return 'disabled'
}

export default function AnswerButtons({ selectedAnswer, correctAnswer, onAnswer }) {
  return (
    <div className="flex flex-row gap-2">
      {[1, 2, 3, 4].map((num) => (
        <AnswerButton
          key={num}
          number={num}
          label={LABELS[num - 1]}
          status={getStatus(num, selectedAnswer, correctAnswer)}
          onClick={() => onAnswer(num)}
        />
      ))}
    </div>
  )
}
