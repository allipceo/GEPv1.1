/**
 * src/utils/loadExams.js
 * exams.json 로드 유틸
 * - 텍스트 변형 없이 JSON 파싱 + 필수 필드 존재 체크만
 * - 실패 시 throw → store에서 try/catch로 처리
 */

export async function loadExams() {
  const res = await fetch('/data/exams.json');
  if (!res.ok) {
    throw new Error(`exams.json 로드 실패: HTTP ${res.status}`);
  }

  const data = await res.json();

  if (!data.version || !data.totalCount || !Array.isArray(data.questions)) {
    throw new Error('exams.json 필수 필드 누락 (version, totalCount, questions)');
  }

  return data;
}
