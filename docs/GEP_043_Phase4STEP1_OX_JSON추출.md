# GEP_043_Phase4STEP1_OX_JSON추출

**작업일시:** 2026.02.28
**작업자:** 고팀장 (Claude Code)

## 작업 내용

Phase 4 STEP 1 — Notion OX SSOT DB(`⭕ GEPv1.1_OXdb_V1.0(23-31)`)에서 조건에 맞는 OX 문항을 추출하여 과목별 JSON 3파일 생성.

**추출 조건:**
- `조대표_선택 = YES`
- `generation_status = OK`

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/data/ox_law.json` | 법령 OX 문항 775개 생성 (신규) |
| `src/data/ox_p1.json` | 손보1부 OX 문항 623개 생성 (신규) |
| `src/data/ox_p2.json` | 손보2부 OX 문항 571개 생성 (신규) |
| `scripts/gep040_step1_extract.cjs` | Notion 추출 스크립트 (임시) |

## 변경 전/후

**Before:** `src/data/` 디렉토리 없음

**After:** 과목별 JSON 3파일 생성 완료
```
src/data/
  ox_law.json   775개 (352 KB)
  ox_p1.json    623개 (275 KB)
  ox_p2.json    571개 (264 KB)
```

## JSON 스키마 (7개 필드 고정)
```json
{
  "ox_id":            "IBEX_23_031_T3_S12_111#C1",
  "source_ibex_id":   "IBEX_23_031_T3_S12_111",
  "statement_display": "…",
  "ox_result":        "O",
  "subject":          "손보2부",
  "round":            23,
  "choice_no":        1
}
```

## OK 비율 리포트

### [ox_law.json] — 법령
| 항목 | 수치 |
|------|------|
| 전체 레코드 수 | 1,280 |
| 조대표_선택=YES | 1,274 |
| generation_status=OK | 776 |
| **최종 탑재 문항 수** | **775** |

세부과목별 분포: 보험업법 155개 / 상법보험편 498개 / 위험관리론 35개 / 세제및재무설계 87개

### [ox_p1.json] — 손보1부
| 항목 | 수치 |
|------|------|
| 전체 레코드 수 | 1,220 |
| 조대표_선택=YES | 1,219 |
| generation_status=OK | 623 |
| **최종 탑재 문항 수** | **623** |

세부과목별 분포: 자동차보험 291개 / 특종보험 169개 / 보증보험 56개 / 개인연금저축성 107개

### [ox_p2.json] — 손보2부
| 항목 | 수치 |
|------|------|
| 전체 레코드 수 | 1,340 |
| 조대표_선택=YES | 1,330 |
| generation_status=OK | 573 |
| **최종 탑재 문항 수** | **571** |

세부과목별 분포: 화재보험 168개 / 해상보험 158개 / 항공우주 67개 / 재보험 145개

## 기술 메모

- Notion DB 총 4,321개 레코드 조회 (44페이지 페이지네이션)
- 과목 정보: 마스터 JSON(`OX3_003_ExamBank_Master_V1.3.json`) ORIGINAL 레코드에서 IBEX_ID 기준 lookup
  - 과목 약어 정규화: `1부` → `손보1부`, `2부` → `손보2부`
- 481개 미매칭: SOURCE_IBEX_ID가 마스터 23-31회 범위 밖 (정상)
- `ox_result` 필드: Notion 원본값 그대로 사용 (재계산 금지 원칙 준수)

## 완료 조건 체크리스트

- [x] 3개 JSON 파일 생성 완료
- [x] 각 파일 스키마 7개 필드 준수 확인
- [x] OK 비율 리포트 작성 완료
- [x] `npm run build` 빌드 성공 ✅

## 배포 결과

- 빌드: ✅ 성공 (vite v7.3.1, 5.95s)
- URL: https://gepv11.vercel.app
- 비고: Phase4 STEP1 데이터 추출 완료. STEP2(앱 연동) 대기 중
