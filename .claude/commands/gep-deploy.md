CLAUDE.md를 먼저 읽고 아래 배포 절차를 수행하세요.

## 작업: 빌드 → 커밋 → 배포

### 절차 (순서 엄수)

1. **빌드 확인**
   ```
   npm run build
   ```
   - 성공 시 다음 단계 진행
   - 실패 시 즉시 중단하고 에러 내용 보고

2. **변경 파일 확인**
   ```
   git status
   ```
   - 스테이징할 파일 목록 확인
   - .env, .env.local, .env.*.local 은 절대 포함 금지

3. **커밋**
   - 지정된 파일만 `git add`
   - 커밋 메시지 형식:
     ```
     feat/fix/docs: GEP_XXX 작업명 한줄 요약

     - 변경사항 1
     - 변경사항 2

     Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
     ```
   - 접두어 규칙: feat(신규기능), fix(버그수정), docs(문서), chore(설정)

4. **push**
   ```
   git push origin main
   ```

5. **완료 보고**
   아래 형식으로 출력:
   ```
   빌드: ✅ 성공 (XX modules, XXX kB)
   커밋: [커밋 해시] 커밋 메시지
   배포: git push origin main 완료
   URL: https://gepv11.vercel.app
   ```

### 주의사항
- 빌드 실패 시 커밋하지 않음
- git push --force 절대 금지
- main 브랜치 직접 push (PR 불필요)
