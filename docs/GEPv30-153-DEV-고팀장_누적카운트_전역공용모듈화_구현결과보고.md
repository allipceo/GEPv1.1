# GEPv30-153 "누적" 카운트 전역 공용 모듈화(ledgerStatsService) 구현 결과보고

**작성일:** 2026-08-29 | **작성자:** 고팀장 (Claude Code)
**지시:** 조대표 — "이 누적 프로세스는 다양한 서비스 메뉴에서 공통 모듈로 작동해야 한다. 전역 통계 서비스의 기본 프로세스로 반영해 달라"
**선행:** [GEPv30-152](GEPv30-152-DEV-고팀장_OX진위형_누적카운터_초기화결함_구현결과보고.md)(OX 누적 카운터 재진입 시 0 초기화 결함 수정)

---

## 1. 배경 — 지시 이전 상태 점검

GEPv30-152에서 OXQuiz 화면의 "누적" 리셋 결함을 고치며 `oxService.getCumulativeCount()`를 새로 추가했는데, 코드베이스를 확인해 보니 **완전히 동일한 "attempts 원장에서 study_mode=ox 조건으로 집계"** 로직이 이미 두 곳에 독립적으로 존재했다.

| 파일 | 용도 | 상태 |
|---|---|---|
| `OXHome.jsx` (56~77행) | 대분류 3과목(법령/손보1부/손보2부) 카드 대시보드 | 인라인 supabase 쿼리, 자체 집계 |
| `OXSubject.jsx` (67~89행) | 한 과목 안 세부과목 4개 카드 목록 | 인라인 supabase 쿼리, 자체 집계 |
| `oxService.js`(GEPv30-152 신규) | OXQuiz 헤더 "누적 N" 단일 값 | 신규 함수, 위 둘과 별개로 작성 |

세 곳 모두 "attempts 원장이 유일한 진실 소스"라는 같은 결론에 각자 도달해 독립적으로 구현한 것 — DRY 원칙 위반이자, 조대표가 지적한 대로 "누적 프로세스가 서비스 메뉴마다 따로 작동"하는 상태였다.

## 2. 설계 — 공용 모듈 `ledgerStatsService.js`

`attempts` 테이블은 OX뿐 아니라 서비스A/B(선택형)·모의고사·미니/맞춤모의고사 등 **모든 서비스가 공유하는 단일 원장**이며, `study_mode`/`subject`/`sub_subject` 컬럼도 전 서비스 공통이다(GEPv30-MASTER-SPEC §3.2). 따라서 `study_mode` 값만 바꾸면 그대로 재사용 가능한 서비스-불문 공용 모듈을 신설했다.

```
src/services/ledgerStatsService.js
├── getCumulativeCount(authState, { studyMode, subject?, subSubject? })
│     → 단일 숫자. 화면 상단 "누적 N" 표시용.
└── getCumulativeBreakdown(authState, { studyMode, subject? })
      → { total, correct, bySubject, bySubSubject }. 카드 목록형 대시보드용.
```

파일 상단에 다음을 명문화했다 — **신규 화면에서 attempts를 직접 쿼리하는 새 코드를 작성하기 전에 먼저 이 모듈에 필요한 기능이 있는지 확인할 것.** 이것이 조대표가 요청한 "전역 통계 서비스의 기본 프로세스"다.

## 3. 리팩터링 — 기존 3곳을 공용 모듈로 교체

| 파일 | 변경 |
|---|---|
| `src/services/oxService.js` | `getCumulativeCount` 자체 구현을 제거하고 `ledgerStatsService.getCumulativeCount(authState, { studyMode: 'ox', ... })`로 위임하는 얇은 래퍼로 교체(기존 호출부 시그니처는 그대로 유지해 oxStore.js/OXSubject.jsx 무변경) |
| `src/pages/OXSubject.jsx` | 인라인 supabase 쿼리(67~89행) 제거 → `getCumulativeBreakdown({ userId }, { studyMode: 'ox', subject: subjectKey })` 호출로 교체 |
| `src/pages/OXHome.jsx` | 인라인 supabase 쿼리(56~77행) 제거 → `getCumulativeBreakdown({ userId }, { studyMode: 'ox' })` 호출로 교체, law/p1/p2 기본값 0 채움 로직만 화면 쪽에 유지(카드 렌더링이 세 키의 존재를 전제하므로) |

`supabase` 직접 import는 두 페이지 모두에서 제거됐다 — attempts 원장 접근이 `ledgerStatsService` 한 곳으로 좁혀졌다.

## 4. 검증

- `npm run build` — 성공
- 실계정(12345678) 로그인, 로컬 개발서버 실사용 검증 — 리팩터링 전후 수치 일치 확인:

  | 화면 | 항목 | 리팩터링 전 | 리팩터링 후 |
  |---|---|---|---|
  | OXHome | 총 누적 | 99 (GEPv30-152 검증 시점) | **100**(그 사이 1문제 추가 응답 반영, 정합) |
  | OXHome | 손보1부 | 99 | **100** |
  | OXSubject(/ox/p1) | 전체 | 99 | **100** |
  | OXSubject(/ox/p1) | 자동차보험 | 18 | **19**(GEPv30-152에서 1문제 추가 응답) |
  | OXSubject(/ox/p1) | 특종보험/보증보험/연금저축 | 63/8/10 | 63/8/10 (무변경, 정합) |

- 콘솔: 새로 발생한 에러/경고 없음

## 5. 향후 적용 범위 — 지금 범위에 포함하지 않은 것

이번 작업은 OX 서비스의 기존 중복 3곳을 공용 모듈로 정리하는 데 한정했다. 서비스A/B(선택형 랜덤풀이)·모의고사·미니/맞춤모의고사는 현재 이런 형태의 "누적 N" 화면 카운터를 아직 갖고 있지 않아(버그가 보고된 적 없음) 이번에 손대지 않았다. **다만 앞으로 이들 서비스에 유사한 누적 표시가 필요해지면, 새로 쿼리를 작성하지 않고 `ledgerStatsService`에 `studyMode`만 바꿔 호출하는 것이 표준 절차다** — 이 원칙은 파일 상단 주석과 본 문서로 고정한다.

## 6. 커밋

- 신규: `src/services/ledgerStatsService.js`
- 수정: `src/services/oxService.js`, `src/pages/OXSubject.jsx`, `src/pages/OXHome.jsx`
- 로컬 커밋만 수행, origin push는 조대표 승인 후 진행
