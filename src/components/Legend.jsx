import { CENTER_COLORS } from "../utils/colorPalette";

const CENTER_NAMES = {
  9001: "자양", 9002: "휘경", 9003: "중부", 9004: "구의", 9005: "금호",
  9006: "면목", 9007: "행당", 9009: "중화", 9010: "제기", 9011: "삼선",
  9012: "중곡", 9013: "신내", 9014: "종로", 9016: "용산", 9018: "장안",
  9019: "상봉", 9020: "성수", 9021: "정릉", 9022: "서부",
};

export default function Legend() {
  return (
    <div className="p-3 overflow-y-auto h-full">
      <h2 className="font-bold text-base mb-2">현재 19개 센터</h2>
      <div className="text-xs text-gray-500 mb-3">
        행정동을 클릭하면 상세 정보가 표시됩니다.
      </div>
      <ul className="space-y-1">
        {Object.entries(CENTER_COLORS).map(([code, color]) => (
          <li key={code} className="flex items-center text-sm">
            <span
              className="inline-block w-4 h-4 mr-2 border border-gray-400"
              style={{ backgroundColor: color }}
            />
            <span className="font-mono">{code}</span>
            <span className="ml-2">{CENTER_NAMES[code]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
