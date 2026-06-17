import { useState, useEffect } from "react";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";
import ControlPanelV2 from "./components/ControlPanelV2";
import ZonePanel from "./components/ZonePanel";
import HelpModal from "./components/HelpModal";
import useAppStore from "./store/useAppStore";


const FIRST_VISIT_KEY = "yesco_help_seen_v1";

export default function App() {
  const [geoData, setGeoData] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);

  useEffect(() => {
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      setShowHelp(true);
      localStorage.setItem(FIRST_VISIT_KEY, "1");
    }
    const onKey = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        setShowHelp(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isV2 = appMode === "v2";

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 최상단 헤더: V1/V2 토글 */}
      <header className="bg-white border-b shadow-sm px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-800">
            예스코 고객센터 통합 시뮬레이터
          </h1>
          <span className="text-xs text-gray-500">v1.0 + v2 beta</span>
        </div>

        {/* V1/V2 토글 (최상단 중앙 강조) */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setAppMode("v1")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              !isV2
                ? "bg-blue-600 text-white shadow"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            V1 (기본)
          </button>
          <button
            onClick={() => setAppMode("v2")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              isV2
                ? "bg-purple-600 text-white shadow"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            ⚡ V2 (등급 기반)
          </button>
        </div>

        <button
          onClick={() => setShowHelp(true)}
          className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border rounded"
          title="F1"
        >
          ❓ 도움말
        </button>
      </header>

      {/* 본문 */}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white border-r flex flex-col overflow-y-auto">
          <ControlPanel geoData={geoData} />
          {isV2 && <ControlPanelV2 />}
        </aside>

        <main className="flex-1 relative">
          <MapView onDataLoaded={setGeoData} />
        </main>

        <aside className="w-96 bg-white border-l overflow-y-auto">
          <ZonePanel geoData={geoData} />
        </aside>
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
