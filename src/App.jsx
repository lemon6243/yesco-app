import { useState, useCallback, useEffect } from "react";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";
import ZonePanel from "./components/ZonePanel";
import HelpModal from "./components/HelpModal";

const FIRST_VISIT_KEY = "yesco_help_seen_v1";

export default function App() {
  const [geoData, setGeoData] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const handleDataLoaded = useCallback((data) => setGeoData(data), []);

  // 첫 방문 시 자동으로 도움말 열기
  useEffect(() => {
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      setHelpOpen(true);
      localStorage.setItem(FIRST_VISIT_KEY, "1");
    }
  }, []);

  // F1 단축키
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen w-screen">
      <aside className="w-72 border-r border-gray-300 bg-gray-50">
        <ControlPanel geoData={geoData} />
      </aside>

      <main className="flex-1 relative">
        <header className="absolute top-0 left-0 right-0 z-[1000] bg-white/95 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg">
              예스코 고객센터 통합 시뮬레이터
            </h1>
            <div className="text-[11px] text-gray-600">
              제작 · CS팀 김종익 매니저 · v1.0
            </div>
          </div>
          <button
            onClick={() => setHelpOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded shadow-sm flex items-center gap-1"
            title="사용 설명서 열기 (F1)"
          >
            <span>📘</span>
            <span>사용 설명서</span>
          </button>
        </header>
        <MapView onDataLoaded={handleDataLoaded} />
      </main>

      <aside className="w-80 border-l border-gray-300 bg-gray-50">
        <ZonePanel geoData={geoData} />
      </aside>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
