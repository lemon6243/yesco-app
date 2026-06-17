import { create } from "zustand";

export const ZONE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0f766e",
  "#a16207", "#be185d", // 11번: 황토색, 12번: 진분홍 (추가)
];

// V2 등급별 기본 가중치 (계량기 등급 → 점검 난이도 비율)
// 추후 meter_weights.json에서 덮어쓸 수 있음
export const DEFAULT_METER_GRADE_WEIGHTS = {
  2.5: 1.0,
  3.0: 1.0,
  4.0: 1.0,
  5.0: 1.2,
  6.0: 1.3,
  7.0: 1.5,
  10.0: 1.8,
  16.0: 2.2,
  25.0: 2.8,
  40.0: 3.5,
  65.0: 4.5,
  100.0: 6.0,
  160.0: 8.0,
  250.0: 11.0,
  400.0: 15.0,
  650.0: 20.0,
  1000.0: 28.0,
  1600.0: 40.0,
};

const useAppStore = create((set, get) => ({
  // ────────────────────────────────────────────────────────
  // V1/V2 모드 토글 (V2 추가)
  // ────────────────────────────────────────────────────────
  appMode: "v1", // "v1" | "v2"
  setAppMode: (m) => set({ appMode: m }),

  // ────────────────────────────────────────────────────────
  // V1 기존 상태 (그대로 유지)
  // ────────────────────────────────────────────────────────
  zoneCount: 9,
  setZoneCount: (n) => set({ zoneCount: n }),

  selectedZone: 1,
  setSelectedZone: (z) => set({ selectedZone: z }),

  dongAssignments: {},
  assignDong: (dongName, zone) =>
    set((state) => ({
      dongAssignments: { ...state.dongAssignments, [dongName]: zone },
    })),
  clearDong: (dongName) =>
    set((state) => {
      const next = { ...state.dongAssignments };
      delete next[dongName];
      return { dongAssignments: next };
    }),
  resetAssignments: () => set({ dongAssignments: {} }),

  setAllAssignments: (assignments) =>
    set({ dongAssignments: assignments ?? {} }),

  applyScenario: (data) =>
    set((state) => ({
      zoneCount: data.zoneCount ?? state.zoneCount,
      weights: data.weights ?? state.weights,
      targetMin: data.targetMin ?? state.targetMin,
      targetMax: data.targetMax ?? state.targetMax,
      dongAssignments: data.dongAssignments ?? {},
    })),

  // 보기 모드: "zone" | "hybrid" | "center"
  viewMode: "hybrid",
  setViewMode: (m) => set({ viewMode: m }),

  // V1 가중치 (단독/공동/영업 3분류)
  weights: { 단독: 2.0, 공동: 1.0, 영업: 3.0 },
  setWeight: (key, value) =>
    set((state) => ({ weights: { ...state.weights, [key]: value } })),

  targetMin: 96240,
  targetMax: 119760,

  showLabels: true,
  setShowLabels: (v) => set({ showLabels: v }),
  labelType: "name",
  setLabelType: (t) => set({ labelType: t }),

  // ────────────────────────────────────────────────────────
  // V2 신규 상태
  // ────────────────────────────────────────────────────────

  // V2 데이터 로드 상태
  v2Loaded: false,
  setV2Loaded: (v) => set({ v2Loaded: v }),

  // V2 등급별 가중치 (16등급)
  meterGradeWeights: { ...DEFAULT_METER_GRADE_WEIGHTS },
  setMeterGradeWeight: (grade, value) =>
    set((state) => ({
      meterGradeWeights: { ...state.meterGradeWeights, [grade]: value },
    })),
  resetMeterGradeWeights: () =>
    set({ meterGradeWeights: { ...DEFAULT_METER_GRADE_WEIGHTS } }),

  // V2 분할동 표시 옵션
  showSplitHatch: true, // D안 빗금 표시 on/off
  setShowSplitHatch: (v) => set({ showSplitHatch: v }),

  // V2 타겟 (등급 기반 점수, V1과 별도)
  v2TargetMin: 96240,
  v2TargetMax: 119760,
  setV2Target: (min, max) => set({ v2TargetMin: min, v2TargetMax: max }),
}));

export default useAppStore;
