CLAUDE.md를 먼저 읽고 현재 세션의 작업 내용으로 GEP 문서를 생성하세요.

## 작업: GEP 작업 문서 자동 생성

### 절차

1. **다음 GEP 번호 산정**
   ```
   docs/ 디렉토리의 GEP_XXX_*.md 파일 목록을 스캔하여
   현재 최대 번호 + 1을 다음 번호로 사용
   ```

2. **작업명 결정**
   현재 세션에서 수행한 작업을 2~6자 한글로 요약
   예: 통계연동, 스키마구축, round오염방지, 탭추가

3. **문서 생성**
   파일 경로: `docs/GEP_XXX_작업명.md`

   아래 양식으로 작성:
   ```markdown
   # GEP_XXX_작업명

   **작업일시:** YYYY.MM.DD
   **작업자:** 고팀장 (Claude Code)

   ## 작업 내용
   [무엇을 왜 했는지 — 2~4줄]

   ## 수정 파일
   | 파일 | 변경 내용 |
   |------|----------|
   | 파일명 | 변경 내용 |

   ## 변경 전/후
   [핵심 코드 before/after — 코드블록 포함]

   ## 배포 결과
   - 빌드: ✅ 성공 (XX modules, XXX kB)
   - 배포: git push origin main 완료
   - URL: https://gepv11.vercel.app
   - 비고: [특이사항]
   ```

4. **문서 커밋**
   ```
   git add docs/GEP_XXX_작업명.md
   git commit -m "docs: GEP_XXX 작업명 문서화"
   git push origin main
   ```

### 주의사항
- 민감정보(URL 제외 API 키 등) 문서에 포함 금지
- 코드 스니펫은 핵심 변경사항만 (전체 파일 X)
- 번호 중복 확인 필수 (기존 docs 스캔)
