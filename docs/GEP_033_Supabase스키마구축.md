# GEP_033_Supabase스키마구축

**작업일시:** 2026.02.22
**작업자:** 고팀장 (Claude Code)

## 작업 내용

GEP_032_STEP2 — Supabase 스키마 구축.
8개 테이블 DDL + RLS + 인덱스 정의, Supabase 클라이언트 초기화.

## 수정/생성 파일

| 파일 | 변경 내용 |
|------|----------|
| `supabase/schema.sql` | 8개 테이블 + RLS + 인덱스 정의 |
| `src/lib/supabase.js` | Supabase 클라이언트 싱글톤 |
| `.env.local` | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (gitignore 적용) |
| `package.json` | @supabase/supabase-js 추가 |

## 테이블 구조

| 순번 | 테이블 | 역할 |
|------|--------|------|
| 1 | `users` | 사용자 원장 (service_level, status) |
| 2 | `oauth_accounts` | OAuth 로그인 연동 |
| 3 | `sessions` | refresh token 관리 |
| 4 | `devices` | 기기 정보 |
| 5 | `subscriptions` | 구독 상태 |
| 6 | `attempts` | 핵심 원장 — 문제 풀이 기록 |
| 7 | `question_stats` | 집계 캐시 (조회 성능) |
| 8 | `progress` | 이어풀기 진도 저장 |

## RLS 정책

| 테이블 | 정책 | 조건 |
|--------|------|------|
| users | users_self | auth.uid() = user_id |
| attempts | attempts_self | auth.uid() = user_id |
| question_stats | qstats_self | auth.uid() = user_id |
| progress | progress_self | auth.uid() = user_id |

## supabase.js 코드

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## SQL 실행 방법 (조대표님 직접 수행 필요)

DDL 실행은 Supabase 대시보드에서 수행:
1. https://supabase.com/dashboard/project/rwqecsgzhknutnhppqgb 접속
2. 좌측 메뉴 **SQL Editor** 클릭
3. `supabase/schema.sql` 전체 내용 붙여넣기
4. **Run** 버튼 클릭
5. 좌측 **Table Editor**에서 8개 테이블 확인

## 배포 결과

- 빌드: ✅ 성공 (60 modules, 253.21 kB)
- 배포: git push origin main 완료
- URL: https://gepv11.vercel.app
- 비고: .env.local gitignore 적용 확인, schema.sql GitHub 커밋 완료
