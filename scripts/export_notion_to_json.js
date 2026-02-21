/**
 * scripts/export_notion_to_json.js
 * 노션 DB → public/data/exams.json 변환 스크립트
 *
 * - 문제+보기는 파싱/분리 없이 원문 그대로 questionRaw에 저장
 * - 조회: databases.retrieve → dataSources.query 2-step 방식
 * - rate limit: 딜레이 없음, 429 발생 시 500~1000ms backoff 재시도 (최대 3회)
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'public', 'data', 'exams.json');
const EXPECTED_TOTAL = 1080;

const token = process.env.NOTION_TOKEN;
const dbId  = process.env.NOTION_DB_ID;

if (!token || !dbId) {
  console.error('❌ .env에 NOTION_TOKEN 또는 NOTION_DB_ID가 없습니다.');
  process.exit(1);
}

const notion = new Client({ auth: token });

// ── 유틸 ──────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** 429 rate limit 대응 재시도 래퍼 */
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.code === 'rate_limited' || err.status === 429;
      if (is429 && attempt < maxRetries) {
        const wait = 500 + Math.random() * 500; // 500~1000ms
        console.warn(`  ⚠️  rate_limited, ${Math.round(wait)}ms 후 재시도 (${attempt + 1}/${maxRetries})`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
}

/** rich_text 배열 → 원문 문자열 (파싱 없이 join) */
function richTextToRaw(richTextArr) {
  if (!Array.isArray(richTextArr) || richTextArr.length === 0) return '';
  const joined = richTextArr.map(t => t.plain_text ?? '').join('');
  return joined
    .replace(/\r\n/g, '\n')   // CRLF → LF
    .replace(/\r/g, '\n')      // 남은 CR → LF
    .replace(/<br\s*\/?>/gi, '\n')  // <br>, <br/> → \n
    .trim();
}

/** subjects 우선순위 정렬: 법령→손보1부→손보2부 우선, 나머지는 사전순 */
const SUBJECT_ORDER = ['법령', '손보1부', '손보2부'];
function sortSubjects(arr) {
  return [...arr].sort((a, b) => {
    const ia = SUBJECT_ORDER.indexOf(a);
    const ib = SUBJECT_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'ko');
  });
}

