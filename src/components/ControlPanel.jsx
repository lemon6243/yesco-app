import { useRef } from "react";
import useAppStore, { ZONE_COLORS, MOVE_IN_YEARS } from "../store/useAppStore";
import { exportScenario, importScenario } from "../utils/scenarioManager";
import { useAdjacencyMap } from "../utils/dataLoader";
import { autoAssignZones } from "../utils/autoAssign";
import SelectedZoneInfo from "./SelectedZoneInfo";


export default function ControlPanel({ geoData }) {
  const fileInputRef = useRef(null);
  const adjacency = useAdjacencyMap();

  const zoneCount = useAppStore((s) => s.zoneCount);
  const setZoneCount = useAppStore((s) => s.setZoneCount);
  const selectedZone = useAppStore((s) => s.selectedZone);
  const setSelectedZone = useAppStore((s) => s.setSelectedZone);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const weights = useAppStore((s) => s.weights);
  const setWeight = useAppStore((s) => s.setWeight);
  const resetAssignments = useAppStore((s) => s.resetAssignments);
  const applyScenario = useAppStore((s) => s.applyScenario);
  const setAllAssignments = useAppStore((s) => s.setAllAssignments);
  const dongAssignments = useAppStore((s) => s.dongAssignments);
  const showLabels = useAppStore((s) => s.showLabels);
  const setShowLabels = useAppStore((s) => s.setShowLabels);
  const labelType = useAppStore((s) => s.labelType);
  const setLabelType = useAppStore((s) => s.setLabelType);

  // 입주예정 토글
  const moveInData = useAppStore((s) => s.moveInData);
  const selectedMoveInYears = useAppStore((s) => s.selectedMoveInYears);
  const toggleMoveInYear = useAppStore((s) => s.toggleMoveInYear);
  const clearMoveInYears = useAppStore((s) => s.clearMoveInYears);
  const setAllMoveInYears = useAppStore((s) => s.setAllMoveInYears);

  // 법적인원 옵션
  const showStaffing = useAppStore((s) => s.showStaffing);
  const setShowStaffing = useAppStore((s) => s.setShowStaffing);
  const staffingMode = useAppStore((s) => s.staffingMode);
  const setStaffingMode = useAppStore((s) => s.setStaffingMode);
  const appMode = useAppStore((s) => s.appMode);

  const handleExport = () => exportScenario(useAppStore.getState());
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importScenario(file);
      applyScenario(data);
      alert("시나리오를 불러왔습니다.");
    } catch (err) {
      alert("시나리오 불러오기 실패: " + err.message);
    }
    e.target.value = "";
  };

  // 자동 배정: 사전 체크
  const canAutoAssign = () => {
    if (!geoData?.features?.length) {
      alert("지도 데이터가 아직 로드되지 않았습니다.");
      return false;
    }
    if (!adjacency || Object.keys(adjacency).length === 0) {
      alert("인접 데이터가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return false;
    }
    return true;
  };

  const handleAutoAssignAll = () => {
    if (!canAutoAssign()) return;
    if (!confirm(
      `${zoneCount}개 권역으로 전체 자동 배정하시겠습니까?\n` +
      `현재 수동 할당은 모두 초기화됩니다.`
    )) return;
    try {
      const result = autoAssignZones(
        geoData.features,
        adjacency,
        zoneCount,
        weights,
        { fixedAssignments: {} }
      );
      setAllAssignments(result);
    } catch (err) {
      alert("자동 배정 실패: " + err.message);
      console.error(err);
    }
  };

  const handleAutoFillRest = () => {
    if (!canAutoAssign()) return;
    const assignedCount = Object.keys(dongAssignments).length;
    if (assignedCount === 0) {
      if (!confirm("현재 수동 할당이 없습니다. 전체 자동 배정과 동일하게 진행할까요?")) return;
    } else {
      if (!confirm(
        `현재 수동 할당된 ${assignedCount}개 동은 그대로 유지하고,\n` +
        `나머지 미할당 동만 자동으로 채웁니다. 진행할까요?`
      )) return;
    }
    try {
      const result = autoAssignZones(
        geoData.features,
        adjacency,
        zoneCount,
        weights,
        { fixedAssignments: dongAssignments }
      );
      setAllAssignments(result);
    } catch (err) {
      alert("자동 배정 실패: " + err.message);
      console.error(err);
    }
  };

  // 입주예정 합계 (선택된 연도 기준)
  const moveInTotal = Object.values(moveInData ?? {}).reduce((sum, entry) => {
    return sum + selectedMoveInYears.reduce((s, y) => s + (entry[y] ?? 0), 0);
  }, 0);
  const moveInDongCount = Object.entries(moveInData ?? {}).filter(([, entry]) =>
    selectedMoveInYears.some((y) => (entry[y] ?? 0) > 0)
  ).length;

  return (
    <div className="p-3 space-y-4 overflow-y-auto h-full text-sm">
      <h2 className="font-bold text-base mb-2">⚙️ 설정</h2>

      {/* 보기 모드 */}
      <section>
        <div className="font-semibold mb-1">보기 모드</div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setViewMode("hybrid")}
            className={`px-1 py-1 rounded border text-xs ${
              viewMode === "hybrid"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-gray-300"
            }`}
            title="할당된 동은 권역 색, 미할당은 원본 센터 색"
          >
            혼합
          </button>
          <button
            onClick={() => setViewMode("zone")}
            className={`px-1 py-1 rounded border text-xs ${
              viewMode === "zone"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-gray-300"
            }`}
            title="권역만 표시"
          >
            권역
          </button>
          <button
            onClick={() => setViewMode("center")}
            className={`px-1 py-1 rounded border text-xs ${
              viewMode === "center"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-gray-300"
            }`}
            title="원본 센터 색만 표시"
          >
            원본
          </button>
        </div>
        <div className="text-[10px] text-gray-500 mt-1">
          {viewMode === "hybrid" && "할당된 동은 권역 색, 미할당은 옅은 센터 색"}
          {viewMode === "zone" && "권역 색만 표시 (미할당은 회색)"}
          {viewMode === "center" && "기존 센터 색만 (참고용)"}
        </div>
      </section>

      {/* 권역 개수 */}
      <section>
        <div className="font-semibold mb-1">권역 개수</div>
        <div className="flex gap-1">
          {[9, 10, 11, 12].map((n) => (
            <button
              key={n}
              onClick={() => setZoneCount(n)}
              className={`flex-1 px-2 py-1 rounded border ${
                zoneCount === n
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white border-gray-300"
              }`}
            >
              {n}개
            </button>
          ))}
        </div>
      </section>

      {/* 자동 배정 */}
      <section className="space-y-1">
        <div className="font-semibold mb-1">🤖 자동 권역 배정</div>
        <button
          onClick={handleAutoAssignAll}
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 font-semibold"
        >
          전체 자동 배정
        </button>
        <button
          onClick={handleAutoFillRest}
          className="w-full bg-purple-400 text-white py-1.5 rounded hover:bg-purple-500 text-xs"
        >
          미할당 동만 자동 채우기
        </button>
        <div className="text-[10px] text-gray-500 mt-1">
          인접성·난이도 균형·도심권 분산 기준으로 배정
        </div>
      </section>

      {/* ───────────────────────────────────────────── */}
      {/* 🏗️ 입주예정 연도 토글 (V1/V2 공통, 신규) */}
      {/* ───────────────────────────────────────────── */}
      <section className="bg-amber-50 border border-amber-200 rounded p-2 space-y-1">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-amber-900">🏗️ 입주예정 반영</div>
          <div className="flex gap-1">
            <button
              onClick={setAllMoveInYears}
              className="text-[10px] px-1.5 py-0.5 bg-amber-200 hover:bg-amber-300 rounded"
              title="모든 연도 선택"
            >
              전체
            </button>
            <button
              onClick={clearMoveInYears}
              className="text-[10px] px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 rounded"
              title="선택 해제"
            >
              해제
            </button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {MOVE_IN_YEARS.map((year) => {
            const isOn = selectedMoveInYears.includes(year);
            return (
              <button
                key={year}
                onClick={() => toggleMoveInYear(year)}
                className={`px-1 py-1 rounded border text-xs font-medium transition ${
                  isOn
                    ? "bg-amber-500 text-white border-amber-600 shadow"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-amber-100"
                }`}
              >
                +{year}
              </button>
            );
          })}
        </div>
        {selectedMoveInYears.length > 0 ? (
          <div className="text-[11px] text-amber-900 mt-1">
            {moveInDongCount}개 동 · +{moveInTotal.toLocaleString()}세대 반영 중
          </div>
        ) : (
          <div className="text-[10px] text-gray-500 mt-1">
            연도를 선택하면 해당 입주 세대수가 누적 반영됩니다
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────── */}
      {/* 👷 법적인원 표시 옵션 (V1/V2 공통, 신규) */}
      {/* ───────────────────────────────────────────── */}
      <section className="bg-sky-50 border border-sky-200 rounded p-2 space-y-1">
        <div className="font-semibold text-sky-900">👷 법적인원 산출</div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showStaffing}
            onChange={(e) => setShowStaffing(e.target.checked)}
          />
          <span>권역 패널에 법적인원 표시</span>
        </label>
        {appMode === "v2" && (
          <div className="space-y-1 pt-1 border-t border-sky-200">
            <div className="text-[10px] text-sky-700 font-medium">
              V2 산출 방식
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setStaffingMode("simple")}
                className={`px-1 py-1 rounded border text-[11px] ${
                  staffingMode === "simple"
                    ? "bg-sky-600 text-white border-sky-700"
                    : "bg-white border-gray-300"
                }`}
                title="세대당 라운드업 (간이)"
              >
                간이
              </button>
              <button
                onClick={() => setStaffingMode("precise")}
                className={`px-1 py-1 rounded border text-[11px] ${
                  staffingMode === "precise"
                    ? "bg-sky-600 text-white border-sky-700"
                    : "bg-white border-gray-300"
                }`}
                title="단위시간 × 작업량 (정밀)"
              >
                정밀
              </button>
            </div>
            <div className="text-[10px] text-gray-600">
              {staffingMode === "simple"
                ? "공동 4000/영업 3000세대당 1명"
                : "센터별 단위시간 × 연간 작업량 / 1인 가용시간"}
            </div>
          </div>
        )}
      </section>

      {/* 현재 선택 권역 */}
      <section>
        <div className="font-semibold mb-1">
          현재 선택 권역
          <span className="text-xs text-gray-500 ml-1">(클릭 시 할당)</span>
        </div>
        <div className="grid grid-cols-5 gap-1 mb-2">
          {Array.from({ length: zoneCount }, (_, i) => i + 1).map((z) => (
            <button
              key={z}
              onClick={() => setSelectedZone(z)}
              className={`px-1 py-2 rounded border text-xs font-bold ${
                selectedZone === z ? "ring-2 ring-black" : ""
              }`}
              style={{
                backgroundColor: ZONE_COLORS[(z - 1) % ZONE_COLORS.length],
                color: "#fff",
                borderColor: "#333",
              }}
            >
              {z}
            </button>
          ))}
        </div>

        {/* 선택된 권역의 동 목록 */}
        <SelectedZoneInfo geoData={geoData} />
      </section>

      {/* 지도 라벨 */}
      <section>
        <div className="font-semibold mb-1">지도 라벨</div>
        <label className="flex items-center gap-2 mb-1">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          <span>라벨 표시 (줌 12 이상)</span>
        </label>
        <select
          value={labelType}
          onChange={(e) => setLabelType(e.target.value)}
          disabled={!showLabels}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs disabled:bg-gray-100"
        >
          <option value="name">동 이름만</option>
          <option value="total">세대수만</option>
          <option value="name_total">동 이름 + 세대수</option>
        </select>
      </section>

      {/* 난이도 가중치 */}
      <section>
        <div className="font-semibold mb-1">난이도 가중치</div>
        {["단독", "공동", "영업"].map((key) => (
          <div key={key} className="flex items-center gap-2 mb-1">
            <label className="w-10">{key}</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={weights[key]}
              onChange={(e) =>
                setWeight(key, parseFloat(e.target.value) || 0)
              }
              className="flex-1 border border-gray-300 rounded px-2 py-1"
            />
          </div>
        ))}
      </section>

      {/* 시나리오 */}
      <section className="space-y-1">
        <div className="font-semibold mb-1">시나리오</div>
        <button
          onClick={handleExport}
          className="w-full bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700"
        >
          💾 시나리오 저장 (JSON)
        </button>
        <button
          onClick={handleImportClick}
          className="w-full bg-gray-700 text-white py-1.5 rounded hover:bg-gray-800"
        >
          📂 시나리오 불러오기
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </section>

      {/* 초기화 */}
      <section>
        <button
          onClick={() => {
            if (confirm("모든 권역 할당을 초기화하시겠습니까?")) {
              resetAssignments();
            }
          }}
          className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
        >
          🗑 모든 할당 초기화
        </button>
      </section>

      <div className="text-xs text-gray-500 border-t pt-2">
        💡 권역 번호 선택 → 동 클릭 → 자동 할당.
        <br />Shift+클릭으로 해제. 🔴 빨간 점선 = 고립된 동.
      </div>
    </div>
  );
}
