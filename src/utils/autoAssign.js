// 자동 권역 배정 알고리즘
// 입력: features, adjacencyMap, zoneCount, weights, options
// 출력: { [행정동]: zone } 형태의 할당 객체

export function autoAssignZones(features, adjacencyMap, zoneCount, weights, options = {}) {
  const {
    preferCenterContinuity = true,  // 기존 운영센터 기반 시드 선호
    balanceDowntown = true,          // 도심권 분산
    maxIterations = 200,             // 사후 최적화 반복 횟수
  } = options;

  // 행정동별 properties 매핑
  const dongMap = {};
  features.forEach((f) => {
    dongMap[f.properties.행정동] = f.properties;
  });
  const allDongs = Object.keys(dongMap);

  // 난이도 점수 계산 함수
  const score = (props) =>
    (props.단독 ?? 0) * weights.단독 +
    (props.공동 ?? 0) * weights.공동 +
    (props.영업 ?? 0) * weights.영업;

  // 1단계: 시드 동 선택
  // 전략: 기존 운영센터별로 그룹핑 후, 가장 큰 센터들을 우선으로 시드 선정
  const centerGroups = {};
  allDongs.forEach((d) => {
    const c = dongMap[d].주센터번호;
    if (!centerGroups[c]) centerGroups[c] = [];
    centerGroups[c].push(d);
  });

  // 센터별 합계 세대수가 큰 순으로 정렬
  const sortedCenters = Object.entries(centerGroups)
    .map(([c, dongs]) => ({
      center: c,
      dongs,
      total: dongs.reduce((s, d) => s + (dongMap[d].합계 ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total);

  // 시드: 각 그룹에서 합계 세대수가 가장 큰 동 선택
  const seeds = [];
  for (let i = 0; i < zoneCount && i < sortedCenters.length; i++) {
    const group = sortedCenters[i];
    const best = group.dongs.sort(
      (a, b) => (dongMap[b].합계 ?? 0) - (dongMap[a].합계 ?? 0)
    )[0];
    seeds.push(best);
  }
  // 센터 수보다 권역 수가 많으면, 가장 큰 센터의 두 번째 동을 추가 시드로
  while (seeds.length < zoneCount) {
    for (const group of sortedCenters) {
      const candidate = group.dongs.find((d) => !seeds.includes(d));
      if (candidate) {
        seeds.push(candidate);
        if (seeds.length >= zoneCount) break;
      }
    }
  }

  // 2단계: 시드로 초기 할당
  const assignments = {};
  const zoneStats = {}; // { zone: { totalScore, totalCount, downtownCount } }
  for (let z = 1; z <= zoneCount; z++) {
    assignments[seeds[z - 1]] = z;
    zoneStats[z] = {
      totalScore: score(dongMap[seeds[z - 1]]),
      totalCount: dongMap[seeds[z - 1]].합계 ?? 0,
      downtownCount: dongMap[seeds[z - 1]].is_downtown ? 1 : 0,
      dongs: [seeds[z - 1]],
    };
  }

  // 3단계: 균형 성장 (Region Growing)
  let unassigned = allDongs.filter((d) => !(d in assignments));
  let safety = unassigned.length + 10;

  while (unassigned.length > 0 && safety-- > 0) {
    // 난이도점수 합계가 가장 작은 권역부터 우선 성장
    const sortedZones = Object.entries(zoneStats).sort(
      (a, b) => a[1].totalScore - b[1].totalScore
    );

    let assigned = false;
    for (const [zStr, stat] of sortedZones) {
      const zone = Number(zStr);
      // 이 권역에 인접한 미할당 동 후보 수집
      const candidates = new Set();
      stat.dongs.forEach((d) => {
        (adjacencyMap[d] || []).forEach((nb) => {
          if (!(nb in assignments) && nb in dongMap) candidates.add(nb);
        });
      });

      if (candidates.size === 0) continue;

      // 후보 중 최적 선택: 도심권 제약 통과 + 가장 적합한 동
      let best = null;
      let bestCost = Infinity;
      candidates.forEach((c) => {
        const p = dongMap[c];
        // 도심권 제약: 이미 도심권 1개 보유시 다른 도심권 동 회피
        if (balanceDowntown && p.is_downtown && stat.downtownCount >= 1) {
          return;
        }
        // 비용: 추가 후 점수가 가장 균형있게 되는 후보 선호
        const cost = score(p);
        if (cost < bestCost) {
          bestCost = cost;
          best = c;
        }
      });

      // 도심권 제약 때문에 후보가 없으면 제약 완화
      if (!best) {
        candidates.forEach((c) => {
          const cost = score(dongMap[c]);
          if (cost < bestCost) {
            bestCost = cost;
            best = c;
          }
        });
      }

      if (best) {
        assignments[best] = zone;
        stat.totalScore += score(dongMap[best]);
        stat.totalCount += dongMap[best].합계 ?? 0;
        if (dongMap[best].is_downtown) stat.downtownCount += 1;
        stat.dongs.push(best);
        unassigned = unassigned.filter((d) => d !== best);
        assigned = true;
        break; // 한 번에 한 권역만 성장 → 다시 정렬
      }
    }

    // 어느 권역도 성장 불가능 (고립된 미할당 동) → 가장 가까운 권역에 강제 할당
    if (!assigned && unassigned.length > 0) {
      const orphan = unassigned[0];
      // 인접 동의 권역 중 점수 가장 낮은 권역에 배정
      const neighborZones = (adjacencyMap[orphan] || [])
        .map((n) => assignments[n])
        .filter(Boolean);
      let targetZone;
      if (neighborZones.length > 0) {
        targetZone = neighborZones.sort(
          (a, b) => zoneStats[a].totalScore - zoneStats[b].totalScore
        )[0];
      } else {
        // 완전 고립 → 점수 가장 낮은 권역
        targetZone = Number(
          Object.entries(zoneStats).sort(
            (a, b) => a[1].totalScore - b[1].totalScore
          )[0][0]
        );
      }
      assignments[orphan] = targetZone;
      zoneStats[targetZone].totalScore += score(dongMap[orphan]);
      zoneStats[targetZone].totalCount += dongMap[orphan].합계 ?? 0;
      if (dongMap[orphan].is_downtown) zoneStats[targetZone].downtownCount += 1;
      zoneStats[targetZone].dongs.push(orphan);
      unassigned = unassigned.filter((d) => d !== orphan);
    }
  }

  // 4단계: 사후 최적화 - 경계 동 swap으로 균형 개선
  for (let iter = 0; iter < maxIterations; iter++) {
    // 점수 max/min 권역 찾기
    const sorted = Object.entries(zoneStats).sort(
      (a, b) => b[1].totalScore - a[1].totalScore
    );
    const [maxZoneStr, maxStat] = sorted[0];
    const [minZoneStr, minStat] = sorted[sorted.length - 1];
    const maxZone = Number(maxZoneStr);
    const minZone = Number(minZoneStr);

    if (maxStat.totalScore - minStat.totalScore < 5000) break; // 충분히 균형

    // maxZone의 경계 동 중, minZone과 인접한 동을 minZone으로 이전 시도
    let moved = false;
    for (const d of maxStat.dongs) {
      if (d === seeds[maxZone - 1]) continue; // 시드는 옮기지 않음
      const neighbors = adjacencyMap[d] || [];
      const isAdjacentToMin = neighbors.some((n) => assignments[n] === minZone);
      if (!isAdjacentToMin) continue;

      // 이동 후 maxZone에서 d를 빼도 연결성 유지하는지 간단 체크
      // (정확한 BFS는 비용 큼 → 인접 동 중 maxZone인 게 2개 이상이면 OK로 근사)
      const sameZoneNeighbors = neighbors.filter(
        (n) => assignments[n] === maxZone
      ).length;
      if (sameZoneNeighbors < 1) continue;

      // 이동
      const s = score(dongMap[d]);
      assignments[d] = minZone;
      maxStat.totalScore -= s;
      maxStat.dongs = maxStat.dongs.filter((x) => x !== d);
      minStat.totalScore += s;
      minStat.dongs.push(d);
      if (dongMap[d].is_downtown) {
        maxStat.downtownCount -= 1;
        minStat.downtownCount += 1;
      }
      moved = true;
      break;
    }
    if (!moved) break;
  }

  return assignments;
}
