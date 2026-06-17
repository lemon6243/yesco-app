import { useEffect, useState } from "react";
import useAppStore from "../store/useAppStore";

/**
 * V2 데이터 통합 로더
 * - dongs_meters_by_grade.csv: 행정동×등급 피벗
 * - dongs_split_info.json: 분할동 메타데이터
 * - meter_weights.json: 등급별 가중치 (있으면 store 덮어쓰기)
 *
 * 반환: { metersByGrade, splitInfo, loading, error }
 *  - metersByGrade: { [행정동]: { centerCode, centerName, gu, grades: {2.5: 120, 4.0: 22500, ...}, total } }
 *  - splitInfo: dongs_split_info.json의 dongs 객체 그대로
 */
export function useV2Data() {
  const [metersByGrade, setMetersByGrade] = useState(null);
  const [splitInfo, setSplitInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setV2Loaded = useAppStore((s) => s.setV2Loaded);
  const setMeterGradeWeight = useAppStore((s) => s.setMeterGradeWeight);

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
      // meter_weights.json은 있으면 좋고 없어도 무관
      fetch("/data/meter_weights.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([csvText, splitJson, weightsJson]) => {
        if (cancelled) return;

        const parsed = parseGradeCsv(csvText);
        setMetersByGrade(parsed);
        setSplitInfo(splitJson.dongs ?? {});

        // meter_weights.json이 있고 grades 키가 있으면 store에 반영
        if (weightsJson && weightsJson.grades) {
          Object.entries(weightsJson.grades).forEach(([g, w]) => {
            const gNum = parseFloat(g);
            if (!isNaN(gNum) && typeof w === "number") {
              setMeterGradeWeight(gNum, w);
            }
          });
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
  }, [setV2Loaded, setMeterGradeWeight]);

  return { metersByGrade, splitInfo, loading, error };
}

/**
 * dongs_meters_by_grade.csv 파싱
 * 헤더 예시: 센터코드,센터명,자치구,행정동,2.5,3.0,4.0,...,1600.0,총합계
 * 반환: { [행정동]: { centerCode, centerName, gu, grades: {...}, total } }
 *
 * 분할동(같은 행정동이 여러 센터에 등장)은 자동 합산하되,
 * primary 센터 정보는 splitInfo에서 별도로 가져오므로 여기서는 첫 등장 센터를 유지.
 */
function parseGradeCsv(csvText) {
  // BOM 제거
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return {};

  const header = parseCsvLine(lines[0]);
  const idxCenterCode = header.indexOf("센터코드");
  const idxCenterName = header.indexOf("센터명");
  const idxGu = header.indexOf("자치구");
  const idxDong = header.indexOf("행정동");
  const idxTotal = header.indexOf("총합계");

  // 등급 컬럼: 센터코드/센터명/자치구/행정동/총합계 외 모두 등급
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
