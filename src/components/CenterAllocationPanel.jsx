// src/components/CenterAllocationCard.jsx
import { getColorByCenter } from "../utils/colorPalette";
import { getCenterName, formatCenter } from "../utils/centerNames";

/**
 * 한 권역의 센터장 배치 추천 + 센터별 세대수 비율 표시
 * props: zone (calculateZoneStats가 만든 zone 객체)
 */
export default function CenterAllocationCard({ zone }) {
  const 구성 = zone.센터구성 ?? [];
  if (구성.length === 0) return null;

  return (
    <div className="mt-1 pt-1 border-t border-gray-100">
      {/* 배치 추천 */}
      <div className="text-[11px] font-semibold text-indigo-800 mb-1">
        👤 센터장 배치 추천:{" "}
        <span className="text-indigo-900">
          {formatCenter(zone.추천센터장)}
        </span>
        <span className="ml-1 text-indigo-500 font-normal">
          ({(zone.추천비율 * 100).toFixed(1)}% 편입)
        </span>
      </div>

      {/* 비율 스택 막대 */}
      <div className="flex h-3 w-full rounded overflow-hidden mb-1">
        {구성.map((c) => (
          <div
            key={c.code}
            style={{
              width: `${c.비율 * 100}%`,
              backgroundColor: getColorByCenter(Number(c.code)),
            }}
            title={`${formatCenter(c.code)}: ${c.세대수.toLocaleString()}세대 (${(
              c.비율 * 100
            ).toFixed(1)}%)`}
          />
        ))}
      </div>

      {/* 센터별 상세 리스트 */}
      <div className="space-y-0.5">
        {구성.map((c, i) => (
          <div
            key={c.code}
            className="flex items-center justify-between text-[10px]"
          >
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-sm"
                style={{ backgroundColor: getColorByCenter(Number(c.code)) }}
              />
              {i === 0 && <span className="text-indigo-600">★</span>}
              {c.code} {getCenterName(c.code)}
            </span>
            <span className="text-gray-600">
              {c.세대수.toLocaleString()}세대 · {(c.비율 * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
