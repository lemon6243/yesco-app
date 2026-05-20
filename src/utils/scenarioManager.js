// 시나리오 JSON 저장 (다운로드)
export function exportScenario(state) {
  const data = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    zoneCount: state.zoneCount,
    weights: state.weights,
    targetMin: state.targetMin,
    targetMax: state.targetMax,
    dongAssignments: state.dongAssignments,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  a.href = url;
  a.download = `yesco_scenario_${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 시나리오 JSON 불러오기
export function importScenario(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// 권역 결과를 CSV로 내보내기
export function exportZonesCSV(zones, getZoneLabel) {
  const headers = [
    "권역",
    "라벨",
    "행정동수",
    "도심권개수",
    "운영센터",
    "단독",
    "공동",
    "영업",
    "합계",
    "난이도점수",
    "상담원수",
    "행정동목록",
  ];

  const rows = Object.values(zones).map((z) => [
    z.zone,
    getZoneLabel(z),
    z.dongCount,
    z.도심권개수,
    z.운영센터.join("+"),
    z.단독,
    z.공동,
    z.영업,
    z.합계,
    Math.round(z.난이도점수),
    z.상담원수.toFixed(2),
    z.dongs.join("·"),
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(",")
    )
    .join("\n");

  // BOM을 붙여 Excel 한글 깨짐 방지
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  a.href = url;
  a.download = `yesco_zones_${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
