// 자동 권역 배정 알고리즘 (개선판: 현실적 업무량 균형, 지리적 인접성/연속성 엄격 보장, 미할당 동 선택 채우기 지원)
// 입력: features, adjacencyMap, zoneCount, weights, options
// 출력: { [행정동]: zone }

/**
 * 특정 동 목록이 인접 그래프 상에서 1개의 단일 연결 컴포넌트인지 확인 (BFS)
 */
function isConnectedComponent(dongs, adjacencyMap) {
  if (dongs.length <= 1) return true;
  const set = new Set(dongs);
  const visited = new Set();
  const queue = [dongs[0]];
  visited.add(dongs[0]);

  while (queue.length > 0) {
    const cur = queue.shift();
    const neighbors = adjacencyMap[cur] || [];
    for (const nb of neighbors) {
      if (set.has(nb) && !visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }

  return visited.size === set.size;
}

/**
 * 행정동의 대표 중심 좌표 (GeoJSON geometry 기반)
 */
function getDongCenter(geometry) {
  if (!geometry) return [37.56, 127.0];
  let coords = [];
  if (geometry.type === "Polygon") {
    coords = geometry.coordinates[0];
  } else if (geometry.type === "MultiPolygon") {
    let maxLen = 0;
    geometry.coordinates.forEach((poly) => {
      if (poly[0] && poly[0].length > maxLen) {
        maxLen = poly[0].length;
        coords = poly[0];
      }
    });
  }
  if (!coords || coords.length === 0) return [37.56, 127.0];
  let sx = 0;
  let sy = 0;
  coords.forEach(([x, y]) => {
    sx += x;
    sy += y;
  });
  return [sy / coords.length, sx / coords.length];
}

/**
 * 두 좌표 사이의 유클리드 거리 제곱 (경도/위도 근사)
 */
function coordDistSq(c1, c2) {
  const dLat = (c1[0] - c2[0]) * 1.1; // 위도 스케일 보정
  const dLng = c1[1] - c2[1];
  return dLat * dLat + dLng * dLng;
}

export function autoAssignZones(
  features,
  adjacencyMap = {},
  zoneCount = 9,
  weights = { 단독: 2.0, 공동: 1.0, 영업: 3.0 },
  options = {}
) {
  const {
    fixedAssignments = {},       // 유지할 기존 할당 { [행정동]: zone }
    balanceDowntown = true,      // 도심권 동 분산 여부
    maxIterations = 250,         // 경계 최적화 반복 횟수
    isV2 = false,
    metersByGrade = null,
    meterGradeWeights = null,
    moveInData = null,
    selectedMoveInYears = [],
  } = options;

  // 1. 행정동 데이터 맵 및 좌표 구축
  const dongMap = {};
  const dongCenters = {};
  features.forEach((f) => {
    const p = f.properties;
    dongMap[p.행정동] = p;
    dongCenters[p.행정동] = getDongCenter(f.geometry);
  });
  const allDongs = Object.keys(dongMap);
  if (allDongs.length === 0) return {};

  // 2. 동별 업무량/난이도 점수 계산 함수
  const score = (dongName) => {
    const p = dongMap[dongName];
    if (!p) return 0;

    // 입주예정 가산분 (공동주택으로 합산)
    let moveIn = 0;
    if (moveInData && moveInData[dongName] && selectedMoveInYears?.length) {
      moveIn = selectedMoveInYears.reduce(
        (sum, yr) => sum + (moveInData[dongName][yr] ?? 0),
        0
      );
    }

    // V2 계량기 등급 기반
    if (isV2 && metersByGrade && metersByGrade[dongName]?.grades) {
      const gWeights = meterGradeWeights || {};
      let v2Score = 0;
      Object.entries(metersByGrade[dongName].grades).forEach(([grade, cnt]) => {
        const w = gWeights[grade] ?? 1.0;
        v2Score += cnt * w;
      });
      return v2Score + moveIn * 1.0;
    }

    // V1 단독/공동/영업
    const 단독 = p.단독 ?? 0;
    const 공동 = (p.공동 ?? 0) + moveIn;
    const 영업 = p.영업 ?? 0;
    return (
      단독 * (weights.단독 ?? 2.0) +
      공동 * (weights.공동 ?? 1.0) +
      영업 * (weights.영업 ?? 3.0)
    );
  };

  const getDongHouseholds = (dongName) => {
    const p = dongMap[dongName];
    if (!p) return 0;
    let moveIn = 0;
    if (moveInData && moveInData[dongName] && selectedMoveInYears?.length) {
      moveIn = selectedMoveInYears.reduce(
        (sum, yr) => sum + (moveInData[dongName][yr] ?? 0),
        0
      );
    }
    return (p.합계 ?? 0) + moveIn;
  };

  // 3. 권역별 상태 초기화
  const assignments = {};
  const zoneStats = {};
  for (let z = 1; z <= zoneCount; z++) {
    zoneStats[z] = {
      zone: z,
      totalScore: 0,
      totalHouseholds: 0,
      downtownCount: 0,
      dongs: [],
      centerCounts: {}, // { [centerCode]: count }
    };
  }

  // 4. fixedAssignments 반영 (미할당 동만 채우기 시 기존 할당 100% 보존)
  const validFixed = {};
  Object.entries(fixedAssignments).forEach(([dong, z]) => {
    const zoneNum = Number(z);
    if (dongMap[dong] && zoneNum >= 1 && zoneNum <= zoneCount) {
      validFixed[dong] = zoneNum;
      assignments[dong] = zoneNum;

      const stat = zoneStats[zoneNum];
      stat.dongs.push(dong);
      stat.totalScore += score(dong);
      stat.totalHouseholds += getDongHouseholds(dong);
      if (dongMap[dong].is_downtown) stat.downtownCount += 1;

      const center = dongMap[dong].주센터번호;
      if (center) {
        stat.centerCounts[center] = (stat.centerCounts[center] || 0) + 1;
      }
    }
  });

  // 미할당 동 목록
  let unassigned = allDongs.filter((d) => !(d in assignments));

  // 전체 목표 점수 계산
  const totalScoreAll = allDongs.reduce((sum, d) => sum + score(d), 0);
  const targetZoneScore = totalScoreAll / zoneCount;

  // 5. 시드(Seed) 동 배정 (할당이 없는 빈 권역이 있을 때)
  const emptyZones = [];
  for (let z = 1; z <= zoneCount; z++) {
    if (zoneStats[z].dongs.length === 0) {
      emptyZones.push(z);
    }
  }

  if (emptyZones.length > 0 && unassigned.length > 0) {
    // 기존 센터별로 미할당 동 그룹화
    const centerGroups = {};
    unassigned.forEach((d) => {
      const c = dongMap[d].주센터번호 || "etc";
      if (!centerGroups[c]) centerGroups[c] = [];
      centerGroups[c].push(d);
    });

    // 센터별 총 세대수 순 정렬
    const sortedCenters = Object.entries(centerGroups)
      .map(([center, dongs]) => ({
        center,
        dongs: [...dongs].sort(
          (a, b) => getDongHouseholds(b) - getDongHouseholds(a)
        ),
        total: dongs.reduce((s, d) => s + getDongHouseholds(d), 0),
      }))
      .sort((a, b) => b.total - a.total);

    // Farthest-First Traversal 방식으로 시드 선택 (지리적 겹침 방지)
    const chosenSeeds = [];

    // 이미 할당된 권역들의 대표 중심 좌표 수집
    const existingCenters = [];
    for (let z = 1; z <= zoneCount; z++) {
      if (zoneStats[z].dongs.length > 0) {
        const dongs = zoneStats[z].dongs;
        let lat = 0;
        let lng = 0;
        dongs.forEach((d) => {
          const c = dongCenters[d];
          lat += c[0];
          lng += c[1];
        });
        existingCenters.push([lat / dongs.length, lng / dongs.length]);
      }
    }

    for (let i = 0; i < emptyZones.length; i++) {
      let bestSeed = null;
      let maxMinDist = -1;

      // 후보군: 각 센터의 상위 동들
      const candidates = [];
      sortedCenters.forEach((cg) => {
        cg.dongs.slice(0, 3).forEach((cd) => {
          if (!chosenSeeds.includes(cd) && unassigned.includes(cd)) {
            candidates.push(cd);
          }
        });
      });

      // 후보군이 비었으면 unassigned 전체에서 탐색
      const pool = candidates.length > 0 ? candidates : unassigned;

      if (existingCenters.length === 0 && chosenSeeds.length === 0) {
        // 첫 번째 시드: 가장 큰 센터의 가장 큰 동
        bestSeed = pool[0];
      } else {
        // 기존 센터 및 이미 뽑힌 시드들과의 거리 최대화
        const allRefPoints = [
          ...existingCenters,
          ...chosenSeeds.map((s) => dongCenters[s]),
        ];

        pool.forEach((d) => {
          if (chosenSeeds.includes(d)) return;
          const pt = dongCenters[d];
          // 가장 가까운 기존 지성점과의 거리
          let minDist = Infinity;
          allRefPoints.forEach((ref) => {
            const dist = coordDistSq(pt, ref);
            if (dist < minDist) minDist = dist;
          });

          // 거리와 함께 동 자체의 적정 규모도 가미
          const weightFactor = 1 + Math.log10(Math.max(1000, getDongHouseholds(d))) * 0.1;
          const finalScore = minDist * weightFactor;

          if (finalScore > maxMinDist) {
            maxMinDist = finalScore;
            bestSeed = d;
          }
        });
      }

      if (!bestSeed) {
        bestSeed = unassigned.find((d) => !chosenSeeds.includes(d)) || unassigned[0];
      }

      if (bestSeed) {
        chosenSeeds.push(bestSeed);
        const z = emptyZones[i];
        assignments[bestSeed] = z;

        const stat = zoneStats[z];
        stat.dongs.push(bestSeed);
        stat.totalScore += score(bestSeed);
        stat.totalHouseholds += getDongHouseholds(bestSeed);
        if (dongMap[bestSeed].is_downtown) stat.downtownCount += 1;
        const cCode = dongMap[bestSeed].주센터번호;
        if (cCode) stat.centerCounts[cCode] = 1;

        unassigned = unassigned.filter((d) => d !== bestSeed);
      }
    }
  }

  // 6. 균형 성장 (Balanced Region Growing)
  // 인접성을 유지하며, 업무량 목표치 대비 부족한 권역부터 인접 미할당 동 흡수
  let growthSafety = allDongs.length * 3;

  while (unassigned.length > 0 && growthSafety-- > 0) {
    // 점수 비율(현재 점수 / targetZoneScore)이 가장 낮은 권역 우선
    const activeZones = Object.values(zoneStats).sort((a, b) => {
      return a.totalScore - b.totalScore;
    });

    let assignedInThisRound = false;

    for (const stat of activeZones) {
      const z = stat.zone;
      if (stat.dongs.length === 0) continue;

      // 이 권역에 인접한 미할당 동 후보 탐색
      const candidateNeighbors = new Map(); // candidateDong -> count of same-zone neighbors

      stat.dongs.forEach((d) => {
        const nbs = adjacencyMap[d] || [];
        nbs.forEach((nb) => {
          if (dongMap[nb] && !(nb in assignments)) {
            candidateNeighbors.set(
              nb,
              (candidateNeighbors.get(nb) || 0) + 1
            );
          }
        });
      });

      if (candidateNeighbors.size === 0) continue;

      // 최적의 후보 동 선정
      let bestCandidate = null;
      let bestValue = -Infinity;

      for (const [candidate, neighborCount] of candidateNeighbors.entries()) {
        const p = dongMap[candidate];
        const candScore = score(candidate);

        // 도심권 분산 제약: 이미 도심권 동이 있으면 다른 도심권 동 가급적 회피
        let downtownPenalty = 0;
        if (balanceDowntown && p.is_downtown && stat.downtownCount >= 1) {
          downtownPenalty = 50000;
        }

        // 기존 센터 연속성 보너스 (같은 주센터번호를 공유할수록 우대)
        const candCenter = p.주센터번호;
        const centerMatchBonus =
          candCenter && stat.centerCounts[candCenter]
            ? stat.centerCounts[candCenter] * 8000
            : 0;

        // 경계 밀착도 보너스 (인접한 같은 권역 동이 많을수록 둥글고 compact한 권역 형성)
        const compactnessBonus = neighborCount * 12000;

        // 목표치 과도 초과 방지
        const overshootPenalty = Math.max(0, stat.totalScore + candScore - targetZoneScore) * 1.5;

        // 종합 평가 가치
        const value =
          compactnessBonus +
          centerMatchBonus -
          downtownPenalty -
          overshootPenalty;

        if (value > bestValue) {
          bestValue = value;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate) {
        assignments[bestCandidate] = z;
        stat.dongs.push(bestCandidate);
        stat.totalScore += score(bestCandidate);
        stat.totalHouseholds += getDongHouseholds(bestCandidate);
        if (dongMap[bestCandidate].is_downtown) stat.downtownCount += 1;
        const cCode = dongMap[bestCandidate].주센터번호;
        if (cCode) {
          stat.centerCounts[cCode] = (stat.centerCounts[cCode] || 0) + 1;
        }

        unassigned = unassigned.filter((d) => d !== bestCandidate);
        assignedInThisRound = true;
        break; // 한 동 추가 후 다시 권역별 점수 순위 재정렬
      }
    }

    // 어느 권역도 직접 인접 후보를 찾지 못한 경우 (외곽 고립동 등)
    if (!assignedInThisRound && unassigned.length > 0) {
      // 가장 가까운 인접 할당 동을 가진 미할당 동을 찾아 배정
      let orphanToAssign = null;
      let targetZoneForOrphan = null;

      for (const orphan of unassigned) {
        const nbs = adjacencyMap[orphan] || [];
        const assignedNbs = nbs
          .filter((nb) => nb in assignments)
          .map((nb) => assignments[nb]);

        if (assignedNbs.length > 0) {
          // 인접 권역 중 업무량 점수가 가장 낮은 권역에 배정
          assignedNbs.sort(
            (za, zb) => zoneStats[za].totalScore - zoneStats[zb].totalScore
          );
          orphanToAssign = orphan;
          targetZoneForOrphan = assignedNbs[0];
          break;
        }
      }

      // 인접한 권역조차 없는 경우 (완전 고립)
      if (!orphanToAssign) {
        orphanToAssign = unassigned[0];
        // 지리적으로 가장 가까운 권역의 동 탐색
        let closestDist = Infinity;
        let closestZone = 1;
        const oCenter = dongCenters[orphanToAssign];

        allDongs.forEach((d) => {
          if (d in assignments) {
            const dist = coordDistSq(oCenter, dongCenters[d]);
            if (dist < closestDist) {
              closestDist = dist;
              closestZone = assignments[d];
            }
          }
        });
        targetZoneForOrphan = closestZone;
      }

      const z = targetZoneForOrphan;
      assignments[orphanToAssign] = z;
      const stat = zoneStats[z];
      stat.dongs.push(orphanToAssign);
      stat.totalScore += score(orphanToAssign);
      stat.totalHouseholds += getDongHouseholds(orphanToAssign);
      if (dongMap[orphanToAssign].is_downtown) stat.downtownCount += 1;
      const cCode = dongMap[orphanToAssign].주센터번호;
      if (cCode) {
        stat.centerCounts[cCode] = (stat.centerCounts[cCode] || 0) + 1;
      }

      unassigned = unassigned.filter((d) => d !== orphanToAssign);
    }
  }

  // 7. 사후 최적화 (Boundary Swapping with Strict Contiguity Guarantee)
  // 편차가 큰 권역 간 경계 동 이동 시도. 반드시 단일 컴포넌트(인접 연결성)가 유지될 때만 이동 허용!
  for (let iter = 0; iter < maxIterations; iter++) {
    const sorted = Object.values(zoneStats).sort(
      (a, b) => b.totalScore - a.totalScore
    );
    const maxStat = sorted[0];
    const minStat = sorted[sorted.length - 1];

    const diff = maxStat.totalScore - minStat.totalScore;
    // 충분히 균형을 이루었으면 종료 (목표 편차 5% 이내)
    if (diff < targetZoneScore * 0.06 || diff < 6000) break;

    let moved = false;

    // maxStat의 경계 동 중 minStat과 인접한 동을 찾아서 이전 시도
    for (const d of maxStat.dongs) {
      // 수동 고정된 동은 이전 불가
      if (d in validFixed) continue;

      const neighbors = adjacencyMap[d] || [];
      const isAdjToMin = neighbors.some((nb) => assignments[nb] === minStat.zone);
      if (!isAdjToMin) continue;

      const dScore = score(d);
      // 이동했을 때 오히려 min이 max보다 커져서 편차가 더 벌어지는 경우 제외
      if (minStat.totalScore + dScore > maxStat.totalScore - dScore + 1000) {
        continue;
      }

      // ── 엄격한 연결성 검사: maxStat에서 d를 제외해도 연결이 깨지지 않는지 검사 ──
      const remainingDongsInMax = maxStat.dongs.filter((x) => x !== d);
      if (!isConnectedComponent(remainingDongsInMax, adjacencyMap)) {
        continue; // d를 빼면 maxStat이 둘 이상으로 쪼개지므로 이동 불가!
      }

      // minStat에 d를 추가했을 때 연결성은 이미 isAdjToMin이므로 보장됨

      // 이동 실행
      assignments[d] = minStat.zone;
      maxStat.totalScore -= dScore;
      maxStat.totalHouseholds -= getDongHouseholds(d);
      maxStat.dongs = remainingDongsInMax;

      minStat.totalScore += dScore;
      minStat.totalHouseholds += getDongHouseholds(d);
      minStat.dongs.push(d);

      if (dongMap[d].is_downtown) {
        maxStat.downtownCount -= 1;
        minStat.downtownCount += 1;
      }

      moved = true;
      break; // 이동 후 다시 점수 정렬하여 다음 최적 교환 탐색
    }

    if (!moved) break;
  }

  return assignments;
}
