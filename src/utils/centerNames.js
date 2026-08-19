// src/utils/centerNames.js
export const CENTER_NAMES = {
  9001: "자양", 9002: "휘경", 9003: "중부", 9004: "구의", 9005: "금호",
  9006: "면목", 9007: "행당", 9009: "중화", 9010: "제기", 9011: "삼선",
  9012: "중곡", 9013: "신내", 9014: "종로", 9016: "용산", 9018: "장안",
  9019: "상봉", 9020: "성수", 9021: "정릉", 9022: "서부",
};

export function getCenterName(code) {
  return CENTER_NAMES[Number(code)] || String(code);
}

// "9001" 또는 "9001 자양"처럼 표시
export function formatCenter(code) {
  const name = CENTER_NAMES[Number(code)];
  return name ? `${code} ${name}` : String(code);
}
