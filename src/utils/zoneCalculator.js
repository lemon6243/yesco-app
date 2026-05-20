// 권역별 집계 계산
export function calculateZoneStats(features, dongAssignments, zoneCount, weights) {
  const stats = {};
  for (let i = 1; i <= zoneCount; i++) {
    stats[i] = {
      zone: i,
      dongCount: 0,
      dongs: [],
      단독: 0,
      공동: 0,
      영업: 0,
      합계: 0,
      난이도점수: 0,
      도심권개수: 0,
      운영센터집합: new Set(),
    };
  }

  // 미할당 집계
  const unassigned = {
    zone: 0,
    dongCount: 0,
    dongs: [],
    단독: 0,
    공동: 0,
    영업: 0,
    합계: 0,
    난이도점수: 0,
    도심권개수: 0,
    운영센터집합: new Set(),
  };

  features.forEach((f) => {
    const p = f.properties;
    const name = p.행정동;
    const zone = dongAssignments[name] ?? 0;
    const target = zone === 0 ? unassigned : stats[zone];
    if (!target) return;

    target.dongCount += 1;
    target.dongs.push(name);
    target.단독 += p.단독 ?? 0;
    target.공동 += p.공동 ?? 0;
    target.영업 += p.영업 ?? 0;
    target.합계 += p.합계 ?? 0;
    target.난이도점수 +=
      (p.단독 ?? 0) * weights.단독 +
      (p.공동 ?? 0) * weights.공동 +
      (p.영업 ?? 0) * weights.영업;
    if (p.is_downtown) target.도심권개수 += 1;

    // 운영센터 분해 (예: "9001+9004" → [9001, 9004])
    const ops = String(p.운영센터 ?? p.주센터번호 ?? "")
      .split(/[+,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    ops.forEach((o) => target.운영센터집합.add(o));
  });

  // Set → 배열로 변환
  Object.values(stats).forEach((s) => {
    s.운영센터 = Array.from(s.운영센터집합).sort();
    delete s.운영센터집합;
    s.상담원수 = s.합계 / 24000;
  });
  unassigned.운영센터 = Array.from(unassigned.운영센터집합).sort();
  delete unassigned.운영센터집합;
  unassigned.상담원수 = unassigned.합계 / 24000;

  return { zones: stats, unassigned };
}

// 권역 라벨 자동 생성 (예: "9001+9004 통합")
export function getZoneLabel(zoneStat) {
  if (!zoneStat.운영센터 || zoneStat.운영센터.length === 0) return "(미할당)";
  if (zoneStat.운영센터.length === 1) return `${zoneStat.운영센터[0]} 단독`;
  return `${zoneStat.운영센터.join("+")} 통합`;
}
