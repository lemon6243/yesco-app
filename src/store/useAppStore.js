import { create } from "zustand";

export const ZONE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0f766e",
  "#a16207", "#be185d",
];

// V2 등급별 기본 가중치
export const DEFAULT_METER_GRADE_WEIGHTS = {
  2.5: 1.0, 3.0: 1.0, 4.0: 1.0, 5.0: 1.2, 6.0: 1.3,
  7.0: 1.5, 10.0: 1.8, 16.0: 2.2, 25.0: 2.8, 40.0: 3.5,
  65.0: 4.5, 100.0: 6.0, 160.0: 8.0, 250.0: 11.0, 400.0: 15.0,
  650.0: 20.0, 1000.0: 28.0, 1600.0: 40.0,
};

// ────────────────────────────────────────────────────────
// 법적인원 산정 기준 (centers_unit_times.json _meta.rules 반영)
// ────────────────────────────────────────────────────────
export const STAFFING_RULES = {
  // 법적점검원 세대당 기준
  legalInspector: {
    단독: 3000,
    공동: 4000,
    영업: 3000,
    업무기타: 3000,
  },
  // 사무행정 세대당
  office: 24000,
  // V2 정밀 계산용
  annualMinutesPerPerson: 150480, // 1인 연간 가용시간(분)
  overheadMultiplier: 1.15,        // 부대시간 배수
};

// 입주예정 연도 옵션 (누적형)
export const MOVE_IN_YEARS = [2026, 2027, 2028, 2029, 2030];

const useAppStore = create((set, get) => ({
  // ────────────────────────────────────────────────────────
  // V1/V2 모드 토글
  // ────────────────────────────────────────────────────────
  appMode: "v1",
  setAppMode: (m) => set({ appMode: m }),

  // ────────────────────────────────────────────────────────
  // V1 기존 상태
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

  viewMode: "hybrid",
  setViewMode: (m) => set({ viewMode: m }),

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
  v2Loaded: false,
  setV2Loaded: (v) => set({ v2Loaded: v }),

  meterGradeWeights: { ...DEFAULT_METER_GRADE_WEIGHTS },
  setMeterGradeWeight: (grade, value) =>
    set((state) => ({
      meterGradeWeights: { ...state.meterGradeWeights, [grade]: value },
    })),
  resetMeterGradeWeights: () =>
    set({ meterGradeWeights: { ...DEFAULT_METER_GRADE_WEIGHTS } }),

  showSplitHatch: true,
  setShowSplitHatch: (v) => set({ showSplitHatch: v }),

  v2TargetMin: 96240,
  v2TargetMax: 119760,
  setV2Target: (min, max) => set({ v2TargetMin: min, v2TargetMax: max }),

  // ────────────────────────────────────────────────────────
  // 입주예정 (V1/V2 공통)
  // ────────────────────────────────────────────────────────
  moveInData: {},          // { 행정동: { 2026: 152, 2027: 4321, ... } }
  setMoveInData: (data) => set({ moveInData: data ?? {} }),

  // 누적형: 선택한 연도까지 모두 합산
  // 예: [2026, 2027] 선택 시 2026 + 2027 입주분 모두 반영
  selectedMoveInYears: [],
  toggleMoveInYear: (year) =>
    set((state) => {
      const has = state.selectedMoveInYears.includes(year);
      return {
        selectedMoveInYears: has
          ? state.selectedMoveInYears.filter((y) => y !== year)
          : [...state.selectedMoveInYears, year].sort((a, b) => a - b),
      };
    }),
  clearMoveInYears: () => set({ selectedMoveInYears: [] }),
  setAllMoveInYears: () => set({ selectedMoveInYears: [...MOVE_IN_YEARS] }),

  // ────────────────────────────────────────────────────────
  // 법적인원 표시 옵션 (V1/V2 공통)
  // ────────────────────────────────────────────────────────
  showStaffing: true,
  setShowStaffing: (v) => set({ showStaffing: v }),

  // 법적인원 계산 방식: "simple" (세대당 라운드업) | "precise" (V2 단위시간 기반)
  staffingMode: "simple",
  setStaffingMode: (m) => set({ staffingMode: m }),

  // centers_unit_times.json 데이터 (법적인원 정밀 계산용)
  unitTimes: null,
  setUnitTimes: (data) => set({ unitTimes: data }),
}));

export default useAppStore;
