/**
 * src/services/oxService.js
 * OX 퀴즈 Supabase 연동 서비스
 *
 * recordAttempt: attempts INSERT + upsert_question_stat RPC
 *   - selected_answer: O→1, X→2 (INTEGER 1~4 제약 대응)
 *   - study_mode: 'ox' (일반 시험과 구분)
 *   - userId null(게스트)이면 스킵
 *
 * saveProgress: progress 테이블 upsert
 *   - filter_key: 'ox:{subject}:{subSubject}'
 *   - last_question_id: 다음에 풀어야 할 문항의 ox_id (이어풀기 재개 지점, 라운드 완주 시 null)
 *   - current_index: last_question_id와 함께 저장하는 참고용 인덱스(주 재개 신호 아님)
 *
 * loadProgress: progress 테이블 조회
 *   - Returns { currentIndex, lastQuestionId } or null
 *
 * 2026-08-20: loadProgress가 어디서도 호출되지 않아 "이어풀기"가 항상 처음(0번)부터
 * 시작하던 결함을 발견 — OXSubject.jsx에서 호출하도록 연결(§oxStore.js loadQuestions 참조).
 *
 * 2026-08-20(2차): 순수 인덱스 저장은 문제 세트 구성이 바뀌면(회차 추가 등) 엉뚱한 문제를
 * 가리킬 위험이 있어(GEPv30-141 통찰보고서 원칙 9), last_question_id(ID 앵커) 방식으로 전환.
 * 재개 시 저장된 ID가 현재 문제 목록에서 몇 번째인지 다시 찾아 그 위치부터 시작한다
 * (examStore.js Service B의 questionOrder ID 앵커 패턴과 동일한 사상).
 */

import { supabase } from '../lib/supabase'
import { canCountAttempts } from './countingEligibility'
import { getCumulativeCount as getLedgerCumulativeCount } from './ledgerStatsService'

export const oxService = {
  /**
   * @param {string|null} userId    - auth.uid() / null(게스트)
   * @param {string}      oxId      - ox_id (문제 고유 ID)
   * @param {boolean}     isCorrect
   * @param {{ answer: 'O'|'X', round: number, subject: string, subSubject: string }} ctx
   */
  recordAttempt: async (authState, oxId, isCorrect, ctx = {}) => {
    if (!canCountAttempts(authState)) return

    const { answer, round, subject, subSubject } = ctx
    const selectedAnswer = answer === 'O' ? 1 : 2
    const userId = authState.userId

    const [attemptRes, rpcRes] = await Promise.all([
      supabase.from('attempts').insert({
        user_id:         userId,
        question_id:     oxId,
        question_round:  round   ?? 0,
        subject:         subject ?? '',
        sub_subject:     subSubject ?? '',
        study_mode:      'ox',
        selected_answer: selectedAnswer,
        is_correct:      isCorrect,
        exam_version:    '1.0',
        service_level:   authState.serviceLevel ?? 1,
        device_type:     window.innerWidth < 768 ? 'mobile' : 'desktop',
      }),
      supabase.rpc('upsert_question_stat', {
        p_question_id: oxId,
        p_is_correct:  isCorrect,
      }),
    ])

    if (attemptRes.error) {
      console.warn('[oxService] attempts INSERT 실패:', attemptRes.error.message)
    }
    if (rpcRes.error) {
      console.warn('[oxService] upsert_question_stat 실패:', rpcRes.error.message)
    }
  },

  /**
   * @param {string|null} userId
   * @param {string}      subject
   * @param {string}      subSubject
   * @param {{ currentIndex: number, lastQuestionId: string|null }} data
   */
  saveProgress: async (authState, subject, subSubject, data) => {
    if (!canCountAttempts(authState)) return
    const userId = authState.userId

    const { error } = await supabase
      .from('progress')
      .upsert(
        {
          user_id:          userId,
          filter_key:       `ox:${subject}:${subSubject}`,
          current_index:    data.currentIndex ?? 0,
          last_question_id: data.lastQuestionId ?? null,
          last_updated:     new Date().toISOString(),
        },
        { onConflict: 'user_id,filter_key' }
      )

    if (error) {
      console.warn('[oxService] saveProgress 실패:', error.message)
    }
  },

  /**
   * @param {string|null} userId
   * @param {string}      subject
   * @param {string}      subSubject
   * @returns {Promise<{ currentIndex: number, lastQuestionId: string|null }|null>}
   */
  loadProgress: async (authState, subject, subSubject) => {
    if (!canCountAttempts(authState)) return null
    const userId = authState.userId

    const { data, error } = await supabase
      .from('progress')
      .select('current_index, last_question_id')
      .eq('user_id', userId)
      .eq('filter_key', `ox:${subject}:${subSubject}`)
      .single()

    if (error || !data) return null
    return { currentIndex: data.current_index, lastQuestionId: data.last_question_id }
  },

  /**
   * 화면 상단 "누적 N" 표시용 — attempts 원장에서 직접 집계한다.
   *
   * oxStore.totalCumulative(축3)는 순수 메모리 상태라, 카드를 다시 클릭해 진입할 때마다
   * OXSubject.jsx의 handleCardClick()이 호출하는 resetStore()에 의해 0으로 초기화된다.
   * "절대 리셋 금지"라는 설계 의도와 달리 실제로는 세션을 나갔다 들어오면 사라지므로,
   * 진입 시점마다 원장에서 실측치를 다시 읽어와 그 값으로 되살린다(GEPv30-141 원칙:
   * 표시용 통계는 항상 원장 기준으로 재계산).
   *
   * 실제 집계 로직은 ledgerStatsService(GEPv30-153, 전역 공용 모듈)에 있다 —
   * OX 전용 시그니처(subject/subSubject 위치 인자)만 여기서 유지해 기존 호출부
   * (oxStore.js, OXSubject.jsx)를 바꾸지 않는다.
   *
   * @param {string|null} userId
   * @param {string}      subject
   * @param {string}      subSubject - 'ALL'이면 subject 전체 합산
   * @returns {Promise<number>}
   */
  getCumulativeCount: (authState, subject, subSubject) =>
    getLedgerCumulativeCount(authState, { studyMode: 'ox', subject, subSubject }),
}
