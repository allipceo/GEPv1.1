# GEP_023_statsStore기반작업

**작업일시:** 2026.02.21
**작업자:** 고팀장 (Claude Code)

---

## 작업 내용

Phase 2 통계 기능의 기반 레이어를 구축했다.
examStore.js와 완전히 분리된 독립 저장소(`gep_stats_v1`)와 Zustand 스토어를 신규 생성.
기존 파일은 일체 수정하지 않았다.

---

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/utils/statsStorage.js` | 신규 생성 — localStorage `gep_stats_v1` 읽기/쓰기 유틸리티 |
| `src/stores/statsStore.js` | 신규 생성 — Zustand 통계 스토어 |
| `scripts/test-stats.mjs` | 신규 생성 — 단위 테스트 (Node.js 실행) |

---

## 스키마 (v1.0)

`localStorage['gep_stats_v1']` 저장 구조:

```json
{
  "version":   "1.0",
  "total":     { "solved": 0, "correct": 0 },
  "daily":     { "2026-02-21": { "solved": 10, "correct": 7 } },
  "bySubject": { "법령": { "solved": 10, "correct": 7 } },
  "byRound":   { "23": { "solved": 10, "correct": 7 } }
}
```

---

## statsStorage.js API

| 함수 | 역할 |
|------|------|
| `loadStats()` | localStorage → 스키마 객체 반환 (없거나 버전 불일치 시 기본값) |
| `saveStats(stats)` | 스키마 객체 → localStorage 저장 |
| `clearStats()` | localStorage에서 `gep_stats_v1` 키 삭제 |
| `todayKey()` | 오늘 날짜 `"YYYY-MM-DD"` 문자열 반환 |
| `STATS_KEY` | `'gep_stats_v1'` 상수 |

---

## statsStore.js API

| 액션/상태 | 역할 |
|----------|------|
| `stats` | 현재 통계 객체 (앱 시작 시 localStorage 자동 복원) |
| `updateStats({ subject, round, solved, correct })` | total / daily / bySubject / byRound 누적 후 저장 |
| `resetStats()` | localStorage 삭제 + 기본값으로 상태 초기화 |
| `getTodayStats()` | 오늘 날짜 `{ solved, correct }` 반환 (미존재 시 0) |

---

## 단위 테스트 결과

`node scripts/test-stats.mjs` 실행:

| 번호 | 케이스 | 결과 |
|------|--------|------|
| 1 | updateStats → total 누적 | ✅ |
| 2 | localStorage['gep_stats_v1'] 저장 확인 | ✅ |
| 3 | bySubject 누적 | ✅ |
| 4 | byRound 누적 | ✅ |
| 5 | getTodayStats | ✅ |
| 6 | 2번 연속 호출 시 누적 | ✅ |
| 7 | resetStats → 초기화 및 localStorage 키 삭제 | ✅ |

**총 16 케이스 전원 통과 / 0 실패**

---

## 변경 전/후

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 통계 저장소 | 없음 | `gep_stats_v1` (독립 키) |
| 통계 스토어 | 없음 | `statsStore.js` (examStore.js 무관) |
| 테스트 | 없음 | `scripts/test-stats.mjs` (16개 케이스) |

---

## 배포 결과

- 빌드: ✅ 성공 (53 modules, 243.60 kB)
- 배포: git push origin main (자동 배포)
- URL: https://gepv11.vercel.app
- 비고: 통계 UI 연동은 Phase 2 후속 작업 (GEP_024+)에서 진행

---

## 설계 원칙 준수

- examStore.js 수정 없음 ✅
- 기존 파일 수정 없음 ✅
- localStorage 키 분리 (`gep_stats_v1` ≠ `gep:v1:examStore`) ✅
- statsStore.js는 statsStorage.js만 사용 (의존성 단방향) ✅
