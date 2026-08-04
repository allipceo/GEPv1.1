# GEPv30-003 GEPv1.1 현재 작동 저장소 점검보고서

## 1. 점검 목적

조대표님께서 제시한 GitHub 저장소 `allipceo/GEPv1.1`이 현재 배포되어 작동 중인 GEP 앱의 실제 원천 파일인지 확인하기 위해 점검하였다.

- GitHub 저장소: https://github.com/allipceo/GEPv1.1
- 배포 앱: https://gepv11.vercel.app/
- 점검일: 2026년 8월 4일
- 로컬 점검 복제 경로: `C:\dev\GEPv3.0\GEPv1.1-source`

## 2. 결론

**`allipceo/GEPv1.1` 저장소가 현재 작동 중인 GEP 앱의 원천 저장소로 판단된다.**

판단 근거는 다음과 같다.

1. 배포 앱에서 확인한 화면과 저장소의 `src/pages/Home.jsx`, `src/App.jsx` 라우팅 구조가 일치한다.
2. 배포 앱의 객관식 데이터 수와 저장소의 `public/data/exams.json` 데이터 수가 일치한다.
3. 배포 앱의 OX 데이터 수와 저장소의 `public/data/ox_law.json`, `ox_p1.json`, `ox_p2.json` 데이터 수가 일치한다.
4. 저장소의 Vite 프로덕션 빌드가 성공한다.
5. 저장소에 `vercel.json`이 있으며, 배포 앱도 Vite/Vercel 정적 배포 구조를 사용한다.
6. 배포 앱의 CSS 번들명이 로컬 빌드 결과와 동일했다.

## 3. 저장소 기본 정보

### 3.1 브랜치

확인된 브랜치는 다음과 같다.

1. `main`

### 3.2 최근 커밋

최근 커밋 흐름은 2026년 3월까지 이어져 있다.

주요 최근 커밋은 다음과 같다.

1. `329fdae` docs: GEP_125 완료 문서 업데이트
2. `1ddd72d` fix: GEP_125 SQL 오류 수정, `ox_attempts` 제거
3. `5cd99f1` feat: Phase 7 Supabase 마이그레이션 SQL 추가
4. `4f727d4` fix: 31회 subject 데이터 오류 수정
5. `fa45ff3` fix: MockExamHome 레벨 게이트 버그 수정
6. `77294bb` fix: 전체 레벨 게이트 임시 해제
7. `f7ed396` fix: Home 모의고사 버튼 추가

이 커밋 흐름은 현재 배포 앱에서 확인한 모의고사, 맞춤 모의고사, OX, 통합 오답 기능과 직접 연결된다.

## 4. 기술 스택

`package.json` 기준 기술 스택은 다음과 같다.

1. Vite
2. React 19
3. React Router DOM 7
4. Zustand
5. Supabase JS
6. Tailwind CSS 4
7. Vercel 정적 배포

주요 스크립트는 다음과 같다.

