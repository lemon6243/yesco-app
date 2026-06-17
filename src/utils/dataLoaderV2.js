import { useEffect, useState } from "react";
import useAppStore from "../store/useAppStore";

/**
 * V2 데이터 통합 로더
 * - dongs_meters_by_grade.csv: 행정동×등급 피벗
 * - dongs_split_info.json: 분할동 메타데이터
 * - meter_weights.json: 등급별 가중치
 * - move_in_plan.csv: 입주예정 세대수 (V1/V2 공통)
 * - centers_unit_times.json: 법적인원 정밀 계산용
 *
 * 반환: { metersByGrade, splitInfo, loading, error }
 */
export function useV2Data() {
  const [metersByGrade, setMetersByGrade] = useState(null);
  const [splitInfo, setSplitInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setV2Loaded = useAppStore((s) => s.setV2Loaded);
  const setMeterGradeWeight = useAppStore((s) => s.setMeterGradeWeight);
  const setMoveInData = useAppStore((s) => s.setMoveInData);
  const setUnitTimes = useAppStore((s) => s.setUnitTimes);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/data/dongs_meters_by_grade.csv").then((r) => {
        if (!r.ok) throw new Error(`grade CSV: HTTP ${r.status}`);
        return r.text();
      }),
      fetch("/data/dongs_split_info.json").then((r) => {
        if (!r.ok) throw new Error(`split JSON: HTTP ${r.status}`);
        return r.json();
      }),
      fetch("/data/meter_weights.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      // 입주예정 데이터 (선택적)
      fetch("/data/move_in_plan.csv")
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null),
      // 법적인원 정밀 계산용 단위시간 (선택적)
      fetch("/data/centers_unit_times.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([csvText, splitJson, weightsJson, moveInCsv, unitTimesJson]) => {
        if (cancelled) return;

        // 1) 등급별 데이터
        const parsed = parseGradeCsv(csvText);
        setMetersByGrade(parsed);

        // 2) 분할동
        setSplitInfo(splitJson.dongs ?? {});

        // 3) 가중치 (있을 때만)
        if (weightsJson && weightsJson.grades) {
          Object.entries(weightsJson.grades).forEach(([g, w]) => {
            const gNum = parseFloat(g);
            if (!isNaN(gNum) && typeof w === "number") {
              setMeterGradeWeight(gNum, w);
            }
          });
        }

        // 4) 입주예정 데이터 (있을 때만)
        if (moveInCsv) {
          const moveInParsed = parseMoveInCsv(moveInCsv);
          setMoveInData(moveInParsed);
          console.log(
            `🏗️ 입주예정 데이터 로드 완료: ${Object.keys(moveInParsed).length}개 동`
          );
        }

        // 5) 단위시간 (있을 때만)
        if (unitTimesJson) {
          setUnitTimes(unitTimesJson);
          console.log("⏱️ 단위시간 데이터 로드 완료");
        }

        setV2Loaded(true);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("V2 데이터 로드 실패:", e);
        setError(e.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    setV2Loaded,
    setMeterGradeWeight,
    setMoveInData,
    setUnitTimes,
  ]);

  return { metersByGrade, splitInfo, loading, error };
}

/**
 * dongs_meters_by_grade.csv 파싱
 */
function parseGradeCsv(csvText) {
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return {};

  const header = parseCsvLine(lines[0]);
  const idxCenterCode = header.indexOf("센터코드");
  const idxCenterName = header.indexOf("센터명");
  const idxGu = header.indexOf("자치구");
  const idxDong = header.indexOf("행정동");
  const idxTotal = header.indexOf("총합계");

  const gradeColumns = header
    .map((col, i) => {
      const num = parseFloat(col);
      if (
        !isNaN(num) &&
        i !== idxCenterCode &&
        i !== idxCenterName &&
        i !== idxGu &&
        i !== idxDong &&
        i !== idxTotal
      ) {
        return { index: i, grade: num };
      }
      return null;
    })
    .filter(Boolean);

  const result = {};

  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]);
    if (!cells.length) continue;

    const dong = cells[idxDong]?.trim();
    if (!dong) continue;

    const centerCode = cells[idxCenterCode]?.trim() ?? "";
    const centerName = cells[idxCenterName]?.trim() ?? "";
    const gu = cells[idxGu]?.trim() ?? "";

    if (!result[dong]) {
      result[dong] = {
        centerCode,
        centerName,
        gu,
        grades: {},
        total: 0,
      };
    }

    const entry = result[dong];
    gradeColumns.forEach(({ index, grade }) => {
      const v = parseFloat(cells[index]);
      if (!isNaN(v) && v > 0) {
        entry.grades[grade] = (entry.grades[grade] ?? 0) + v;
      }
    });

    const totalCell = parseFloat(cells[idxTotal]);
    if (!isNaN(totalCell)) {
      entry.total += totalCell;
    }
  }

  return result;
}

/**
 * move_in_plan.csv 파싱
 * 헤더: 행정동,2026,2027,2028,2029,2030,주요사업,비고
 * 반환: { [행정동]: { 2026: n, 2027: n, ..., 2030: n, note: "..." } }
 */
function parseMoveInCsv(csvText) {
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return {};

  const header = parseCsvLine(lines[0]);
  const idxDong = header.indexOf("행정동");
  const idxNote = header.indexOf("주요사업");

  // 연도 컬럼 인덱스 (2026~2030 등 숫자 헤더)
  const yearColumns = header
    .map((col, i) => {
      const num = parseInt(col, 10);
      if (!isNaN(num) && num >= 2020 && num <= 2040) {
        return { index: i, year: num };
      }
      return null;
    })
    .filter(Boolean);

  const result = {};

  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]);
    if (!cells.length) continue;

    const dong = cells[idxDong]?.trim();
    if (!dong) continue;

    const entry = { note: idxNote >= 0 ? cells[idxNote]?.trim() ?? "" : "" };
    yearColumns.forEach(({ index, year }) => {
      const v = parseInt(cells[index], 10);
      entry[year] = isNaN(v) ? 0 : v;
    });

    result[dong] = entry;
  }

  return result;
}

/**
 * 간단한 CSV 라인 파서 (따옴표 처리 포함)
 */
function parseCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ",") {
        result.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  result.push(cur);
  return result;
}
