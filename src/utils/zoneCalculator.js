import { STAFFING_RULES } from "../store/useAppStore";

/**
 * 권역별 집계 계산 (V1)
 *
 * @param {Array} features - GeoJSON features
 * @param {Object} dongAssignments - { [dongName]: zone }
 * @param {number} zoneCount
 * @param {Object} weights - { 단독, 공동, 영업 }
 * @param {Object} options - { moveInData, selectedMoveInYears }
 */
export function calculateZoneStats(
  features,
  dongAssignments,
  zoneCount,
  weights,
  options = {}
) {
  const { moveInData = {}, selectedMoveInYears = [] } = options;

  const stats = {};
  for (let i = 1; i <= zoneCount; i++) {
    stats[i] = makeEmptyZone(i);
  }
  const unassigned = makeEmptyZone(0);

  features.forEach((f) => {
    const p = f.properties;
    const name = p.행정동;
    const zone = dongAssignments[name] ?? 0;
    const target = zone === 0 ? unassigned : stats[zone];
    if (!target) return;

    // 입주예정 가산분 (선택된 연도까지 누적)
    const moveIn = getMoveInSum(name, moveInData, selectedMoveInYears);

    target.dongCount += 1;
    target.dongs.push(name);

    // 입주예정은 공동으로 분류 (아파트가 대부분이므로)
    const 단독 = p.단독 ?? 0;
    const 공동 = (p.공동 ?? 0) + moveIn;
    const 영업 = p.영업 ?? 0;

    target.단독 += 단독;
    target.공동 += 공동;
    target.영업 += 영업;
    target.합계 += 단독 + 공동 + 영업;
    target.입주예정합산 += moveIn;

    target.난이도점수 +=
      단독 * (weights.단독 ?? 2.0) +
      공동 * (weights.공동 ?? 1.0) +
      영업 * (weights.영업 ?? 3.0);

    if (p.is_downtown) target.도심권개수 += 1;

        const ops = String(p.운영센터 ?? p.주센터번호 ?? "")
      .split(/[+,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    ops.forEach((o) => target.운영센터집합.add(o));

    // ── 추가: 이 동의 세대수를 원래 소속 센터에 귀속 ──
    // 복합센터(예: "9001+9004")면 세대수를 균등 분배
    const 동합계 = 단독 + 공동 + 영업;
    if (ops.length > 0 && 동합계 > 0) {
      const share = 동합계 / ops.length;
      ops.forEach((o) => {
        target.센터별세대수[o] = (target.센터별세대수[o] ?? 0) + share;
      });
    }


  // 후처리: Set → 배열 / 법적인원 산출
  Object.values(stats).forEach(finalizeZone);
  finalizeZone(unassigned);

  return { zones: stats, unassigned };
}

function makeEmptyZone(zoneIdx) {
  return {
    zone: zoneIdx,
    dongCount: 0,
    dongs: [],
    단독: 0,
    공동: 0,
    영업: 0,
    합계: 0,
    난이도점수: 0,
    도심권개수: 0,
    입주예정합산: 0,
    운영센터집합: new Set(),
    센터별세대수: {},   // ← 추가: { [centerCode]: 세대수합 }
  };
}

/**
 * 입주예정 합산: selectedMoveInYears에 포함된 모든 연도의 세대수 합산
 */
function getMoveInSum(dongName, moveInData, selectedYears) {
  if (!moveInData || !selectedYears || selectedYears.length === 0) return 0;
  const entry = moveInData[dongName];
  if (!entry) return 0;
  return selectedYears.reduce((sum, y) => sum + (entry[y] ?? 0), 0);
}

/**
 * 권역 마무리: 운영센터 배열화 + 사무행정/법적인원 산출
 */
function finalizeZone(s) {
  s.운영센터 = Array.from(s.운영센터집합).sort();
  delete s.운영센터집합;

  // 사무행정 인원 (기존 상담원수 유지)
  s.상담원수 = s.합계 / STAFFING_RULES.office;

  // 법적인원 산출 (V1 간이 방식: 세대당 라운드업)
  const r = STAFFING_RULES.legalInspector;
  s.법적단독 = Math.ceil(s.단독 / r.단독);
  s.법적공동 = Math.ceil(s.공동 / r.공동);
  s.법적영업 = Math.ceil(s.영업 / r.영업);
  s.법적인원 = s.법적단독 + s.법적공동 + s.법적영업;

    // ── 추가: 센터별 비율 + 배치 추천 센터장 ──
  const 센터항목 = Object.entries(s.센터별세대수)
    .map(([code, hh]) => ({ code, 세대수: Math.round(hh) }))
    .sort((a, b) => b.세대수 - a.세대수);

  const 총 = 센터항목.reduce((sum, x) => sum + x.세대수, 0);
  s.센터구성 = 센터항목.map((x) => ({
    ...x,
    비율: 총 > 0 ? x.세대수 / 총 : 0,
  }));
  s.추천센터장 = 센터항목.length > 0 ? 센터항목[0].code : null;
  s.추천비율 = 총 > 0 && 센터항목.length > 0 ? 센터항목[0].세대수 / 총 : 0;


  // 사무행정 인원 (라운드업)
  s.사무행정인원 = s.합계 > 0 ? Math.ceil(s.합계 / STAFFING_RULES.office) : 0;
}

// 권역 라벨 자동 생성 (예: "9001+9004 통합")
export function getZoneLabel(zoneStat) {
  if (!zoneStat.운영센터 || zoneStat.운영센터.length === 0) return "(미할당)";
  if (zoneStat.운영센터.length === 1) return `${zoneStat.운영센터[0]} 단독`;
  return `${zoneStat.운영센터.join("+")} 통합`;
}