```json
{
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

## 5. 핵심 실행 파일 구조

현재 작동 앱의 핵심 파일은 다음과 같다.

### 5.1 앱 진입 및 라우팅

1. `index.html`
2. `src/main.jsx`
3. `src/App.jsx`

`src/App.jsx`에는 다음 라우트가 포함되어 있다.

1. `/`
2. `/question`
3. `/result`
4. `/wrong-review`
5. `/ox`
6. `/ox/:subjectKey`
7. `/ox/:subjectKey/:subSubject`
8. `/mock`
9. `/mock/:round/:part`
10. `/mock/:round/result`
11. `/custom-mock`
12. `/custom-mock/:sessionId/part1`
13. `/custom-mock/:sessionId/part2`
14. `/unified-wrong`
15. `/unified-wrong/challenge/:minCount`
16. `/unified-wrong/progress`

### 5.2 주요 화면

1. `src/pages/Home.jsx`
2. `src/pages/Question.jsx`
3. `src/pages/OXHome.jsx`
4. `src/pages/OXSubject.jsx`
5. `src/pages/OXQuiz.jsx`
6. `src/pages/MockExamHome.jsx`
7. `src/pages/MockExamQuiz.jsx`
8. `src/pages/MockExamResult.jsx`
9. `src/pages/CustomMockHome.jsx`
10. `src/pages/CustomMockQuiz.jsx`
11. `src/pages/CustomMockResult.jsx`
12. `src/pages/UnifiedWrongReview.jsx`
13. `src/pages/ChallengeMode.jsx`
14. `src/pages/ProgressTracker.jsx`

### 5.3 상태 관리

1. `src/stores/examStore.js`
2. `src/stores/authStore.js`
3. `src/stores/statsStore.js`
4. `src/stores/oxStore.js`
5. `src/stores/mockExamStore.js`
6. `src/stores/customMockStore.js`

### 5.4 서비스 로직

1. `src/services/statsService.js`
2. `src/services/oxService.js`
3. `src/services/mockExamService.js`
4. `src/services/customMockService.js`
5. `src/services/unifiedWrongService.js`
6. `src/services/advancedStatsService.js`

### 5.5 설정 파일

1. `src/config/featureFlags.js`
2. `src/config/mockExamConfig.js`
3. `src/config/customMockConfig.js`
4. `src/config/oxSubjects.js`
5. `src/constants/subjects.js`

## 6. 데이터 파일 검증

### 6.1 객관식 기출 데이터

파일: `public/data/exams.json`

저장소 데이터와 배포 데이터가 일치했다.

1. version: `1.0`
2. totalCount: `1080`
3. 실제 questions 수: `1080`
4. 회차: `23, 24, 25, 26, 27, 28, 29, 30, 31`
5. 회차별 문항 수: 각 120문항
6. 대과목별 문항 수:
   - 법령: 360
   - 손보1부: 360
   - 손보2부: 360

세부과목별 문항 수는 다음과 같다.

1. 보험업법: 90
2. 상법: 180
3. 위험관리: 45
4. 세제재무: 45
5. 자동차보험: 135
6. 특종보험: 90
7. 보증보험: 45
8. 연금저축: 90
9. 화재보험: 90
10. 해상보험: 135
11. 항공우주: 45
12. 재보험: 90

### 6.2 OX 진위형 데이터

저장소 데이터와 배포 데이터가 일치했다.

1. `public/data/ox_law.json`: 1,274문항
2. `public/data/ox_p1.json`: 1,220문항
3. `public/data/ox_p2.json`: 1,330문항
4. 합계: 3,824문항

홈 화면에 표시되는 `3,824문제`와 일치한다.

## 7. 배포 구조 검증

### 7.1 Vercel 설정

파일: `vercel.json`

내용은 다음과 같다.

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

React Router 기반 SPA 배포를 위한 정상적인 Vercel rewrite 설정이다.

### 7.2 PWA 설정

파일: `public/manifest.json`

확인된 앱 정보는 다음과 같다.

1. name: `GEP 보험중개사`
2. short_name: `GEP`
3. description: `보험중개사 시험 준비 앱`
4. display: `standalone`
5. orientation: `portrait`
6. theme_color: `#2563EB`

`public/sw.js`도 존재하여 PWA/캐시 구조가 포함되어 있다.

### 7.3 배포 앱 index 확인

배포 앱 `https://gepv11.vercel.app/`의 `index.html`에서 다음 내용을 확인했다.

1. title: `GEP 보험중개사`
2. manifest: `/manifest.json`
3. module script: `/assets/index-...js`
4. stylesheet: `/assets/index-CTr-S_6S.css`

로컬 빌드 결과의 CSS 번들명도 `index-CTr-S_6S.css`로 동일했다.

## 8. 로컬 빌드 검증

로컬 경로 `C:\dev\GEPv3.0\GEPv1.1-source`에서 다음 명령을 실행했다.

```bash
npm install
npm run build
```

결과:

1. 의존성 설치 성공
2. Vite 프로덕션 빌드 성공
3. 변환 모듈: 141개
4. 빌드 시간: 약 26초
5. 산출물:
   - `dist/index.html`
   - `dist/assets/index-CTr-S_6S.css`
   - `dist/assets/index-*.js`

빌드 경고:

1. JS 번들이 500kB를 초과한다.
2. Vite가 코드 스플리팅 또는 manualChunks 검토를 권고했다.

## 9. 환경변수 및 Supabase

Supabase 클라이언트 파일:

`src/lib/supabase.js`

필요한 환경변수는 다음과 같다.

1. `VITE_SUPABASE_URL`
2. `VITE_SUPABASE_ANON_KEY`

`.gitignore`에서 `.env`, `.env.local`, `.env.*.local`, `.vercel`은 제외되어 있다.

따라서 로컬에서 로그인, 회원 통계, Supabase 저장 기능까지 완전히 재현하려면 별도 환경변수를 복원해야 한다.

