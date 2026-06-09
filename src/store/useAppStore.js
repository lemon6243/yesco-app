import { create } from "zustand";

export const ZONE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0f766e",
  "#a16207", "#be185d", // 11번: 황토색, 12번: 진분홍 (추가)
];

const useAppStore = create((set, get) => ({
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

  weights: { 단독: 2.0, 공동: 1.0, 영업: 3.0 },
  setWeight: (key, value) =>
    set((state) => ({ weights: { ...state.weights, [key]: value } })),

  targetMin: 96240,
  targetMax: 119760,

  showLabels: true,
  setShowLabels: (v) => set({ showLabels: v }),
  labelType: "name",
  setLabelType: (t) => set({ labelType: t }),
}));

export default useAppStore;
