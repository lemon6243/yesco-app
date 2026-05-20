// 권역 내 인접성 검사 (BFS로 연결된 동 그룹 찾기)
export function checkAdjacency(dongAssignments, adjacencyMap, zoneCount) {
  const issues = {}; // { zone: { isolatedDongs: [...], components: n } }

  for (let z = 1; z <= zoneCount; z++) {
    issues[z] = { isolatedDongs: [], components: 0, totalDongs: 0 };
  }

  // 권역별 동 목록 작성
  const zoneToDongs = {};
  Object.entries(dongAssignments).forEach(([dong, zone]) => {
    if (!zoneToDongs[zone]) zoneToDongs[zone] = [];
    zoneToDongs[zone].push(dong);
  });

  Object.entries(zoneToDongs).forEach(([zoneStr, dongs]) => {
    const zone = Number(zoneStr);
    if (!issues[zone]) return;
    issues[zone].totalDongs = dongs.length;

    const dongSet = new Set(dongs);
    const visited = new Set();
    const components = [];

    dongs.forEach((start) => {
      if (visited.has(start)) return;
      // BFS
      const queue = [start];
      const component = [];
      visited.add(start);
      while (queue.length) {
        const cur = queue.shift();
        component.push(cur);
        const neighbors = adjacencyMap[cur] || [];
        neighbors.forEach((nb) => {
          if (dongSet.has(nb) && !visited.has(nb)) {
            visited.add(nb);
            queue.push(nb);
          }
        });
      }
      components.push(component);
    });

    issues[zone].components = components.length;

    // 가장 큰 컴포넌트가 메인, 나머지는 고립으로 표시
    if (components.length > 1) {
      components.sort((a, b) => b.length - a.length);
      const isolated = components.slice(1).flat();
      issues[zone].isolatedDongs = isolated;
    }
  });

  return issues;
}

// 도심권 분산 규칙 검사 (한 권역에 도심권 동이 2개 이상이면 경고)
export function checkDowntown(features, dongAssignments, zoneCount, threshold = 2) {
  const counts = {};
  for (let z = 1; z <= zoneCount; z++) counts[z] = 0;

  features.forEach((f) => {
    const p = f.properties;
    const zone = dongAssignments[p.행정동];
    if (zone && p.is_downtown) {
      counts[zone] = (counts[zone] || 0) + 1;
    }
  });

  const warnings = {};
  Object.entries(counts).forEach(([z, c]) => {
    warnings[z] = { count: c, isWarning: c >= threshold };
  });
  return warnings;
}
