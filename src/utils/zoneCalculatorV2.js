import {
  DEFAULT_METER_GRADE_WEIGHTS,
  STAFFING_RULES,
} from "../store/useAppStore";

/**
 * V2 권역별 집계 계산
 *
 * @param {Object} metersByGrade
 * @param {Object} splitInfo
 * @param {Object} dongAssignments
 * @param {number} zoneCount
 * @param {Object} meterGradeWeights
 * @param {Object} options - { moveInData, selectedMoveInYears, unitTimes, staffingMode }
 */
export function calculateZoneStatsV2(
  metersByGrade,
  splitInfo,
  dongAssignments,
  zoneCount,
  meterGradeWeights,
  options = {}
) {
  const weights = meterGradeWeights ?? DEFAULT_METER_GRADE_WEIGHTS;
  const {
    moveInData = {},
    selectedMoveInYears = [],
    unitTimes = null,
    staffingMode = "simple",
  } = options;

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

    // 입주예정 가산분 (선택 연도까지 누적)
    const moveIn = getMoveInSum(dong, moveInData, selectedMoveInYears);

    target.dongCount += 1;
    target.dongs.push(dong);
    target.총수용가수 += (info.total ?? 0) + moveIn;
    target.입주예정합산 += moveIn;

    // 등급별 합산 + 난이도점수
    Object.entries(info.grades ?? {}).forEach(([gradeStr, count]) => {
      const grade = parseFloat(gradeStr);
      const w = weights[grade] ?? 1.0;
      target.등급별합계[grade] = (target.등급별합계[grade] ?? 0) + count;
      target.난이도점수 += count * w;
    });

    // 입주예정 세대는 신축 아파트 가정 → 등급 4.0으로 합산
    if (moveIn > 0) {
      const w40 = weights[4.0] ?? 1.0;
      target.등급별합계[4.0] = (target.등급별합계[4.0] ?? 0) + moveIn;
      target.난이도점수 += moveIn * w40;
    }

    // 운영센터 수집
    const sInfo = splitInfo?.[dong];
    if (sInfo) {
      if (sInfo.primary?.center_code)
        target.운영센터집합.add(sInfo.primary.center_code);
      sInfo.secondary?.forEach((s) => target.운영센터집합.add(s.center_code));
      if (sInfo.is_split) target.분할동수 += 1;
    } else if (info.centerCode) {
      target.운영센터집합.add(info.centerCode);
    }

    // 정밀 계산용: 센터별 작업시간 누적 (unitTimes가 있을 때)
    if (unitTimes && staffingMode === "precise") {
      accumulateWorkTime(target, info, moveIn, splitInfo?.[dong], unitTimes);
    }
  });

  // 마무리
  Object.values(stats).forEach((s) =>
    finalizeZone(s, staffingMode, unitTimes)
  );
  finalizeZone(unassigned, staffingMode, unitTimes);

  return { zones: stats, unassigned };
}

function makeEmptyStat(zone) {
  return {
    zone,
    dongCount: 0,
    dongs: [],
    총수용가수: 0,
    난이도점수: 0,
    등급별합계: {},
    운영센터집합: new Set(),
    분할동수: 0,
    입주예정합산: 0,
    작업시간합계: 0, // 정밀 계산용 (분)
  };
}

/**
 * 입주예정 합산 (V1과 동일 로직)
 */
function getMoveInSum(dongName, moveInData, selectedYears) {
  if (!moveInData || !selectedYears || selectedYears.length === 0) return 0;
  const entry = moveInData[dongName];
  if (!entry) return 0;
  return selectedYears.reduce((sum, y) => sum + (entry[y] ?? 0), 0);
}

/**
 * 권역 마무리: 운영센터 배열화 + 법적인원/사무행정 산출
 */
