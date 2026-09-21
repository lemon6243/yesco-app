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
import CenterAllocationCard from "./CenterAllocationPanel";




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
  const selectedZone = useAppStore((s) => s.selectedZone);
  const setSelectedZone = useAppStore((s) => s.setSelectedZone);
  const setFocusedZone = useAppStore((s) => s.setFocusedZone);
  const isZoneConfirmed = useAppStore((s) => s.isZoneConfirmed);
  const toggleZoneConfirmed = useAppStore((s) => s.toggleZoneConfirmed);

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
          className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 cursor-pointer"
          title="권역 결과를 CSV로 내보내기"
        >
          ⬇ CSV
        </button>
      </div>

      {/* 권역 확정 제어 배너 */}
      <div
        className={`p-2.5 rounded-lg border transition shadow-sm ${
          isZoneConfirmed
            ? "bg-emerald-50 border-emerald-300 text-emerald-950"
            : "bg-slate-50 border-slate-300 text-slate-800"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="font-bold flex items-center gap-1.5 text-xs">
            <span>{isZoneConfirmed ? "🔒" : "✏️"}</span>
            <span>{isZoneConfirmed ? "권역 확정 완료" : "권역 배정 시뮬레이션 중"}</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/70 border border-gray-200">
            {totalAssigned} / {totalDongCount}동 (
            {totalDongCount > 0
              ? Math.round((totalAssigned / totalDongCount) * 100)
              : 0}
            %)
          </span>
        </div>
        <p className="text-[11px] text-gray-600 mb-2 leading-relaxed">
          {isZoneConfirmed
            ? "지도에 1~" +
              zoneCount +
              " 권역 통합 라벨이 표시 중입니다. 지도의 권역 라벨을 클릭하거나 아래 목록에서 권역을 선택할 수 있습니다."
            : "배정 완료 후 '권역 확정'을 누르면 지도에 권역별 통합 라벨링(1~" +
              zoneCount +
              "권역)이 크게 표시됩니다."}
        </p>
        <button
          onClick={toggleZoneConfirmed}
          className={`w-full py-1.5 px-3 rounded font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer ${
            isZoneConfirmed
              ? "bg-slate-700 hover:bg-slate-800 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {isZoneConfirmed
            ? "🔓 권역 확정 해제 (수정 모드)"
            : "🔒 현재 배정안 권역 확정 (지도 라벨 표시)"}
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
        const isCurrentSelected = selectedZone === z.zone;
        return (
          <div
            key={z.zone}
            onClick={() => setSelectedZone(z.zone)}
            className={`border rounded p-2 bg-white transition cursor-pointer ${
              isCurrentSelected
                ? "ring-2 ring-blue-500 shadow-md bg-blue-50/20"
                : "hover:border-gray-400"
            }`}
            style={{
              borderLeftColor: ZONE_COLORS[(z.zone - 1) % ZONE_COLORS.length],
              borderLeftWidth: 5,
            }}
          >
            <div className="flex justify-between items-center mb-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>권역 {z.zone}</span>
                <span className="text-xs text-gray-600 font-normal">{labelFn(z)}</span>
                {isCurrentSelected && (
                  <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-bold">
                    선택
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedZone(z.zone);
                    setFocusedZone(z.zone);
                  }}
                  className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 rounded border border-gray-300 font-medium cursor-pointer"
                  title="지도에서 이 권역으로 이동"
                >
                  🔍 지도
                </button>
                {statusBadge(score)}
              </div>
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
                  {(z.단독 > 0 || z.공동 > 0 || z.영업 > 0) && (
                    <div className="text-gray-600">
                      단독: {(z.단독 ?? 0).toLocaleString()} / 공동:{" "}
                      {(z.공동 ?? 0).toLocaleString()} / 영업:{" "}
                      {(z.영업 ?? 0).toLocaleString()}
                    </div>
                  )}
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

              <div className="text-gray-600">
                사무행정(분산형 콜센터): <span className="font-semibold text-gray-800">{z.상담원수.toFixed(2)}명</span>
              </div>

              {/* 법적인원 표시 (V1/V2 공통) */}
              {showStaffing && (z.법적인원 > 0 || z.사무행정인원 > 0) && (
                <div className="mt-1 pt-1 border-t border-sky-100 bg-sky-50 -mx-2 px-2 pb-1">
                  <div className="text-sky-900 font-semibold text-[11px] flex justify-between">
                    <span>
                      👷 인원 산출
                      {isV2 && (
                        <span className="ml-1 text-[10px] font-normal text-sky-600">
                          ({staffingMode === "precise" ? "정밀" : "간이"})
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-normal text-sky-600">
                      단독 3천 · 공동 4천 · 영업 3천 · 사무 2.4만 기준
                    </span>
                  </div>
                  <div className="text-[11px] text-sky-800 flex flex-wrap gap-x-2">
                    <span>법적점검원: <b>{z.법적인원 ?? 0}명</b></span>
                    <span>사무행정: <b>{z.사무행정인원 ?? 0}명</b></span>
                    <span className="text-sky-900 font-bold">
                      총 {(z.법적인원 ?? 0) + (z.사무행정인원 ?? 0)}명
                    </span>
                  </div>
                  {(!isV2 || staffingMode === "simple") &&
                    (z.법적단독 > 0 || z.법적공동 > 0 || z.법적영업 > 0) && (
                      <div className="text-[10px] text-sky-700">
                        단독 {z.법적단독}명 (3천) / 공동 {z.법적공동}명 (4천) / 영업{" "}
                        {z.법적영업}명 (3천)
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
