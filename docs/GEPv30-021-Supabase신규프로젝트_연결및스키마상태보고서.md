# GEPv30-021 Supabase 신규 프로젝트 연결 및 스키마 상태보고서

작성일: 2026-08-05
작성자: 채팀장

## 1. 신규 프로젝트

조대표님이 Supabase에 신규 프로젝트 `GEPv3.0`을 생성하였다.

- Project URL: `https://xnmjprtodyonqzsqxxja.supabase.co`
- 로컬 `.env.local`에 신규 Project URL과 publishable key를 반영하였다.
- secret key 및 database password는 앱에 반영하지 않았다.

## 2. 연결 검증

기존에 잘못 읽은 URL `https://xnmrjprtodyonqzsqxxja.supabase.co`는 DNS에서 해석되지 않았다.

조대표님이 제공한 정확한 URL `https://xnmjprtodyonqzsqxxja.supabase.co`는 Supabase 서버에서 응답하였다.

## 3. 빌드 검증

명령:

```powershell
npm run build
```

결과:

- Vite production build 성공
- 147 modules transformed
- 기능 실패 없음
- 번들 크기 경고만 발생

## 4. 테이블 상태

데이터를 읽지 않고 `HEAD` 및 `limit=0` 방식으로 핵심 테이블 존재 여부만 확인하였다.

결과:

| 테이블 | 상태 |
| ------ | ---- |
| users | 404 Not Found |
| attempts | 404 Not Found |
| question_stats | 404 Not Found |
| progress | 404 Not Found |
| reset_events | 404 Not Found |

## 5. 판단

신규 Supabase 프로젝트는 생성 및 접속 가능 상태이나, 아직 GEP 스키마가 적용되지 않았다.

## 6. 다음 조치

Supabase Dashboard의 SQL Editor에서 다음 SQL을 순서대로 실행해야 한다.

1. `supabase/schema.sql`
2. `supabase/migrations/007_v3_pilot_approval.sql`

실행 후 다시 테이블 존재 여부, Google OAuth, 운영자 로그인, 가입 승인, 서비스 A/B 풀이 카운팅을 검증한다.
