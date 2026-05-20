// 19개 기존 센터별 고유 색상 (Step 4-1: 현재 센터 색상 표시용)
export const CENTER_COLORS = {
  9001: "#e6194B", // 자양
  9002: "#3cb44b", // 휘경
  9003: "#ffe119", // 중부
  9004: "#4363d8", // 구의
  9005: "#f58231", // 금호
  9006: "#911eb4", // 면목
  9007: "#42d4f4", // 행당
  9009: "#f032e6", // 중화
  9010: "#bfef45", // 제기
  9011: "#fabed4", // 삼선
  9012: "#469990", // 중곡
  9013: "#dcbeff", // 신내
  9014: "#9A6324", // 종로
  9016: "#fffac8", // 용산
  9018: "#800000", // 장안
  9019: "#aaffc3", // 상봉
  9020: "#808000", // 성수
  9021: "#ffd8b1", // 정릉
  9022: "#000075", // 서부
};

// 메인 센터번호 추출 (운영센터가 "9001+9004"처럼 복합인 경우 첫 번째 사용)
export function getMainCenter(props) {
  const main = props.주센터번호 ?? props.주센터 ?? null;
  if (main) return Number(main);
  const ops = props.운영센터 ?? "";
  const first = String(ops).split(/[+,]/)[0].trim();
  return first ? Number(first) : null;
}

export function getColorByCenter(centerNum) {
  return CENTER_COLORS[centerNum] || "#cccccc";
}