/** ORIG_ID에서 숫자 추출 (예: "ORIG_0481" → 481) */
function origIdToNum(origId) {
  const m = String(origId || '').match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

// ── 메인 ──────────────────────────────────────────────

async function main() {
  // Step 1: databases.retrieve → data_source_id 획득
  const db = await withRetry(() =>
    notion.databases.retrieve({ database_id: dbId })
  );
  const dataSourceId = db.data_sources?.[0]?.id;
  if (!dataSourceId) {
    console.error('❌ data_source_id를 가져오지 못했습니다. DB 공유 설정을 확인하세요.');
    process.exit(1);
  }
  console.log(`✅ DB 연결: ${db.title?.[0]?.plain_text ?? '(no title)'}`);

  // Step 2: 전체 레코드 조회 (페이지네이션)
  console.log('📥 데이터 조회 중...');
  const allPages = [];
  let cursor = undefined;
  do {
    const res = await withRetry(() =>
      notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: cursor,
        page_size: 100,
      })
    );
    allPages.push(...res.results);
    process.stdout.write(`\r   조회: ${allPages.length}건`);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  console.log(`\n   완료: ${allPages.length}건`);

  // Step 3: 데이터 변환
  console.log('🔄 변환 중...');
  const questions = allPages.map(page => {
    const p = page.properties ?? {};

    const id         = richTextToRaw(p['IBEX_ID (유일키)']?.rich_text ?? []);
    const origId     = (p['ORIG_ID']?.title?.[0]?.plain_text ?? '').trim();
    const round      = p['회차']?.number ?? null;
    const subject    = p['과목']?.select?.name ?? '';
    const subSubject = p['세부과목']?.select?.name ?? '';
    const partNumber = p['부별문항번호']?.number ?? null;
    const roundNumber = p['회차누적번호']?.number ?? null;
    const questionRaw = richTextToRaw(p['문제+보기']?.rich_text ?? []);
    const answer     = p['정답']?.number ?? null;
    const keyword    = richTextToRaw(p['키워드']?.rich_text ?? []);

    return { id, origId, round, subject, subSubject, partNumber, roundNumber, questionRaw, answer, keyword };
  });

  // Step 4: 정렬 (회차 오름차순 → 회차누적번호 오름차순, fallback: ORIG_ID 숫자)
  questions.sort((a, b) => {
    if (a.round !== b.round) return (a.round ?? 0) - (b.round ?? 0);
    const an = a.roundNumber ?? origIdToNum(a.origId);
    const bn = b.roundNumber ?? origIdToNum(b.origId);
    return an - bn;
  });

  // Step 5: 메타데이터 추출 (Set → 정렬)
  const roundSet      = new Set();
  const subjectSet    = new Set();
  const subSubjectSet = new Set();
  questions.forEach(q => {
    if (q.round != null)    roundSet.add(q.round);
    if (q.subject)          subjectSet.add(q.subject);
    if (q.subSubject)       subSubjectSet.add(q.subSubject);
  });

  const rounds      = [...roundSet].sort((a, b) => a - b);
  const subjects    = sortSubjects([...subjectSet]);
  const subSubjects = [...subSubjectSet].sort((a, b) => a.localeCompare(b, 'ko'));

  // Step 6: JSON 생성
  const output = {
    version:    '1.0',
    totalCount: questions.length,
    rounds,
    subjects,
    subSubjects,
    questions,
  };

  // Step 7: 파일 저장
  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  const fileSizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);

  // ── 완료 보고 ──────────────────────────────────────

  console.log('\n========== 완료 보고 ==========');

  // 총 변환 건수
  const countMatch = questions.length === EXPECTED_TOTAL ? '✅ 일치' : `⚠️  불일치 (expected=${EXPECTED_TOTAL})`;
  console.log(`총 변환 건수  : ${questions.length}건 ${countMatch}`);

  // 회차별 건수
  console.log('\n회차별 건수:');
  rounds.forEach(r => {
    const cnt = questions.filter(q => q.round === r).length;
    console.log(`  ${r}회: ${cnt}건`);
  });

  // 파일 크기
  console.log(`\nexams.json 크기: ${fileSizeKB} KB`);

  // questionRaw 빈 문자열
  const emptyRaw = questions.filter(q => !q.questionRaw);
  console.log(`\nquestionRaw 빈 건수: ${emptyRaw.length}건`);
  if (emptyRaw.length > 0) {
    emptyRaw.slice(0, 3).forEach(q => console.log(`  ⚠️  id=${q.id || q.origId}`));
  }

  // answer 범위 밖
  const badAnswer = questions.filter(q => q.answer == null || q.answer < 1 || q.answer > 4);
  console.log(`answer 범위 밖: ${badAnswer.length}건`);
  if (badAnswer.length > 0) {
    badAnswer.slice(0, 3).forEach(q => console.log(`  ⚠️  id=${q.id || q.origId}, answer=${q.answer}`));
  }

  // ① 없는 건수 (참고용)
  const noCircle = questions.filter(q => !q.questionRaw.includes('①'));
  console.log(`\n① 없는 건수 (참고용): ${noCircle.length}건`);

  // 추출된 메타데이터
  console.log(`\nrounds      : ${rounds.join(', ')}`);
  console.log(`subjects    : ${subjects.join(', ')}`);
  console.log(`subSubjects : ${subSubjects.join(', ')}`);

  // 샘플 1건
  if (questions.length > 0) {
    const s = questions[0];
    console.log('\n샘플 1건:');
    console.log(JSON.stringify({
      ...s,
      questionRaw: s.questionRaw.substring(0, 30) + (s.questionRaw.length > 30 ? '...' : ''),
    }, null, 2));
  }

  console.log('\n================================');
  console.log(`✅ 저장 완료: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('❌ 치명적 오류:', err.message?.substring(0, 300));
  process.exit(1);
});
