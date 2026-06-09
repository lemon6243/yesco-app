import { useRef } from "react";
import useAppStore, { ZONE_COLORS } from "../store/useAppStore";
import { exportScenario, importScenario } from "../utils/scenarioManager";
import SelectedZoneInfo from "./SelectedZoneInfo";

export default function ControlPanel({ geoData }) {
  const fileInputRef = useRef(null);

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
  const showLabels = useAppStore((s) => s.showLabels);
  const setShowLabels = useAppStore((s) => s.setShowLabels);
  const labelType = useAppStore((s) => s.labelType);
  const setLabelType = useAppStore((s) => s.setLabelType);

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
