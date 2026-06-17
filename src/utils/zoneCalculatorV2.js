import { DEFAULT_METER_GRADE_WEIGHTS } from "../store/useAppStore";

/**
 * V2 권역별 집계 계산
 *
 * @param {Object} metersByGrade - dataLoaderV2의 metersByGrade
 *   { 행정동: { centerCode, centerName, gu, grades: {2.5: n, 4.0: n, ...}, total } }
 * @param {Object} splitInfo - 분할동 메타
 *   { 행정동: { is_split, primary: {center_code, count}, secondary: [...], total } }
 * @param {Object} dongAssignments - { 행정동: zoneNumber }
 * @param {number} zoneCount - 권역 개수
 * @param {Object} meterGradeWeights - { 2.5: 1.0, 4.0: 1.0, ... }
 * @returns {{ zones, unassigned }}
 */
export function calculateZoneStatsV2(
  metersByGrade,
  splitInfo,
  dongAssignments,
  zoneCount,
  meterGradeWeights
) {
  const weights = meterGradeWeights ?? DEFAULT_METER_GRADE_WEIGHTS;

  const makeEmptyStat = (zone) => ({
    zone,
    dongCount: 0,
    dongs: [],
    총수용가수: 0,
    난이도점수: 0,
    등급별합계: {}, // { 2.5: n, 4.0: n, ... }
    운영센터집합: new Set(),
    분할동수: 0,
  });

  const stats = {};
  for (let i = 1; i <= zoneCount; i++) {
    stats[i] = makeEmptyStat(i);
  }
  const unassigned = makeEmptyStat(0);

  if (!metersByGrade) {
    return { zones: stats, unassigned };
  }

  Object.entries(metersByGrade).forEach(([dong, info]) => {
    const zone = dongAssignments[dong] ?? 0;
    const target = zone === 0 ? unassigned : stats[zone];
    if (!target) return;

    target.dongCount += 1;
    target.dongs.push(dong);
    target.총수용가수 += info.total ?? 0;

    // 등급별 합산 + 난이도점수 계산
    Object.entries(info.grades ?? {}).forEach(([gradeStr, count]) => {
      const grade = parseFloat(gradeStr);
      const w = weights[grade] ?? 1.0;
      target.등급별합계[grade] = (target.등급별합계[grade] ?? 0) + count;
      target.난이도점수 += count * w;
    });

    // 운영센터 수집 (분할동 포함)
    const sInfo = splitInfo?.[dong];
    if (sInfo) {
      target.운영센터집합.add(sInfo.primary.center_code);
      sInfo.secondary?.forEach((s) => target.운영센터집합.add(s.center_code));
      if (sInfo.is_split) target.분할동수 += 1;
    } else if (info.centerCode) {
      target.운영센터집합.add(info.centerCode);
    }
  });

  // Set → 배열 변환 + 파생값 계산
  const finalize = (s) => {
    s.운영센터 = Array.from(s.운영센터집합).sort();
    delete s.운영센터집합;
    // V2 상담원 추정 (등급 가중 점수 기준)
    // V1에서는 합계/24000이었지만, V2는 난이도점수 기준으로 환산
    s.상담원수 = s.난이도점수 / 24000;
    s.난이도점수 = Math.round(s.난이도점수);
  };
  Object.values(stats).forEach(finalize);
  finalize(unassigned);

  return { zones: stats, unassigned };
}

/**
 * V2 권역 라벨 생성
 * 예: "9001 단독", "9005+9016 통합 (분할동 1개)"
 */
export function getZoneLabelV2(zoneStat) {
  if (!zoneStat.운영센터 || zoneStat.운영센터.length === 0) return "(미할당)";
  const baseLabel =
    zoneStat.운영센터.length === 1
      ? `${zoneStat.운영센터[0]} 단독`
      : `${zoneStat.운영센터.join("+")} 통합`;
  if (zoneStat.분할동수 > 0) {
    return `${baseLabel} (분할동 ${zoneStat.분할동수}개)`;
  }
  return baseLabel;
}

/**
 * V1 호환 헬퍼 — V2 결과를 V1 형식 비슷하게 변환
 * (UI 일부 컴포넌트가 V1 형식을 기대할 때 사용)
 */
export function toV1CompatibleStat(v2Stat) {
  return {
    zone: v2Stat.zone,
    dongCount: v2Stat.dongCount,
    dongs: v2Stat.dongs,
    합계: v2Stat.총수용가수,
    난이도점수: v2Stat.난이도점수,
    운영센터: v2Stat.운영센터,
    상담원수: v2Stat.상담원수,
    // 단독/공동/영업은 V2에서 의미가 없음 (등급별로 대체)
    단독: 0,
    공동: 0,
    영업: 0,
    도심권개수: 0,
  };
}

/**
 * 권역 균형도 평가 (V2)
 * 모든 권역의 난이도점수가 타겟 범위 안에 들어가는지 체크
 */
export function evaluateZoneBalanceV2(zones, targetMin, targetMax) {
  const results = {};
  Object.values(zones).forEach((s) => {
    if (s.dongCount === 0) {
      results[s.zone] = { status: "empty", score: s.난이도점수 };
      return;
    }
    if (s.난이도점수 < targetMin) {
      results[s.zone] = {
        status: "under",
        score: s.난이도점수,
        gap: targetMin - s.난이도점수,
      };
    } else if (s.난이도점수 > targetMax) {
      results[s.zone] = {
        status: "over",
        score: s.난이도점수,
        gap: s.난이도점수 - targetMax,
      };
    } else {
      results[s.zone] = { status: "ok", score: s.난이도점수 };
    }
  });
  return results;
}
