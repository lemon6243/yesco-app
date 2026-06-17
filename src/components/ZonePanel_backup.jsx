import { useMemo } from "react";
import useAppStore, { ZONE_COLORS } from "../store/useAppStore";
import { calculateZoneStats, getZoneLabel } from "../utils/zoneCalculator";
import { useAdjacencyMap } from "../utils/dataLoader";
import { checkAdjacency, checkDowntown } from "../utils/validator";
import { exportZonesCSV } from "../utils/scenarioManager";

export default function ZonePanel({ geoData }) {
  const zoneCount = useAppStore((s) => s.zoneCount);
  const dongAssignments = useAppStore((s) => s.dongAssignments);
  const weights = useAppStore((s) => s.weights);
  const targetMin = useAppStore((s) => s.targetMin);
  const targetMax = useAppStore((s) => s.targetMax);

  const adjacencyMap = useAdjacencyMap();

  const { zones, unassigned } = useMemo(() => {
    if (!geoData) return { zones: {}, unassigned: null };
    return calculateZoneStats(
      geoData.features,
      dongAssignments,
      zoneCount,
      weights
    );
  }, [geoData, dongAssignments, zoneCount, weights]);

  const adjIssues = useMemo(
    () => checkAdjacency(dongAssignments, adjacencyMap, zoneCount),
    [dongAssignments, adjacencyMap, zoneCount]
  );

  const downtownWarnings = useMemo(() => {
    if (!geoData) return {};
    return checkDowntown(geoData.features, dongAssignments, zoneCount, 2);
  }, [geoData, dongAssignments, zoneCount]);

  const zoneList = Object.values(zones);
  const totalAssigned = zoneList.reduce((s, z) => s + z.dongCount, 0);
  const totalHouseholds = zoneList.reduce((s, z) => s + z.합계, 0);

  // 표준편차 계산 (활성 권역만)
  const activeZones = zoneList.filter((z) => z.합계 > 0);
  const mean =
    activeZones.length > 0
      ? activeZones.reduce((s, z) => s + z.합계, 0) / activeZones.length
      : 0;
  const stdDev =
    activeZones.length > 0
      ? Math.sqrt(
          activeZones.reduce((s, z) => s + (z.합계 - mean) ** 2, 0) /
            activeZones.length
        )
      : 0;

  const statusBadge = (total) => {
    if (total === 0) return <span className="text-gray-400">—</span>;
    if (total < targetMin)
      return <span className="text-orange-600 font-bold">⚠ 미달</span>;
    if (total > targetMax)
      return <span className="text-red-600 font-bold">⚠ 초과</span>;
    return <span className="text-green-600 font-bold">✓ 충족</span>;
  };

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full text-sm">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-base">📊 권역 현황</h2>
        <button
          onClick={() => exportZonesCSV(zones, getZoneLabel)}
          className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700"
          title="권역 결과를 CSV로 내보내기"
        >
          ⬇ CSV
        </button>
      </div>

      <div className="bg-gray-100 rounded p-2 text-xs space-y-1">
        <div>
          할당: {totalAssigned} / {geoData?.features?.length ?? 0} 동
        </div>
        <div>총 세대수: {totalHouseholds.toLocaleString()}</div>
        <div>
          평균: {Math.round(mean).toLocaleString()} / 표준편차:{" "}
          {Math.round(stdDev).toLocaleString()}
        </div>
        <div className="text-gray-600">
          목표 범위: {targetMin.toLocaleString()} ~ {targetMax.toLocaleString()}
        </div>
      </div>

      {zoneList.map((z) => {
        const adj = adjIssues[z.zone] || { isolatedDongs: [], components: 0 };
        const dt = downtownWarnings[z.zone] || { count: 0, isWarning: false };
        return (
          <div
            key={z.zone}
            className="border rounded p-2 bg-white"
            style={{
              borderLeftColor: ZONE_COLORS[(z.zone - 1) % ZONE_COLORS.length],
              borderLeftWidth: 4,
            }}
          >
            <div className="flex justify-between items-center mb-1">
              <div className="font-bold">
                권역 {z.zone}
                <span className="ml-2 text-xs text-gray-600">
                  {getZoneLabel(z)}
                </span>
              </div>
              {statusBadge(z.합계)}
            </div>
            <div className="text-xs space-y-0.5">
              <div>
                행정동: {z.dongCount}개
                {z.도심권개수 > 0 && (
                  <span
                    className={`ml-1 ${
                      dt.isWarning
                        ? "text-red-600 font-bold"
                        : "text-purple-600"
                    }`}
                  >
                    (도심 {z.도심권개수}
                    {dt.isWarning ? " ⚠" : ""})
                  </span>
                )}
              </div>
              <div>
                단독: {z.단독.toLocaleString()} / 공동: {z.공동.toLocaleString()}{" "}
                / 영업: {z.영업.toLocaleString()}
              </div>
              <div className="font-semibold">
                합계: {z.합계.toLocaleString()} 세대
              </div>
              <div>난이도점수: {Math.round(z.난이도점수).toLocaleString()}</div>
              <div>상담원수: {z.상담원수.toFixed(2)}명</div>
              {adj.components > 1 && (
                <div className="text-red-600 font-semibold mt-1">
                  ⚠ 인접성 위반: {adj.components}개 그룹 (고립{" "}
                  {adj.isolatedDongs.length}개)
                  <div className="text-xs font-normal text-red-500">
                    {adj.isolatedDongs.slice(0, 4).join(", ")}
                    {adj.isolatedDongs.length > 4 ? " 등" : ""}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {unassigned && unassigned.dongCount > 0 && (
        <div className="border-2 border-dashed border-gray-400 rounded p-2 bg-white">
          <div className="font-bold text-gray-700 mb-1">미할당</div>
          <div className="text-xs">
            {unassigned.dongCount}개 동 / 합계{" "}
            {unassigned.합계.toLocaleString()} 세대
          </div>
        </div>
      )}
    </div>
  );
}
