# GEPv30-011 Phase1승인 미로그인문제풀이차단 구현보고서

## 1. 문서 목적

이 문서는 Phase 1 서비스 시나리오 승인 후 대표님이 추가 지시한 미로그인 문제풀이 차단 정책의 구현 결과를 기록한다.

## 2. 승인 및 지시 사항

2026년 8월 5일 대표님은 Phase 1 서비스 시나리오를 승인했다.

추가 지시 사항은 다음과 같다.

1. 사용자가 로그인하지 않으면 문제풀이가 되지 않도록 한다.
2. 로그인하지 않고 문제풀이를 하려고 하면 팝업창으로 등록을 요구한다.

## 3. 적용 정책

V3.0 1단계의 문제풀이 관련 화면은 로그인 사용자에게만 허용한다.

미로그인 사용자가 문제풀이 관련 URL에 접근하면 실제 풀이 화면을 렌더링하지 않고 등록/로그인 요구 팝업을 표시한다.

이 정책은 홈 버튼 클릭뿐 아니라 직접 URL 입력에도 적용한다.

## 4. 구현 방식

라우트 보호 컴포넌트 `RequireLogin`을 추가했다.

`RequireLogin`은 현재 인증 상태를 확인하여 다음과 같이 동작한다.

1. `authStatus !== 'guest'`이면 원래 화면을 표시한다.
2. `authStatus === 'guest'`이면 원래 화면을 표시하지 않는다.
3. 대신 등록 필요 팝업을 표시한다.
4. 팝업에서 등록/로그인 버튼 또는 홈으로 돌아가기 버튼을 제공한다.

## 5. 변경 파일

변경 파일은 다음과 같다.

1. `GEPv1.1-source/src/components/RequireLogin.jsx`
2. `GEPv1.1-source/src/components/LoginButton.jsx`
3. `GEPv1.1-source/src/App.jsx`

## 6. 보호 대상 라우트

다음 라우트를 보호 대상으로 지정했다.

1. `/question`
2. `/result`
3. `/wrong-review`
4. `/ox`
5. `/ox/:subjectKey`
6. `/ox/:subjectKey/:subSubject`
7. `/ox/:subjectKey/:subSubject/review`
8. `/mock`
9. `/mock/:round/:part`
10. `/mock/:round/:part/result`
11. `/mock/:round/result`
12. `/mock/:round/break`
13. `/mock/stats`
14. `/custom-mock`
15. `/custom-mock/:sessionId/part1`
16. `/custom-mock/:sessionId/part2`
17. `/custom-mock/:sessionId/result`
18. `/custom-mock/stats`
19. `/unified-wrong`
20. `/unified-wrong/challenge/:minCount`
21. `/unified-wrong/result`
22. `/unified-wrong/progress`

홈 화면 `/`은 보호하지 않는다. 사용자는 홈에서 서비스 구조를 볼 수 있지만, 문제풀이로 진입하려면 등록/로그인이 필요하다.

## 7. 팝업 문구

미로그인 접근 시 표시되는 핵심 문구는 다음과 같다.

1. 제목: `등록이 필요합니다`
2. 안내: `문제풀이와 카운팅은 로그인한 사용자에게만 제공됩니다. 등록 후 승인된 사용자의 풀이 기록만 누적됩니다.`
3. 버튼: `등록 / 로그인`
4. 보조 버튼: `홈으로 돌아가기`

## 8. 검증 결과

다음 명령으로 빌드를 검증했다.

```powershell
npm run build
```

결과는 성공이다.

확인 내용은 다음과 같다.

1. Vite 빌드 성공
2. 변환 모듈 수: 142개
3. 생성 파일: `dist/index.html`, CSS, JS 번들
4. 기존과 동일하게 JS 번들 500kB 초과 경고 존재

이 경고는 이번 구현으로 새로 발생한 기능 오류는 아니며, 향후 배포 전 성능 점검 항목으로 유지한다.

## 9. 레드팀 점검

### 9.1 홈 버튼 우회

홈에서 문제풀이 버튼을 누르면 보호 라우트로 이동하고 등록 요구 팝업이 표시된다.

판단: 통과

### 9.2 직접 URL 입력 우회

사용자가 `/question`, `/ox`, `/mock`, `/custom-mock`, `/unified-wrong` 등 문제풀이 관련 주소를 직접 입력해도 `RequireLogin`이 먼저 동작한다.

판단: 통과

### 9.3 카운팅 오염 방지

미로그인 사용자는 실제 풀이 화면에 진입하지 못하므로 답안 제출 이벤트를 만들 수 없다.

판단: 통과

### 9.4 남은 위험

현재 구현은 로그인 여부를 기준으로 한다. 대표님이 요구한 최종 정책인 실명, 전화번호, 운영자 승인 기반 카운팅은 Phase 2와 Phase 3에서 추가로 구현해야 한다.

즉, 이번 구현은 미로그인 차단까지이며, `approved` 상태 기반 접근 제어는 다음 단계에서 완성한다.

## 10. 결론

Phase 1 승인 후 첫 번째 정책 반영으로 미로그인 문제풀이 차단을 구현했다.

현재 상태에서는 로그인하지 않은 사용자가 문제풀이 화면에 진입할 수 없으며, 등록/로그인을 요구하는 팝업이 표시된다.

다음 단계는 Phase 2 데이터와 카운팅 계약 확정이다. Phase 2에서는 `approved` 상태, 답안 제출 원장, 초기화 기준 시점, 반복 오답 계산 기준을 확정한다.
