/**
 * scripts/fix-subject-by-part-number.js
 * 노션 DB 과목 일괄 치환 스크립트
 *
 * 부별문항번호 기준 과목 재세팅:
 *   1~40  → 법령
 *   41~80 → 손보1부
 *   81~120 → 손보2부
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config();

const token = process.env.NOTION_TOKEN;
const dbId  = process.env.NOTION_DB_ID;

if (!token || !dbId) {
  console.error('❌ .env에 NOTION_TOKEN 또는 NOTION_DB_ID가 없습니다.');
  process.exit(1);
}

const notion = new Client({ auth: token });

// 부별문항번호 → 과목 매핑
function getSubject(partNum) {
  if (partNum >= 1  && partNum <= 40)  return '법령';
  if (partNum >= 41 && partNum <= 80)  return '손보1부';
  if (partNum >= 81 && partNum <= 120) return '손보2부';
  return null; // 범위 밖
}

// 200ms 딜레이
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // 1. data_source_id 동적 조회 (databases.retrieve → data_sources[0].id)
  const db = await notion.databases.retrieve({ database_id: dbId });
  const dataSourceId = db.data_sources?.[0]?.id;
  if (!dataSourceId) {
    console.error('❌ data_source_id를 가져오지 못했습니다. DB 공유 설정을 확인하세요.');
    process.exit(1);
  }

  console.log(`✅ DB 연결: ${db.title?.[0]?.plain_text || '(no title)'}`);
  console.log(`   data_source_id 확인 완료\n`);

  // 2. 전체 레코드 조회 (페이지네이션)
  const allPages = [];
  let cursor = undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    allPages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  console.log(`📋 스캔 대상: ${allPages.length}건\n`);

  // 3. 업데이트 처리
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let errors  = 0;
  let firstError = null;

  for (const page of allPages) {
    scanned++;
    const props     = page.properties || {};
    const pageId    = page.id;

    // 부별문항번호 (number 타입)
    const partNum   = props['부별문항번호']?.number;
    // 현재 과목 값 (select 타입)
    const curSubject = props['과목']?.select?.name ?? null;

    // 범위 밖이거나 부별문항번호 없으면 skip
    const targetSubject = (partNum != null) ? getSubject(partNum) : null;
    if (!targetSubject) {
      skipped++;
      if (scanned % 100 === 0) {
        console.log(`  진행: ${scanned}/${allPages.length} (updated=${updated}, skipped=${skipped}, errors=${errors})`);
      }
      continue;
    }

    // 이미 올바른 값이면 skip
    if (curSubject === targetSubject) {
      skipped++;
      if (scanned % 100 === 0) {
        console.log(`  진행: ${scanned}/${allPages.length} (updated=${updated}, skipped=${skipped}, errors=${errors})`);
      }
      continue;
    }

    // 업데이트 시도
    try {
      await notion.pages.update({
        page_id: pageId,
        properties: {
          '과목': {
            select: { name: targetSubject },
          },
        },
      });
      updated++;
      await delay(200);
    } catch (err) {
      errors++;
      if (!firstError) {
        firstError = { pageId, message: err.message?.substring(0, 200) };
      }
    }

    if (scanned % 100 === 0) {
      console.log(`  진행: ${scanned}/${allPages.length} (updated=${updated}, skipped=${skipped}, errors=${errors})`);
    }
  }

  // 4. 최종 보고
  console.log('\n========== 완료 보고 ==========');
  console.log(`scanned : ${scanned}`);
  console.log(`updated : ${updated}`);
  console.log(`skipped : ${skipped}`);
  console.log(`errors  : ${errors}`);
  if (firstError) {
    console.log(`\n첫 번째 에러:`);
    console.log(`  page_id : ${firstError.pageId}`);
    console.log(`  message : ${firstError.message}`);
  }
  console.log('================================');
}

main().catch(err => {
  console.error('❌ 치명적 오류:', err.message?.substring(0, 200));
  process.exit(1);
});
