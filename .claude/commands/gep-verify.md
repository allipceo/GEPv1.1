현재 세션에서 수정한 로직을 Node.js 검증 스크립트로 작성하고 실행하세요.

## 작업: 코드 레벨 검증 스크립트 생성 + 실행

### 원칙
- 브라우저 없이 Node.js만으로 검증
- localStorage, Zustand, React 없이 핵심 로직만 인라인 시뮬레이션
- 시나리오별 ✅ PASS / ❌ FAIL 명확히 출력

### 절차

1. **검증 대상 파악**
   현재 세션에서 수정된 핵심 로직 확인
   (handleAnswer, updateStats, filter 조건 등)

2. **스크립트 작성**
   파일 경로: `scripts/verify-작업명.mjs`

   스크립트 구조:
   ```js
   // 핵심 로직 인라인 시뮬레이션 (import 없이)
   function 핵심함수(...) { ... }

   // 시나리오별 테스트
   let pass = 0, fail = 0
   function check(label, condition) {
     if (condition) { console.log(`  ✅ PASS | ${label}`); pass++ }
     else           { console.log(`  ❌ FAIL | ${label}`); fail++ }
   }

   // 시나리오 1: 정상 케이스
   console.log('[ 시나리오 1 ] ...')
   // ...테스트...
   check('기대 결과 설명', 실제값 === 기대값)

   // 시나리오 2: 엣지 케이스
   // 시나리오 3: 오류 케이스

   // 최종 결과
   console.log(`=== 결과: ${pass} PASS / ${fail} FAIL ===`)
   process.exit(fail === 0 ? 0 : 1)
   ```

3. **실행**
   ```
   node scripts/verify-작업명.mjs
   ```

4. **결과 보고**
   - 전체 PASS: "✅ GEP_XXX 검증 완료"
   - FAIL 존재: 실패 항목 분석 후 코드 수정 → 재실행

### 필수 검증 시나리오 유형

| 유형 | 내용 |
|------|------|
| 정상 케이스 | 일반적인 입력 → 기대 출력 |
| 엣지 케이스 | 경계값, null, undefined, 빈 배열 |
| 오류 차단 | 잘못된 입력 → 기록 skip 확인 |
| 기존 동작 유지 | 변경 전과 동일한 결과 보장 |

### 주의사항
- React hook, Zustand, localStorage 직접 사용 불가 → 인라인 시뮬레이션
- 외부 API 호출 없이 순수 로직만 검증
- 스크립트는 검증 후 docs와 함께 커밋 (재사용 가능)