Supabase 관련 파일은 다음과 같다.

1. `supabase/schema.sql`
2. `supabase/migrations/mock_exam_tables.sql`
3. `supabase/migrations/006_custom_mock_tables.sql`
4. `supabase/migrations/phase7_tables.sql`

## 10. 서비스 레벨 상태

`src/config/featureFlags.js` 기준 현재 기능 게이트는 다음과 같다.

1. 통계: 레벨 2 이상
2. 틀린문제: 레벨 3 이상
3. OX: 레벨 1 이상
4. 모의고사: 레벨 1 이상
5. 맞춤 모의고사: 레벨 1 이상
6. 고급 통계: 레벨 3 이상

주의할 점:

1. `MOCKEXAM_MIN_LEVEL`과 `CUSTOMMOCK_MIN_LEVEL`은 Phase 6 테스트 목적으로 레벨 1로 임시 해제되어 있다.
2. 코드 주석에는 Phase 7에서 레벨 정책을 재설계 후 재적용하라는 TODO가 있다.

V3.0에서는 유료 서비스 구조를 다시 잡기 전에 이 임시 해제 상태를 정책적으로 확정해야 한다.

## 11. 보안 및 유지보수 점검

`npm audit --audit-level=moderate` 결과 14개 취약점이 보고되었다.

요약:

1. low: 2
2. moderate: 1
3. high: 11

주요 패키지:

1. `@babel/core`
2. `ajv`
3. `brace-expansion`
4. `esbuild`
5. `flatted`
6. `js-yaml`
7. `minimatch`
8. `picomatch`
9. `postcss`
10. `react-router`
11. `react-router-dom`
12. `rollup`
13. `vite`
14. `ws`

권고:

1. V3.0 착수 전 별도 브랜치에서 `npm audit fix` 적용 가능성을 검토한다.
2. React Router, Vite, Rollup 업데이트는 앱 라우팅과 빌드에 영향이 있을 수 있으므로 반드시 빌드와 주요 화면 수동 테스트를 병행한다.
3. 보안 업데이트는 기능 개발과 분리해 먼저 처리하는 것이 좋다.

## 12. 정리 대상

저장소에는 실행 앱과 직접 관련 없는 자료도 함께 들어 있다.

정리 검토 대상:

1. 루트의 대용량 오디오 파일 `빗썸_직원_오타가_만든_60조_유령_비트코인.m4a`
2. 다수의 과거 문서, PDF, PPTX, DOCX, GDOC
3. 검증 스크립트 중 완료된 과거 단계 전용 파일
4. 중복 또는 과거 버전 개발 문서

주의:

정리 대상이라고 해서 즉시 삭제하면 안 된다. V3.0에서는 실행 앱 원천, 데이터 원천, 개발 이력 문서, 폐기 가능 자료를 분류한 뒤 이동 또는 보관 정책을 먼저 정해야 한다.

## 13. V3.0에 반영할 결정 사항

GEPv1.1 저장소는 이름은 V1.1이지만, 실제로는 현재 작동하는 V2.0 계열 앱의 원천으로 취급해야 한다.

V3.0 기획에서 다음 사항을 반영한다.

1. 현재 원천 저장소는 `allipceo/GEPv1.1`로 둔다.
2. 현재 앱의 기술 스택은 Vite + React + Zustand + Supabase + Vercel이다.
3. 객관식 데이터 기준은 23회부터 31회까지 총 1,080문항이다.
4. OX 데이터 기준은 총 3,824문항이다.
5. 현재 모의고사와 맞춤 모의고사는 레벨 제한이 임시 해제된 상태다.
6. V3.0 시작 전 환경변수와 Supabase 프로젝트 접근 정보를 복원해야 한다.
7. V3.0 시작 전 보안 업데이트와 대용량/불필요 파일 정리가 필요하다.

## 14. 최종 판정

최종 판정은 다음과 같다.

**`allipceo/GEPv1.1`은 현재 배포되어 작동 중인 `https://gepv11.vercel.app/` 앱의 실제 원천 저장소로 보는 것이 타당하다.**

다음 단계는 이 저장소를 기준으로 V3.0 작업용 브랜치 또는 새 저장소를 만들고, 먼저 다음 4가지를 정리하는 것이다.

1. 환경변수 복원
2. Supabase 스키마 및 실제 DB 상태 확인
3. 보안 취약점 업데이트
4. 실행 파일과 문서/자료 파일 분리
