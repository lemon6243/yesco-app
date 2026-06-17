import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getMainCenter, getColorByCenter } from "../utils/colorPalette";
import useAppStore, { ZONE_COLORS } from "../store/useAppStore";
import { useAdjacencyMap } from "../utils/dataLoader";
import { useV2Data } from "../utils/dataLoaderV2";
import { checkAdjacency } from "../utils/validator";
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
  const showLabels = useAppStore((s) => s.showLabels);
  const labelType = useAppStore((s) => s.labelType);
  const showSplitHatch = useAppStore((s) => s.showSplitHatch);

  const adjacencyMap = useAdjacencyMap();
  // V2 데이터는 모든 모드에서 백그라운드 로딩 (전환 시 즉시 사용 가능)
  const { metersByGrade, splitInfo } = useV2Data();

  const isV2 = appMode === "v2";

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
      `${appMode}-${viewMode}-${selectedZone}-${JSON.stringify(
        dongAssignments
      )}-${isolatedDongs.size}-${showSplitHatch}-${splitInfo ? "s" : "n"}`,
    [appMode, viewMode, selectedZone, dongAssignments, isolatedDongs, showSplitHatch, splitInfo]
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

    if (viewMode === "center") {
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
      weight: isolated ? 3 : isSelectedZone ? 3 : 1,
      opacity: 1,
      color: isolated ? "#dc2626" : isSelectedZone ? "#000" : "#333",
      dashArray: isolated ? "4,3" : "",
      fillOpacity: isSelectedZone
        ? Math.min(fillOpacity + 0.15, 0.9)
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
      {isV2 && splitInfo && <SplitPatternInjector splitInfo={splitInfo} />}
      {geoData && (
        <GeoJSON
          key={geoKey}
          data={geoData}
          style={styleFn}
          onEachFeature={onEachFeature}
        />
      )}
      {showLabelsNow &&
        labelData.map((item, i) => (
          <LabelMarker key={item.name + i} item={item} />
        ))}
      {showLabels && currentZoom < LABEL_MIN_ZOOM && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded"
          style={{ zIndex: 1000 }}
        >
          🔍 줌을 더 확대하면 라벨이 표시됩니다 (현재 {currentZoom} / 필요{" "}
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