function finalizeZone(s, staffingMode, unitTimes) {
  s.운영센터 = Array.from(s.운영센터집합).sort();
  delete s.운영센터집합;

  s.상담원수 = s.난이도점수 / 24000;
  s.난이도점수 = Math.round(s.난이도점수);

  // ────────────────────────────────────────────────
  // 법적인원 산출
  // ────────────────────────────────────────────────
  if (staffingMode === "precise" && unitTimes && s.작업시간합계 > 0) {
    // V2 정밀: 작업시간 / (1인 연간 가용시간) × 부대시간 배수
    const annual = STAFFING_RULES.annualMinutesPerPerson;
    const overhead = STAFFING_RULES.overheadMultiplier;
    s.법적인원 = Math.ceil((s.작업시간합계 * overhead) / annual);
    s.작업시간합계 = Math.round(s.작업시간합계);
  } else {
    // 간이: 등급별 합계를 단독/공동 비율로 환산
    // 등급 4.0 이하 = 공동 (저압 가정용 대다수가 아파트)
    // 등급 5.0 이상 = 영업/업무로 가정
    const r = STAFFING_RULES.legalInspector;
    let 가정세대 = 0;
    let 영업업무세대 = 0;
    Object.entries(s.등급별합계 ?? {}).forEach(([g, c]) => {
      const grade = parseFloat(g);
      if (grade <= 4.0) 가정세대 += c;
      else 영업업무세대 += c;
    });
    // 가정세대는 공동(4000) 기준, 영업/업무는 3000 기준
    s.법적공동 = Math.ceil(가정세대 / r.공동);
    s.법적영업 = Math.ceil(영업업무세대 / r.영업);
    s.법적인원 = s.법적공동 + s.법적영업;
  }

  // 사무행정 인원
  s.사무행정인원 =
    s.총수용가수 > 0 ? Math.ceil(s.총수용가수 / STAFFING_RULES.office) : 0;
}

/**
 * V2 정밀 계산: 행정동의 등급별 수용가수에 센터 단위시간을 곱해 작업시간 누적
 *
 * 단순화 모델:
 * - 가정용(등급 ≤ 4.0)은 공동 단위시간 적용
 * - 그 외(등급 5.0+)는 영업/업무 단위시간 적용
 * - 검침 12회/년 + 안전점검 2회/년(가정 가정) 기준
 */
function accumulateWorkTime(target, info, moveIn, sInfo, unitTimes) {
  const rules = unitTimes._meta?.rules ?? {};
  const annualVisits = rules.연간횟수 ?? {};
  const visitsCheck = annualVisits.검침 ?? 12;
  const visitsSafety = annualVisits["안전점검_가정_그외(11~15번)"] ?? 2;

  // 센터 선택: 분할동이면 primary 센터 기준 (단순화)
  const centerCode =
    sInfo?.primary?.center_code ?? info.centerCode ?? null;
  if (!centerCode) return;
  const centerData = unitTimes.centers?.[centerCode];
  if (!centerData) return;

  const t = centerData.검침점검원 ?? {};
  const 검침공동 = t.검침_공동 ?? 0;
  const 안전점검공동 = t.안전점검_공동 ?? 0;
  const 검침영업업무 = centerData.민원기사?.검침_영업업무기타 ?? 0;
  const 안전점검영업 = centerData.민원기사?.안전점검_영업 ?? 0;

  let 가정세대 = 0;
  let 영업세대 = 0;
  Object.entries(info.grades ?? {}).forEach(([g, c]) => {
    const grade = parseFloat(g);
    if (grade <= 4.0) 가정세대 += c;
    else 영업세대 += c;
  });
  // 입주예정은 공동(가정)으로 합산
  가정세대 += moveIn;

  // 작업시간(분) = (검침 12회 × 검침단위시간 + 안전점검 2회 × 안전점검단위시간) × 세대수
  const 가정작업시간 =
    가정세대 * (검침공동 * visitsCheck + 안전점검공동 * visitsSafety);
  const 영업작업시간 =
    영업세대 * (검침영업업무 * visitsCheck + 안전점검영업 * visitsSafety);

  target.작업시간합계 += 가정작업시간 + 영업작업시간;
}

/**
 * V2 권역 라벨
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
 * V1 호환 헬퍼
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
    법적인원: v2Stat.법적인원,
    사무행정인원: v2Stat.사무행정인원,
    단독: 0,
    공동: 0,
    영업: 0,
    도심권개수: 0,
  };
}

/**
 * 권역 균형도 평가 (V2)
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
