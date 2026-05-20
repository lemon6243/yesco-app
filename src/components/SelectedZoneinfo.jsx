import { useMemo } from "react";
import useAppStore, { ZONE_COLORS } from "../store/useAppStore";

export default function SelectedZoneInfo({ geoData }) {
  const selectedZone = useAppStore((s) => s.selectedZone);
  const dongAssignments = useAppStore((s) => s.dongAssignments);
  const clearDong = useAppStore((s) => s.clearDong);
  const targetMin = useAppStore((s) => s.targetMin);
  const targetMax = useAppStore((s) => s.targetMax);

  const info = useMemo(() => {
    if (!geoData || !selectedZone) return null;
    const dongs = [];
    let 단독 = 0, 공동 = 0, 영업 = 0, 합계 = 0, 도심 = 0;
    const ops = new Set();

    geoData.features.forEach((f) => {
      const p = f.properties;
      if (dongAssignments[p.행정동] === selectedZone) {
        dongs.push({
          name: p.행정동,
          단독: p.단독 ?? 0,
          공동: p.공동 ?? 0,
          영업: p.영업 ?? 0,
          합계: p.합계 ?? 0,
          도심: !!p.is_downtown,
          운영센터: p.운영센터 ?? p.주센터번호 ?? "-",
        });
        단독 += p.단독 ?? 0;
        공동 += p.공동 ?? 0;
        영업 += p.영업 ?? 0;
        합계 += p.합계 ?? 0;
        if (p.is_downtown) 도심 += 1;
        String(p.운영센터 ?? p.주센터번호 ?? "")
          .split(/[+,]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((o) => ops.add(o));
      }
    });

    // 세대수 많은 순으로 정렬
    dongs.sort((a, b) => b.합계 - a.합계);

    return {
      dongs,
      단독,
      공동,
      영업,
      합계,
      도심,
      운영센터: Array.from(ops).sort(),
    };
  }, [geoData, dongAssignments, selectedZone]);

  if (!info) return null;

  const zoneColor = ZONE_COLORS[(selectedZone - 1) % ZONE_COLORS.length];

  const statusText = (total) => {
    if (total === 0) return { text: "미할당", color: "#9ca3af" };
    if (total < targetMin) return { text: "⚠ 미달", color: "#ea580c" };
    if (total > targetMax) return { text: "⚠ 초과", color: "#dc2626" };
    return { text: "✓ 충족", color: "#16a34a" };
  };
  const st = statusText(info.합계);

  return (
    <div
      className="border rounded p-2 bg-white"
      style={{ borderLeft: `6px solid ${zoneColor}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm">
          <span
            className="inline-block w-3 h-3 mr-1 rounded-sm align-middle"
            style={{ backgroundColor: zoneColor }}
          />
          권역 {selectedZone} 선택됨
        </div>
        <span
          className="text-xs font-bold"
          style={{ color: st.color }}
        >
          {st.text}
        </span>
      </div>

      <div className="text-xs space-y-0.5 mb-2 bg-gray-50 rounded p-1.5">
        <div>
          <b>{info.dongs.length}</b>개 동 / 도심권 {info.도심}개
        </div>
        <div>
          단독 {info.단독.toLocaleString()} · 공동{" "}
          {info.공동.toLocaleString()} · 영업 {info.영업.toLocaleString()}
        </div>
        <div className="font-semibold">
          합계 {info.합계.toLocaleString()} 세대
        </div>
        {info.운영센터.length > 0 && (
          <div>운영센터: {info.운영센터.join("+")}</div>
        )}
      </div>

      {info.dongs.length === 0 ? (
        <div className="text-xs text-gray-500 italic">
          아직 할당된 동이 없습니다. 지도에서 동을 클릭하세요.
        </div>
      ) : (
        <div className="max-h-44 overflow-y-auto border-t pt-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-500 border-b">
                <th className="py-0.5">행정동</th>
                <th className="py-0.5 text-right">세대수</th>
                <th className="py-0.5 w-5"></th>
              </tr>
            </thead>
            <tbody>
              {info.dongs.map((d) => (
                <tr key={d.name} className="border-b last:border-0">
                  <td className="py-0.5">
                    {d.name}
                    {d.도심 && (
                      <span className="ml-1 text-[10px] text-purple-600">
                        도심
                      </span>
                    )}
                  </td>
                  <td className="py-0.5 text-right">
                    {d.합계.toLocaleString()}
                  </td>
                  <td className="py-0.5 text-right">
                    <button
                      onClick={() => clearDong(d.name)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      title="권역에서 제거"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
