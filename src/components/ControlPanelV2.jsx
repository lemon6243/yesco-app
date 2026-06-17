import { useState, useMemo } from "react";
import useAppStore, { DEFAULT_METER_GRADE_WEIGHTS } from "../store/useAppStore";
import { useV2Data } from "../utils/dataLoaderV2";

const GRADES = [
  2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 10.0, 16.0,
  25.0, 40.0, 65.0, 100.0, 160.0, 250.0, 400.0, 650.0, 1000.0, 1600.0,
];

export default function ControlPanelV2() {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const showSplitHatch = useAppStore((s) => s.showSplitHatch);
  const setShowSplitHatch = useAppStore((s) => s.setShowSplitHatch);
  const meterGradeWeights = useAppStore((s) => s.meterGradeWeights);
  const setMeterGradeWeight = useAppStore((s) => s.setMeterGradeWeight);
  const resetMeterGradeWeights = useAppStore((s) => s.resetMeterGradeWeights);

  const { metersByGrade, splitInfo, loading } = useV2Data();
  const [weightsOpen, setWeightsOpen] = useState(false);

  const v2Stats = useMemo(() => {
    if (!metersByGrade || !splitInfo) return null;
    const dongCount = Object.keys(metersByGrade).length;
    const splitCount = Object.values(splitInfo).filter((d) => d.is_split).length;
    const totalConsumers = Object.values(metersByGrade).reduce(
      (sum, d) => sum + (d.total ?? 0),
      0
    );
    return { dongCount, splitCount, totalConsumers };
  }, [metersByGrade, splitInfo]);

  const isV2 = appMode === "v2";

  return (
    <div className="p-3 border-t border-gray-300 bg-blue-50">
      {/* 모드 토글 */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-gray-700 mb-1">
          🔬 시뮬레이션 모드
        </div>
        <div className="flex gap-1 bg-white rounded border border-gray-300 p-0.5">
          <button
            onClick={() => setAppMode("v1")}
            className={`flex-1 px-2 py-1.5 text-xs rounded font-medium transition ${
              !isV2
                ? "bg-blue-600 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            V1 (단독·공동·영업)
          </button>
          <button
            onClick={() => setAppMode("v2")}
            className={`flex-1 px-2 py-1.5 text-xs rounded font-medium transition ${
              isV2
                ? "bg-amber-600 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            ⚡ V2 (계량기 등급)
          </button>
        </div>
        <div className="text-[10px] text-gray-500 mt-1">
          {isV2
            ? "계량기 등급별 가중치로 정밀 계산"
            : "기존 3분류 합계로 단순 계산"}
        </div>
      </div>

      {/* V2 모드 전용 옵션 */}
      {isV2 && (
        <>
          {/* V2 통계 요약 */}
          <div className="mb-3 bg-white rounded border border-amber-300 p-2 text-xs">
            <div className="font-semibold text-amber-900 mb-1">📊 V2 데이터</div>
            {loading ? (
              <div className="text-gray-500">로딩 중...</div>
            ) : v2Stats ? (
              <div className="space-y-0.5 text-gray-700">
                <div>
                  행정동: <b>{v2Stats.dongCount}</b>개
                  <span className="text-amber-700 ml-2">
                    (분할동 {v2Stats.splitCount}개)
                  </span>
                </div>
                <div>
                  총 수용가:{" "}
                  <b>{v2Stats.totalConsumers.toLocaleString()}</b>건
                </div>
              </div>
            ) : (
              <div className="text-red-500">데이터 없음</div>
            )}
          </div>

          {/* 분할동 빗금 표시 */}
          <div className="mb-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showSplitHatch}
                onChange={(e) => setShowSplitHatch(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-medium">분할동 빗금 표시</span>
            </label>
            <div className="text-[10px] text-gray-500 ml-6 mt-0.5">
              한남동, 명동 등 2개 센터 공동 관할 표시
            </div>
          </div>

          {/* 등급별 가중치 (접이식) */}
          <div className="mb-2">
            <button
              onClick={() => setWeightsOpen(!weightsOpen)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 hover:bg-white px-2 py-1.5 rounded"
            >
              <span>⚖️ 등급별 가중치 (18단계)</span>
              <span>{weightsOpen ? "▼" : "▶"}</span>
            </button>

            {weightsOpen && (
              <div className="mt-2 bg-white rounded border border-gray-200 p-2">
                <div className="text-[10px] text-gray-500 mb-2">
                  계량기 등급이 클수록 점검 난이도 ↑
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {GRADES.map((g) => {
                    const w = meterGradeWeights[g] ?? 1.0;
                    const defaultW = DEFAULT_METER_GRADE_WEIGHTS[g] ?? 1.0;
                    const isModified = Math.abs(w - defaultW) > 0.01;
                    return (
                      <div key={g} className="flex items-center gap-2 text-xs">
                        <span className="w-12 text-right font-mono text-gray-600">
                          {g}
                        </span>
                        <input
                          type="range"
                          min="0.5"
                          max="50"
                          step="0.1"
                          value={w}
                          onChange={(e) =>
                            setMeterGradeWeight(g, parseFloat(e.target.value))
                          }
                          className="flex-1"
                        />
                        <span
                          className={`w-12 text-right font-mono ${
                            isModified ? "text-amber-700 font-bold" : "text-gray-700"
                          }`}
                        >
                          {w.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={resetMeterGradeWeights}
                  className="mt-2 w-full text-xs py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                >
                  기본값으로 복원
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
