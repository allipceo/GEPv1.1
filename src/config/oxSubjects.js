/**
 * src/config/oxSubjects.js
 * OX 퀴즈 과목/세부과목 Config — 하드코딩 금지 원칙
 * 과목명, 파일명, 세부과목 전부 여기서 관리.
 */

export const OX_SUBJECTS = [
  {
    key: 'law',
    label: '법령',
    file: 'ox_law.json',
    subs: ['보험업법', '상법 보험편', '위험관리론', '세제 및 재무설계'],
  },
  {
    key: 'p1',
    label: '손보1부',
    file: 'ox_p1.json',
    subs: ['자동차보험', '특종보험', '보증보험', '개인연금·저축성'],
  },
  {
    key: 'p2',
    label: '손보2부',
    file: 'ox_p2.json',
    subs: ['화재보험', '해상보험', '항공·우주', '재보험'],
  },
]
