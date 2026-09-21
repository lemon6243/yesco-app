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
    geoData = null,
  } = options;

  // geoData가 있으면 행정동별 단독/공동/영업 보조 맵 생성
  const geoHousingMap = {};
  if (geoData?.features) {
    geoData.features.forEach((f) => {
      const p = f.properties;
      if (p?.행정동) {
        geoHousingMap[p.행정동] = {
          단독: p.단독 ?? 0,
          공동: p.공동 ?? 0,
          영업: p.영업 ?? 0,
          합계: p.합계 ?? 0,
        };
      }
    });
  }

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

    // 단독, 공동, 영업 세대수 누적
    // 1) metersByGrade에 첨부된 dongs_unified 데이터 우선 사용
    // 2) 없으면 geoData.features에서 조회
    const geoH = geoHousingMap[dong];
    const dan = info.단독 ?? geoH?.단독 ?? 0;
    const gong = (info.공동 ?? geoH?.공동 ?? 0) + moveIn; // 입주예정은 신축 아파트(공동)로 합산
    const yeong = info.영업 ?? geoH?.영업 ?? 0;

    target.단독 += dan;
    target.공동 += gong;
    target.영업 += yeong;
    target.합계 += dan + gong + yeong;

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
    단독: 0,
    공동: 0,
    영업: 0,
    합계: 0,
    총수용가수: 0,
    난이도점수: 0,
    등급별합계: {},
    운영센터집합: new Set(),
    분할동수: 0,
    입주예정합산: 0,
    작업시간합계: 0, // 정밀 계산용 (분)
    법적단독: 0,
    법적공동: 0,
    법적영업: 0,
    법적인원: 0,
    사무행정인원: 0,
    상담원수: 0,
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

  // 사무행정 인원 (우리 회사는 분산형 콜센터라 24,000명당 1명)
  const baseTotal = s.총수용가수 > 0 ? s.총수용가수 : (s.합계 > 0 ? s.합계 : 0);
  s.사무행정인원 = baseTotal > 0 ? Math.ceil(baseTotal / STAFFING_RULES.office) : 0;
  s.상담원수 = baseTotal / STAFFING_RULES.office;
  s.난이도점수 = Math.round(s.난이도점수);

  // ────────────────────────────────────────────────
  // 법적인원 산출 (단독 3000 / 공동 4000 / 영업 3000)
  // ────────────────────────────────────────────────
  const r = STAFFING_RULES.legalInspector;

  if (s.단독 > 0 || s.공동 > 0 || s.영업 > 0) {
    s.법적단독 = Math.ceil(s.단독 / r.단독);
    s.법적공동 = Math.ceil(s.공동 / r.공동);
    s.법적영업 = Math.ceil(s.영업 / r.영업);
  } else {
    // 단독/공동 세부 데이터가 누락된 경우 등급 기반 폴백 (단독 34.5%, 공동 65.5% 비율)
    let 가정세대 = 0;
    let 영업업무세대 = 0;
    Object.entries(s.등급별합계 ?? {}).forEach(([g, c]) => {
      const grade = parseFloat(g);
      if (grade <= 4.0) 가정세대 += c;
      else 영업업무세대 += c;
    });
    const fallbackDan = Math.round(가정세대 * 0.345);
    const fallbackGong = 가정세대 - fallbackDan;
    s.법적단독 = Math.ceil(fallbackDan / r.단독);
    s.법적공동 = Math.ceil(fallbackGong / r.공동);
    s.법적영업 = Math.ceil(영업업무세대 / r.영업);
  }

  if (staffingMode === "precise" && unitTimes && s.작업시간합계 > 0) {
    // V2 정밀: 작업시간 / (1인 연간 가용시간) × 부대시간 배수
    const annual = STAFFING_RULES.annualMinutesPerPerson;
    const overhead = STAFFING_RULES.overheadMultiplier;
    s.법적인원 = Math.ceil((s.작업시간합계 * overhead) / annual);
    s.작업시간합계 = Math.round(s.작업시간합계);
  } else {
    // V2 간이: 단독 3000, 공동 4000, 영업 3000 각각 올림 합산
    s.법적인원 = s.법적단독 + s.법적공동 + s.법적영업;
  }
}

/**
 * V2 정밀 계산: 행정동의 등급별 수용가수에 센터 단위시간을 곱해 작업시간 누적
 */
function accumulateWorkTime(target, info, moveIn, sInfo, unitTimes) {
  const rules = unitTimes._meta?.rules ?? {};
  const annualVisits = rules.연간횟수 ?? {};
  const visitsCheck = annualVisits.검침 ?? 12;
  const visitsSafety = annualVisits["안전점검_가정_그외(11~15번)"] ?? 2;

  // 센터 선택: 분할동이면 primary 센터 기준
  const centerCode =
    sInfo?.primary?.center_code ?? info.centerCode ?? null;
  if (!centerCode) return;
  const centerData = unitTimes.centers?.[centerCode];
  if (!centerData) return;

  const t = centerData.검침점검원 ?? {};
  const 검침단독 = t.검침_단독 ?? t.검침_공동 ?? 0;
  const 안전점검단독 = t.안전점검_단독 ?? t.안전점검_공동 ?? 0;
  const 검침공동 = t.검침_공동 ?? 0;
  const 안전점검공동 = t.안전점검_공동 ?? 0;
  const 검침영업 = centerData.민원기사?.검침_영업업무기타 ?? 0;
  const 안전점검영업 = centerData.민원기사?.안전점검_영업 ?? 0;

  const dan = info.단독 ?? 0;
  const gong = (info.공동 ?? 0) + moveIn;
  const yeong = info.영업 ?? 0;

  if (dan > 0 || gong > 0 || yeong > 0) {
    const 단독작업시간 = dan * (검침단독 * visitsCheck + 안전점검단독 * visitsSafety);
    const 공동작업시간 = gong * (검침공동 * visitsCheck + 안전점검공동 * visitsSafety);
    const 영업작업시간 = yeong * (검침영업 * visitsCheck + 안전점검영업 * visitsSafety);
    target.작업시간합계 += 단독작업시간 + 공동작업시간 + 영업작업시간;
  } else {
    // 폴백: 등급 기준
    let 가정세대 = 0;
    let 영업세대 = 0;
    Object.entries(info.grades ?? {}).forEach(([g, c]) => {
      const grade = parseFloat(g);
      if (grade <= 4.0) 가정세대 += c;
      else 영업세대 += c;
    });
    가정세대 += moveIn;

    const 가정작업시간 =
      가정세대 * (검침공동 * visitsCheck + 안전점검공동 * visitsSafety);
    const 영업작업시간 =
      영업세대 * (검침영업 * visitsCheck + 안전점검영업 * visitsSafety);

    target.작업시간합계 += 가정작업시간 + 영업작업시간;
  }
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
