import L from "leaflet";

/**
 * 분할동 빗금 패턴 SVG를 Leaflet 지도에 주입
 *
 * 사용법:
 *   ensureHatchPattern(map, "split-9005-9016", "#f97316", "#3b82f6");
 *   → 이후 styleFn에서 fillColor: "url(#split-9005-9016)" 로 사용 가능
 *
 * Leaflet은 GeoJSON 폴리곤을 <path>로 렌더하므로 SVG <defs>에 <pattern>을 한 번만 넣고
 * fill 속성으로 url(#패턴id)를 지정하면 됨.
 */

const PATTERN_PREFIX = "yesco-split-";

/**
 * 지도의 SVG 컨테이너에 빗금 패턴이 없으면 추가.
 * @param {L.Map} map - leaflet 맵 인스턴스
 * @param {string} patternId - 패턴 고유 ID (예: "9005-9016")
 * @param {string} baseColor - 바탕색 (주센터 색)
 * @param {string} stripeColor - 빗금색 (부센터 색)
 * @param {Object} [options]
 * @param {number} [options.stripeWidth=3] - 빗금 두께(px)
 * @param {number} [options.gap=6] - 빗금 간격(px)
 * @param {number} [options.angle=45] - 빗금 각도(도)
 * @param {number} [options.baseOpacity=0.55] - 바탕 불투명도
 * @param {number} [options.stripeOpacity=0.85] - 빗금 불투명도
 * @returns {string} url() 형태 fill 문자열 (예: "url(#yesco-split-9005-9016)")
 */
export function ensureHatchPattern(
  map,
  patternId,
  baseColor,
  stripeColor,
  options = {}
) {
  const {
    stripeWidth = 3,
    gap = 6,
    angle = 45,
    baseOpacity = 0.55,
    stripeOpacity = 0.85,
  } = options;

  const fullId = `${PATTERN_PREFIX}${patternId}`;

  // Leaflet의 SVG 오버레이 패널 찾기
  const svgPane = map.getPanes().overlayPane.querySelector("svg");
  if (!svgPane) {
    // 아직 SVG가 안 생긴 경우 — GeoJSON이 그려질 때 함께 생성됨
    // 다음 프레임에 다시 시도
    return null;
  }

  // 이미 패턴이 있으면 재사용
  if (svgPane.querySelector(`#${fullId}`)) {
    return `url(#${fullId})`;
  }

  // <defs> 확보
  let defs = svgPane.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svgPane.insertBefore(defs, svgPane.firstChild);
  }

  // <pattern> 생성
  const size = stripeWidth + gap;
  const pattern = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "pattern"
  );
  pattern.setAttribute("id", fullId);
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("width", String(size));
  pattern.setAttribute("height", String(size));
  pattern.setAttribute(
    "patternTransform",
    `rotate(${angle})`
  );

  // 바탕 사각형
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", String(size));
  bg.setAttribute("height", String(size));
  bg.setAttribute("fill", baseColor);
  bg.setAttribute("fill-opacity", String(baseOpacity));
  pattern.appendChild(bg);

  // 빗금 선
  const stripe = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect"
  );
  stripe.setAttribute("width", String(stripeWidth));
  stripe.setAttribute("height", String(size));
  stripe.setAttribute("fill", stripeColor);
  stripe.setAttribute("fill-opacity", String(stripeOpacity));
  pattern.appendChild(stripe);

  defs.appendChild(pattern);

  return `url(#${fullId})`;
}

/**
 * 분할동 패턴 ID 생성 (정렬된 센터 코드로 통일)
 * 한남동(9005+9016) → "9005-9016"
 */
export function makeSplitPatternId(centerCodes) {
  return [...centerCodes].sort().join("-");
}

/**
 * 분할동의 빗금 fill 문자열 반환 (지도와 splitInfo 필요)
 *
 * @param {L.Map} map
 * @param {Object} dongSplitInfo - splitInfo[행정동] 객체
 *   { is_split, primary: {center_code}, secondary: [{center_code}], ... }
 * @param {Function} getColorByCenter - 센터코드 → 색상 함수
 * @param {Object} [styleOptions] - ensureHatchPattern 옵션
 * @returns {string|null} fill URL 또는 null (단일동인 경우)
 */
export function getSplitDongFill(
  map,
  dongSplitInfo,
  getColorByCenter,
  styleOptions = {}
) {
  if (!dongSplitInfo || !dongSplitInfo.is_split) return null;

  const primaryCode = dongSplitInfo.primary.center_code;
  const baseColor = getColorByCenter(primaryCode);

  // 부센터가 여러 개일 수도 있지만, 첫 번째(비중 큰)만 빗금에 반영
  // 그 이상은 배지로 보완
  const secondaryCode = dongSplitInfo.secondary?.[0]?.center_code;
  if (!secondaryCode) return null;

  const stripeColor = getColorByCenter(secondaryCode);
  const patternId = makeSplitPatternId([primaryCode, secondaryCode]);

  return ensureHatchPattern(
    map,
    patternId,
    baseColor,
    stripeColor,
    styleOptions
  );
}

/**
 * 분할동 텍스트 라벨 생성
 * 예: "9005(62%) + 9016(38%)"
 */
export function formatSplitLabel(dongSplitInfo) {
  if (!dongSplitInfo || !dongSplitInfo.is_split) return null;

  const pct = (r) => Math.round((r ?? 0) * 100);
  const parts = [
    `${dongSplitInfo.primary.center_code}(${pct(dongSplitInfo.primary.ratio)}%)`,
  ];
  dongSplitInfo.secondary?.forEach((s) => {
    parts.push(`${s.center_code}(${pct(s.ratio)}%)`);
  });
  return parts.join(" + ");
}
