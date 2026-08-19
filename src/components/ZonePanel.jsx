import { useMemo } from "react";
import useAppStore, { ZONE_COLORS } from "../store/useAppStore";
import { calculateZoneStats, getZoneLabel } from "../utils/zoneCalculator";
import {
  calculateZoneStatsV2,
  getZoneLabelV2,
} from "../utils/zoneCalculatorV2";
import { useAdjacencyMap } from "../utils/dataLoader";
import { useV2Data } from "../utils/dataLoaderV2";
import { checkAdjacency, checkDowntown } from "../utils/validator";
import { exportZonesCSV } from "../utils/scenarioManager";
import CenterAllocationCard from "./CenterAllocationCard";


export default function ZonePanel({ geoData }) {
  const appMode = useAppStore((s) => s.appMode);
  const zoneCount = useAppStore((s) => s.zoneCount);
  const dongAssignments = useAppStore((s) => s.dongAssignments);
  const weights = useAppStore((s) => s.weights);
  const meterGradeWeights = useAppStore((s) => s.meterGradeWeights);
  const targetMin = useAppStore((s) => s.targetMin);
  const targetMax = useAppStore((s) => s.targetMax);
  const v2TargetMin = useAppStore((s) => s.v2TargetMin);
  const v2TargetMax = useAppStore((s) => s.v2TargetMax);

  // 입주예정 + 법적인원 관련
  const moveInData = useAppStore((s) => s.moveInData);
  const selectedMoveInYears = useAppStore((s) => s.selectedMoveInYears);
  const unitTimes = useAppStore((s) => s.unitTimes);
  const staffingMode = useAppStore((s) => s.staffingMode);
  const showStaffing = useAppStore((s) => s.showStaffing);

  const adjacencyMap = useAdjacencyMap();
  const { metersByGrade, splitInfo } = useV2Data();

  const isV2 = appMode === "v2";

  // V1/V2 분기 계산 (입주예정 + 법적인원 옵션 전달)
  const { zones, unassigned } = useMemo(() => {
    const commonOpts = {
      moveInData,
      selectedMoveInYears,
    };
    if (isV2) {
      if (!metersByGrade) return { zones: {}, unassigned: null };
      return calculateZoneStatsV2(
        metersByGrade,
        splitInfo,
        dongAssignments,
        zoneCount,
        meterGradeWeights,
        { ...commonOpts, unitTimes, staffingMode }
      );
    }
    if (!geoData) return { zones: {}, unassigned: null };
    return calculateZoneStats(
      geoData.features,
      dongAssignments,
      zoneCount,
      weights,
      commonOpts
    );
  }, [
    isV2,
    geoData,
    metersByGrade,
    splitInfo,
    dongAssignments,
    zoneCount,
    weights,
    meterGradeWeights,
    moveInData,
    selectedMoveInYears,
    unitTimes,
    staffingMode,
  ]);

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

  const getZoneScore = (z) => (isV2 ? z.난이도점수 : z.합계);
  const getZoneTotal = (z) => (isV2 ? z.총수용가수 : z.합계);
  const currentTargetMin = isV2 ? v2TargetMin : targetMin;
  const currentTargetMax = isV2 ? v2TargetMax : targetMax;
  const labelFn = isV2 ? getZoneLabelV2 : getZoneLabel;

  const totalHouseholds = zoneList.reduce((s, z) => s + getZoneTotal(z), 0);
  const totalMoveIn = zoneList.reduce(
    (s, z) => s + (z.입주예정합산 ?? 0),
    0
  );
  const totalLegal = zoneList.reduce((s, z) => s + (z.법적인원 ?? 0), 0);
  const totalOffice = zoneList.reduce(
    (s, z) => s + (z.사무행정인원 ?? 0),
    0
  );

  const activeZones = zoneList.filter((z) => getZoneScore(z) > 0);
  const mean =
    activeZones.length > 0
      ? activeZones.reduce((s, z) => s + getZoneScore(z), 0) /
        activeZones.length
      : 0;
  const stdDev =
    activeZones.length > 0
      ? Math.sqrt(
          activeZones.reduce(
            (s, z) => s + (getZoneScore(z) - mean) ** 2,
            0
          ) / activeZones.length
        )
      : 0;

  const statusBadge = (score) => {
    if (score === 0) return <span className="text-gray-400">—</span>;
    if (score < currentTargetMin)
      return <span className="text-orange-600 font-bold">⚠ 미달</span>;
    if (score > currentTargetMax)
      return <span className="text-red-600 font-bold">⚠ 초과</span>;
    return <span className="text-green-600 font-bold">✓ 충족</span>;
  };

  const topGrades = (z) => {
    if (!z.등급별합계) return null;
    return Object.entries(z.등급별합계)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([g, c]) => `${g}: ${c.toLocaleString()}`)
      .join(" / ");
  };

  const totalDongCount = isV2
    ? metersByGrade
      ? Object.keys(metersByGrade).length
      : 0
    : geoData?.features?.length ?? 0;

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full text-sm">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-base">
          📊 권역 현황
          {isV2 && (
            <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
              V2
            </span>
          )}
        </h2>
        <button
          onClick={() => exportZonesCSV(zones, labelFn)}
          className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700"
          title="권역 결과를 CSV로 내보내기"
        >
          ⬇ CSV
        </button>
      </div>

      <div className="bg-gray-100 rounded p-2 text-xs space-y-1">
        <div>
          할당: {totalAssigned} / {totalDongCount} 동
        </div>
        <div>
          {isV2 ? "총 수용가수" : "총 세대수"}:{" "}
          {totalHouseholds.toLocaleString()}
          {totalMoveIn > 0 && (
            <span className="ml-1 text-amber-700 font-semibold">
              (입주예정 +{totalMoveIn.toLocaleString()})
            </span>
          )}
        </div>
        <div>
          {isV2 ? "난이도점수 " : ""}평균:{" "}
          {Math.round(mean).toLocaleString()} / 표준편차:{" "}
          {Math.round(stdDev).toLocaleString()}
        </div>
        <div className="text-gray-600">
          목표 범위 ({isV2 ? "난이도점수" : "세대수"}):{" "}
          {currentTargetMin.toLocaleString()} ~{" "}
          {currentTargetMax.toLocaleString()}
        </div>
        {showStaffing && (totalLegal > 0 || totalOffice > 0) && (
          <div className="pt-1 mt-1 border-t border-gray-300 text-sky-800 font-semibold">
            👷 법적점검원: {totalLegal}명 / 사무행정: {totalOffice}명 / 총{" "}
            {totalLegal + totalOffice}명
          </div>
        )}
        {selectedMoveInYears.length > 0 && (
          <div className="text-[11px] text-amber-700">
            🏗️ 입주예정 반영: {selectedMoveInYears.join(", ")}
          </div>
        )}
      </div>

      {zoneList.map((z) => {
        const adj = adjIssues[z.zone] || { isolatedDongs: [], components: 0 };
        const dt = downtownWarnings[z.zone] || { count: 0, isWarning: false };
        const score = getZoneScore(z);
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
                <span className="ml-2 text-xs text-gray-600">{labelFn(z)}</span>
              </div>
              {statusBadge(score)}
            </div>
            <div className="text-xs space-y-0.5">
              <div>
                행정동: {z.dongCount}개
                {!isV2 && z.도심권개수 > 0 && (
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
                {isV2 && z.분할동수 > 0 && (
                  <span className="ml-1 text-amber-700 font-semibold">
                    (분할동 {z.분할동수})
                  </span>
                )}
              </div>

              {isV2 ? (
                <>
                  <div className="font-semibold">
                    수용가수: {(z.총수용가수 ?? 0).toLocaleString()}
                    {z.입주예정합산 > 0 && (
                      <span className="ml-1 text-amber-700 text-[11px]">
                        (입주 +{z.입주예정합산.toLocaleString()})
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-amber-800">
                    난이도점수: {z.난이도점수.toLocaleString()}
                  </div>
                  {topGrades(z) && (
                    <div className="text-gray-500 text-[10px]">
                      상위등급 {topGrades(z)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    단독: {z.단독.toLocaleString()} / 공동:{" "}
                    {z.공동.toLocaleString()} / 영업: {z.영업.toLocaleString()}
                  </div>
                  <div className="font-semibold">
                    합계: {z.합계.toLocaleString()} 세대
                    {z.입주예정합산 > 0 && (
                      <span className="ml-1 text-amber-700 text-[11px]">
                        (입주 +{z.입주예정합산.toLocaleString()})
                      </span>
                    )}
                  </div>
                  <div>
                    난이도점수: {Math.round(z.난이도점수).toLocaleString()}
                  </div>
                </>
              )}

              <div>상담원수: {z.상담원수.toFixed(2)}명</div>

              {/* 법적인원 표시 (V1/V2 공통) */}
              {showStaffing && (z.법적인원 > 0 || z.사무행정인원 > 0) && (
                <div className="mt-1 pt-1 border-t border-sky-100 bg-sky-50 -mx-2 px-2 pb-1">
                  <div className="text-sky-900 font-semibold text-[11px]">
                    👷 인원 산출
                    {isV2 && (
                      <span className="ml-1 text-[10px] font-normal text-sky-600">
                        ({staffingMode === "precise" ? "정밀" : "간이"})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-sky-800 flex flex-wrap gap-x-2">
                    <span>법적점검원: <b>{z.법적인원 ?? 0}명</b></span>
                    <span>사무행정: <b>{z.사무행정인원 ?? 0}명</b></span>
                    <span className="text-sky-900 font-bold">
                      총 {(z.법적인원 ?? 0) + (z.사무행정인원 ?? 0)}명
                    </span>
                  </div>
                  {!isV2 && (z.법적단독 > 0 || z.법적공동 > 0 || z.법적영업 > 0) && (
                    <div className="text-[10px] text-sky-700">
                      단독 {z.법적단독}명 / 공동 {z.법적공동}명 / 영업{" "}
                      {z.법적영업}명
                    </div>
                  )}
                  {isV2 && staffingMode === "precise" && z.작업시간합계 > 0 && (
                    <div className="text-[10px] text-sky-700">
                      연간 작업시간: {Math.round(z.작업시간합계 / 60).toLocaleString()}시간
                    </div>
                  )}
                </div>
              )}

              {/* 센터장 배치 추천 (V1에서만, 또는 항상) */}
              {!isV2 && <CenterAllocationCard zone={z} />}


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
            {unassigned.dongCount}개 동 /{" "}
            {isV2
              ? `수용가 ${unassigned.총수용가수.toLocaleString()} / 난이도점수 ${unassigned.난이도점수.toLocaleString()}`
              : `합계 ${unassigned.합계.toLocaleString()} 세대`}
          </div>
          {showStaffing && unassigned.법적인원 > 0 && (
            <div className="text-[11px] text-sky-700 mt-1">
              👷 법적점검원: {unassigned.법적인원}명 / 사무행정:{" "}
              {unassigned.사무행정인원}명
            </div>
          )}
        </div>
      )}
    </div>
  );
}
