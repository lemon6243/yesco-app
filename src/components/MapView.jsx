import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getMainCenter, getColorByCenter } from "../utils/colorPalette";
import useAppStore, { ZONE_COLORS } from "../store/useAppStore";
import { useAdjacencyMap } from "../utils/dataLoader";
import { useV2Data } from "../utils/dataLoaderV2";
import { checkAdjacency } from "../utils/validator";
import { calculateZoneStats } from "../utils/zoneCalculator";
import { calculateZoneStatsV2 } from "../utils/zoneCalculatorV2";
import {
  getSplitDongFill,
  formatSplitLabel,
} from "../utils/splitDongStyle";

const SEOUL_CENTER = [37.5665, 126.978];
const DEFAULT_ZOOM = 11;
const LABEL_MIN_ZOOM = 12;

function ZoomWatcher({ onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoomChange(map.getZoom());
    map.on("zoomend", handler);
    onZoomChange(map.getZoom());
    return () => map.off("zoomend", handler);
  }, [map, onZoomChange]);
  return null;
}

// V2 분할동 빗금 패턴을 지도에 사전 주입하는 컴포넌트
function SplitPatternInjector({ splitInfo }) {
  const map = useMap();
  useEffect(() => {
    if (!splitInfo || !map) return;
    // 다음 프레임에 실행 (SVG가 생성된 뒤)
    const timer = setTimeout(() => {
      Object.values(splitInfo).forEach((info) => {
        if (info.is_split) {
          getSplitDongFill(map, info, getColorByCenter);
        }
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [map, splitInfo]);
  return null;
}

function getPolygonCenter(geometry) {
  let coords = [];
  if (geometry.type === "Polygon") {
    coords = geometry.coordinates[0];
  } else if (geometry.type === "MultiPolygon") {
    let maxLen = 0;
    geometry.coordinates.forEach((poly) => {
      if (poly[0].length > maxLen) {
        maxLen = poly[0].length;
        coords = poly[0];
      }
    });
  }
  if (!coords.length) return null;
  let sx = 0, sy = 0;
  coords.forEach(([x, y]) => {
    sx += x;
    sy += y;
  });
  return [sy / coords.length, sx / coords.length];
}

function formatLabel(props, labelType) {
  const name = props.행정동 ?? "";
  const total = props.합계 ?? 0;
  if (labelType === "name") return name;
  if (labelType === "total") return total.toLocaleString();
  return `${name}<br/><span style="font-weight:normal;color:#444">${total.toLocaleString()}</span>`;
}

export default function MapView({ onDataLoaded }) {
  const [geoData, setGeoData] = useState(null);
  const [error, setError] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);

  const appMode = useAppStore((s) => s.appMode);
  const viewMode = useAppStore((s) => s.viewMode);
  const dongAssignments = useAppStore((s) => s.dongAssignments);
  const zoneCount = useAppStore((s) => s.zoneCount);
  const selectedZone = useAppStore((s) => s.selectedZone);
  const setSelectedZone = useAppStore((s) => s.setSelectedZone);
  const showLabels = useAppStore((s) => s.showLabels);
  const labelType = useAppStore((s) => s.labelType);
  const showSplitHatch = useAppStore((s) => s.showSplitHatch);

  const isZoneConfirmed = useAppStore((s) => s.isZoneConfirmed);
  const toggleZoneConfirmed = useAppStore((s) => s.toggleZoneConfirmed);
  const showZoneOverviewLabels = useAppStore((s) => s.showZoneOverviewLabels);
  const focusedZone = useAppStore((s) => s.focusedZone);

  // 입주예정 및 가중치 데이터 (우측 권역 패널과 100% 동일한 수치 연동)
  const moveInData = useAppStore((s) => s.moveInData);
  const selectedMoveInYears = useAppStore((s) => s.selectedMoveInYears);
  const weights = useAppStore((s) => s.weights);
  const meterGradeWeights = useAppStore((s) => s.meterGradeWeights);

  const adjacencyMap = useAdjacencyMap();
  // V2 데이터는 모든 모드에서 백그라운드 로딩 (전환 시 즉시 사용 가능)
  const { metersByGrade, splitInfo } = useV2Data();

  const isV2 = appMode === "v2";

  // 우측 패널(ZonePanel)과 완전히 동일한 로직으로 각 권역별 세대수 및 입주예정 합산 통계 산출
  const zoneStats = useMemo(() => {
    const commonOpts = {
      moveInData,
      selectedMoveInYears,
      geoData,
    };
    if (isV2) {
      if (!metersByGrade) return null;
      return calculateZoneStatsV2(
        metersByGrade,
        splitInfo,
        dongAssignments,
        zoneCount,
        meterGradeWeights,
        commonOpts
      ).zones;
    }
    if (!geoData?.features) return null;
    return calculateZoneStats(
      geoData.features,
      dongAssignments,
      zoneCount,
      weights,
      commonOpts
    ).zones;
  }, [
    isV2,
    geoData,
    metersByGrade,
    splitInfo,
    dongAssignments,
    zoneCount,
    weights,
    meterGradeWeights,
    moveInData,
    selectedMoveInYears,
  ]);

  // 확정된 권역별 중심 좌표 및 요약 정보 계산 (입주예정 반영 합계 세대수 적용)
  const confirmedZoneOverviews = useMemo(() => {
    if (!geoData?.features) return [];
    const zones = [];
    for (let z = 1; z <= zoneCount; z++) {
      const zFeatures = geoData.features.filter(
        (f) => dongAssignments[f.properties.행정동] === z
      );
      if (zFeatures.length === 0) continue;

      let sumLat = 0;
      let sumLng = 0;
      let minLat = 90,
        maxLat = -90,
        minLng = 180,
        maxLng = -180;
      const centerFrequencies = {};

      zFeatures.forEach((f) => {
        const c = getPolygonCenter(f.geometry);
        if (c) {
          sumLat += c[0];
          sumLng += c[1];
          if (c[0] < minLat) minLat = c[0];
          if (c[0] > maxLat) maxLat = c[0];
          if (c[1] < minLng) minLng = c[1];
          if (c[1] > maxLng) maxLng = c[1];
        }
        const cName = f.properties.주센터명 || f.properties.주센터번호;
        if (cName) {
          centerFrequencies[cName] = (centerFrequencies[cName] || 0) + 1;
        }
      });

      const topCenters = Object.entries(centerFrequencies)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
        .slice(0, 2)
        .join("·");

      // 우측 슬라이드 패널의 세대수 합계(입주예정 합산 포함)와 정확히 일치하도록 연동
      const zStat = zoneStats?.[z];
      const totalH = zStat
        ? isV2
          ? zStat.총수용가수 ?? 0
          : zStat.합계 ?? 0
        : zFeatures.reduce((sum, f) => sum + (f.properties.합계 ?? 0), 0);
      const moveInSum = zStat?.입주예정합산 ?? 0;

      zones.push({
        zone: z,
        center: [sumLat / zFeatures.length, sumLng / zFeatures.length],
        bounds: [
          [minLat, minLng],
          [maxLat, maxLng],
        ],
        dongCount: zFeatures.length,
        totalHouseholds: totalH,
        moveIn: moveInSum,
        topCenters: topCenters || `${zFeatures.length}개동`,
      });
    }
    return zones;
  }, [geoData, dongAssignments, zoneCount, zoneStats, isV2]);

  const isolatedDongs = useMemo(() => {
    if (!Object.keys(adjacencyMap).length) return new Set();
    const issues = checkAdjacency(dongAssignments, adjacencyMap, zoneCount);
    const set = new Set();
    Object.values(issues).forEach((iss) =>
      iss.isolatedDongs.forEach((d) => set.add(d))
    );
    return set;
  }, [dongAssignments, adjacencyMap, zoneCount]);

  useEffect(() => {
    fetch("/data/yesco_dongs.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setGeoData(data);
        if (onDataLoaded) onDataLoaded(data);
      })
      .catch((err) => setError(err.message));
  }, [onDataLoaded]);

  const geoKey = useMemo(
    () =>
      `${appMode}-${viewMode}-${selectedZone}-${isZoneConfirmed}-${JSON.stringify(
        dongAssignments
      )}-${isolatedDongs.size}-${showSplitHatch}-${splitInfo ? "s" : "n"}-${selectedMoveInYears.join(
        ","
      )}`,
    [
      appMode,
      viewMode,
      selectedZone,
      isZoneConfirmed,
      dongAssignments,
      isolatedDongs,
      showSplitHatch,
      splitInfo,
      selectedMoveInYears,
    ]
  );

  const styleFn = (feature) => {
    const p = feature.properties;
    const name = p.행정동;
    const assignedZone = dongAssignments[name];

    let fillColor;
    let fillOpacity;

    // V2: 미할당 분할동은 빗금으로 표시
    const sInfo = splitInfo?.[name];
    const isSplitDong = isV2 && showSplitHatch && sInfo?.is_split;

    if (isZoneConfirmed) {
      // 권역 확정 모드: 권역별 색상으로 확정 지도 표현
      fillColor = assignedZone
        ? ZONE_COLORS[(assignedZone - 1) % ZONE_COLORS.length]
        : "#cbd5e1";
      fillOpacity = assignedZone ? 0.75 : 0.25;
    } else if (viewMode === "center") {
      if (isSplitDong && !assignedZone) {
        // 분할동: 빗금 패턴 적용 (URL 문자열은 미리 주입됨)
        fillColor = makeSplitFillUrl(sInfo);
        fillOpacity = 1; // 패턴 자체에 opacity 포함
      } else {
        fillColor = getColorByCenter(getMainCenter(p));
        fillOpacity = 0.55;
      }
    } else if (viewMode === "zone") {
      fillColor = assignedZone
        ? ZONE_COLORS[(assignedZone - 1) % ZONE_COLORS.length]
        : "#e5e7eb";
      fillOpacity = assignedZone ? 0.65 : 0.25;
    } else {
      // hybrid
      if (assignedZone) {
        fillColor = ZONE_COLORS[(assignedZone - 1) % ZONE_COLORS.length];
        fillOpacity = 0.7;
      } else if (isSplitDong) {
        fillColor = makeSplitFillUrl(sInfo);
        fillOpacity = 1;
      } else {
        fillColor = getColorByCenter(getMainCenter(p));
        fillOpacity = 0.3;
      }
    }

    const isolated = isolatedDongs.has(name);
    const isSelectedZone = assignedZone && assignedZone === selectedZone;

    return {
      fillColor,
      weight: isolated ? 3 : isSelectedZone ? 3.5 : isZoneConfirmed ? 1.5 : 1,
      opacity: 1,
      color: isolated ? "#dc2626" : isSelectedZone ? "#1e3a8a" : isZoneConfirmed ? "#334155" : "#333",
      dashArray: isolated ? "4,3" : "",
      fillOpacity: isSelectedZone
        ? Math.min(fillOpacity + 0.15, 0.92)
        : fillOpacity,
    };
  };

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    const name = p.행정동;
    layer.bindTooltip(name ?? "", { sticky: true });

    layer.on({
      click: (e) => {
        const state = useAppStore.getState();
        const z = state.selectedZone;
        if (e.originalEvent.shiftKey) state.clearDong(name);
        else if (z) state.assignDong(name, z);
      },
      mouseover: (e) => {
        e.target.setStyle({ weight: 4, color: "#000" });
      },
      mouseout: (e) => {
        const isolated = isolatedDongs.has(name);
        const assignedZone = dongAssignments[name];
        const isSelectedZone = assignedZone && assignedZone === selectedZone;
        e.target.setStyle({
          weight: isolated ? 3 : isSelectedZone ? 3 : 1,
          color: isolated ? "#dc2626" : isSelectedZone ? "#000" : "#333",
        });
      },
    });

    const isolated = isolatedDongs.has(name);
    const assignedZone = dongAssignments[name];
    const sInfo = splitInfo?.[name];
    const v2Info = metersByGrade?.[name];

    // V2 모드일 때는 등급별 정보 포함 팝업
    let popupHtml;
    if (isV2 && v2Info) {
      const topGrades = Object.entries(v2Info.grades ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([g, c]) => `<span style="color:#555">${g}:</span> ${c.toLocaleString()}`)
        .join(" / ");

      popupHtml = `
        <div style="font-size:13px;line-height:1.6;min-width:240px">
          <b>${name ?? "-"}</b>${
        isolated ? ' <span style="color:#dc2626">⚠ 고립</span>' : ""
      }${
        sInfo?.is_split
          ? ' <span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:3px;font-size:11px">분할동</span>'
          : ""
      }<br/>
          ${
            assignedZone
              ? `<span style="color:#0066cc"><b>권역 ${assignedZone}에 할당됨</b></span><br/>`
              : ""
          }
          ${
            sInfo?.is_split
              ? `<span style="color:#92400e">관할: ${formatSplitLabel(sInfo)}</span><br/>`
              : `운영센터: ${v2Info.centerCode ?? "-"}<br/>`
          }
          <b>총 수용가: ${(v2Info.total ?? 0).toLocaleString()}</b><br/>
          <span style="color:#666;font-size:11px">상위 등급: ${topGrades}</span><br/>
          <span style="color:#666;font-size:11px">클릭: 권역 할당 / Shift+클릭: 해제</span>
        </div>
      `;
    } else {
      // V1 기존 팝업
      popupHtml = `
        <div style="font-size:13px;line-height:1.6">
          <b>${name ?? "-"}</b>${
        isolated ? ' <span style="color:#dc2626">⚠ 고립</span>' : ""
      }<br/>
          ${
            assignedZone
              ? `<span style="color:#0066cc"><b>권역 ${assignedZone}에 할당됨</b></span><br/>`
              : ""
          }
          운영센터: ${p.운영센터 ?? p.주센터번호 ?? "-"}<br/>
          단독: ${(p.단독 ?? 0).toLocaleString()}<br/>
          공동: ${(p.공동 ?? 0).toLocaleString()}<br/>
          영업: ${(p.영업 ?? 0).toLocaleString()}<br/>
          <b>합계: ${(p.합계 ?? 0).toLocaleString()}</b><br/>
          도심권: ${p.is_downtown ? "✅" : "—"}<br/>
          <span style="color:#666">클릭: 권역 할당 / Shift+클릭: 해제</span>
        </div>
      `;
    }
    layer.bindPopup(popupHtml);
  };

  const labelData = useMemo(() => {
    if (!geoData) return [];
    return geoData.features
      .map((f) => {
        const center = getPolygonCenter(f.geometry);
        if (!center) return null;
        return {
          name: f.properties.행정동,
          center,
          html: formatLabel(f.properties, labelType),
        };
      })
      .filter(Boolean);
  }, [geoData, labelType]);

  const showLabelsNow = showLabels && currentZoom >= LABEL_MIN_ZOOM;

  if (error) {
    return <div className="p-4 text-red-600">GeoJSON 로드 실패: {error}</div>;
  }

  return (
    <MapContainer
      center={SEOUL_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomWatcher onZoomChange={setCurrentZoom} />
      <FocusedZoneController
        focusedZone={focusedZone}
        confirmedZoneOverviews={confirmedZoneOverviews}
      />
      {isV2 && splitInfo && <SplitPatternInjector splitInfo={splitInfo} />}
      {geoData && (
        <GeoJSON
          key={geoKey}
          data={geoData}
          style={styleFn}
          onEachFeature={onEachFeature}
        />
      )}

      {/* 권역 확정 또는 권역 개요 라벨 (확정 시 또는 상시 보기 옵션 켰을 때 표시) */}
      {(isZoneConfirmed || showZoneOverviewLabels) &&
        confirmedZoneOverviews.map((zo) => (
          <ZoneOverviewMarker
            key={`zone-marker-${zo.zone}`}
            zoneData={zo}
            isSelected={selectedZone === zo.zone}
            onClick={(z) => setSelectedZone(z)}
          />
        ))}

      {/* 동별 상세 라벨 (줌 12 이상일 때) */}
      {showLabelsNow &&
        labelData.map((item, i) => (
          <LabelMarker key={item.name + i} item={item} />
        ))}

      {/* 상단 확정 모드 안내 배너 */}
      {isZoneConfirmed ? (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-800/90 hover:bg-emerald-800 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2.5 border border-emerald-400 z-[1000] transition"
        >
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>🔒 <b>권역 확정됨</b> (지도에 권역별 통합 라벨링 표기 중)</span>
          </span>
          <button
            onClick={toggleZoneConfirmed}
            className="bg-white/20 hover:bg-white/30 active:scale-95 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer"
          >
            수정 모드로 전환
          </button>
        </div>
      ) : confirmedZoneOverviews.length > 0 ? (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-sm text-slate-100 text-xs px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-2 border border-slate-700 z-[1000] transition"
        >
          <span>시뮬레이션 배정 중 ({Object.keys(dongAssignments).length}개동 할당)</span>
          <button
            onClick={toggleZoneConfirmed}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-0.5 rounded text-[11px] transition shadow cursor-pointer"
          >
            🔒 권역 확정
          </button>
        </div>
      ) : null}

      {showLabels && currentZoom < LABEL_MIN_ZOOM && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded"
          style={{ zIndex: 1000 }}
        >
          🔍 줌을 더 확대하면 행정동 상세 라벨이 표시됩니다 (현재 {currentZoom} / 필요{" "}
          {LABEL_MIN_ZOOM})
        </div>
      )}
      {isV2 && (
        <div
          className="absolute top-12 right-3 bg-amber-100 border border-amber-400 text-amber-900 text-xs px-2 py-1 rounded shadow"
          style={{ zIndex: 1000 }}
        >
          ⚡ V2 모드 (등급 기반)
        </div>
      )}
    </MapContainer>
  );
}

// ──────────────────────────────────────────────────────────
// 특정 권역 포커스 (지도 뷰 부드럽게 이동)
// ──────────────────────────────────────────────────────────
function FocusedZoneController({ focusedZone, confirmedZoneOverviews }) {
  const map = useMap();
  useEffect(() => {
    if (!focusedZone) return;
    const target = confirmedZoneOverviews.find((zo) => zo.zone === focusedZone);
    if (target && target.bounds && target.bounds[0][0] <= target.bounds[1][0]) {
      map.fitBounds(target.bounds, {
        padding: [50, 50],
        maxZoom: 13,
        animate: true,
      });
    }
  }, [focusedZone, confirmedZoneOverviews, map]);
  return null;
}

// ──────────────────────────────────────────────────────────
// 지도 권역 대형 라벨 마커 (1권역, 2권역 등 한눈에 파악)
// ──────────────────────────────────────────────────────────
function ZoneOverviewMarker({ zoneData, isSelected, onClick }) {
  const map = useMap();
  useEffect(() => {
    const color = ZONE_COLORS[(zoneData.zone - 1) % ZONE_COLORS.length];
    const householdsK = (zoneData.totalHouseholds / 10000).toFixed(1);

    const icon = L.divIcon({
      className: "zone-overview-card",
      html: `
        <div id="map-zone-badge-${zoneData.zone}" class="zone-overview-card ${
          isSelected ? "is-selected zone-pulse-active" : ""
        }" style="
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.28), 0 0 0 ${
            isSelected ? "3.5px #1d4ed8" : "1.5px rgba(0,0,0,0.18)"
          };
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-width: 108px;
          max-width: 140px;
          text-align: center;
          cursor: pointer;
        ">
          <div style="
            background: ${color};
            color: #ffffff;
            font-size: 13px;
            font-weight: 800;
            padding: 5px 8px 4px;
            letter-spacing: -0.3px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          ">
            <span>${zoneData.zone} 권역</span>
            ${
              isSelected
                ? '<span style="font-size:9px;background:rgba(255,255,255,0.35);padding:1px 4px;border-radius:3px;font-weight:700;">선택</span>'
                : ""
            }
          </div>
          <div style="
            padding: 4px 7px 5px;
            background: #ffffff;
          ">
            <div style="font-size: 11px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${zoneData.topCenters}
            </div>
            <div title="총 ${zoneData.totalHouseholds.toLocaleString()}세대${
              zoneData.moveIn > 0
                ? ` (입주예정 +${zoneData.moveIn.toLocaleString()} 반영)`
                : ""
            }" style="font-size: 10px; color: #64748b; margin-top: 1px; font-weight: 500;">
              ${zoneData.dongCount}개동 · <b>${householdsK}만</b>
            </div>
          </div>
        </div>
      `,
      iconSize: [0, 0],
    });

    const marker = L.marker(zoneData.center, {
      icon,
      zIndexOffset: isSelected ? 3500 : 1500,
    }).addTo(map);

    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      onClick(zoneData.zone);
    });

    return () => {
      map.removeLayer(marker);
    };
  }, [map, zoneData, isSelected, onClick]);

  return null;
}

function LabelMarker({ item }) {
  const map = useMap();
  useEffect(() => {
    const icon = L.divIcon({
      className: "dong-label",
      html: `<div style="
        font-size:11px;
        font-weight:bold;
        color:#111;
        text-shadow: 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff;
        white-space:nowrap;
        text-align:center;
        pointer-events:none;
      ">${item.html}</div>`,
      iconSize: [80, 20],
      iconAnchor: [40, 10],
    });
    const marker = L.marker(item.center, {
      icon,
      interactive: false,
      keyboard: false,
    }).addTo(map);
    return () => {
      map.removeLayer(marker);
    };
  }, [map, item]);
  return null;
}

// 분할동 fill URL 생성 (사전 주입된 패턴 사용)
function makeSplitFillUrl(sInfo) {
  if (!sInfo?.is_split) return "#e5e7eb";
  const primary = sInfo.primary.center_code;
  const secondary = sInfo.secondary?.[0]?.center_code;
  if (!secondary) return getColorByCenter(primary);
  const id = [primary, secondary].sort().join("-");
  return `url(#yesco-split-${id})`;
}
