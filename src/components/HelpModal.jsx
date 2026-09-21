import { useEffect, useState } from "react";

export default function HelpModal({ open = true, onClose }) {
  const [activeTab, setActiveTab] = useState("quickstart");

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-blue-700/30 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-xl shadow-inner">
              📘
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">
                  예스코 고객센터 통합 시뮬레이터 사용 매뉴얼
                </h2>
                <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  2026 최신 개정판
                </span>
              </div>
              <p className="text-xs text-blue-100/80 mt-0.5">
                서울시 145개 행정동 · 12개 권역 최적 재배분 및 운영 효율화 GIS 솔루션
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0 gap-1 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("quickstart")}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "quickstart"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            }`}
          >
            <span>🚀 빠른 시작 & 화면 안내</span>
          </button>
          <button
            onClick={() => setActiveTab("features")}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "features"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            }`}
          >
            <span>⚡ 4대 핵심 기능 (자동 배정·확정)</span>
          </button>
          <button
            onClick={() => setActiveTab("controls")}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "controls"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            }`}
          >
            <span>🖱️ 지도 조작법 & 단축키</span>
          </button>
          <button
            onClick={() => setActiveTab("standards")}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "standards"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            }`}
          >
            <span>📐 운영 기준 및 FAQ</span>
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="px-7 py-6 overflow-y-auto text-sm leading-relaxed space-y-6 flex-1 text-slate-700">
          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 1: 빠른 시작 & 화면 구성 */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === "quickstart" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <section className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
                <h3 className="font-bold text-base text-blue-950 mb-1 flex items-center gap-2">
                  <span>🎯 시스템 개요 및 목적</span>
                </h3>
                <p className="text-xs text-blue-900 leading-relaxed">
                  본 시뮬레이터는 예스코 서울시 공급권역 내 <b>145개 행정동</b>을 
                  <b> 8~14개(기본 12개 권역)</b>으로 재편할 때, 
                  <b> 지리적 인접성</b>, <b>5개년 입주예정 아파트 물량</b>, <b>계량기 등급별 검침 난이도</b>, 
                  <b>법적 점검원 정원 기준</b>을 실시간으로 융합 분석하여 
                  최적의 권역안을 즉각 도출하는 대화형 Web GIS 의사결정 도구입니다.
                </p>
              </section>

              {/* 3영역 화면 구조 */}
              <section>
                <h3 className="font-bold text-slate-900 mb-3 text-sm flex items-center gap-2">
                  <span>🖥️ 3단 화면 구성 안내</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                        좌측 설정 패널 (Control)
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        • <b>권역 개수 선택</b> (8~14개, 기본 12개)<br />
                        • <b>인접성 보장 자동 배정</b> 버튼<br />
                        • <b>입주예정(2026~2030) 연도 토글</b><br />
                        • 주택유형별 난이도 가중치 조정<br />
                        • 시나리오 저장(JSON) 및 초기화
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                        중앙 인터랙티브 지도 (GIS Map)
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        • 145개 행정동 실시간 폴리곤 시각화<br />
                        • 클릭/드래그를 통한 즉각적 권역 배정<br />
                        • <b>[🔒 권역 확정]</b> 시 대형 권역 배지 표기<br />
                        • 고립동(월경지) 빨간 점선 경고 표시<br />
                        • 분할동 빗금 패턴 및 마우스 호버 툴팁
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                        우측 권역 분석 패널 (Zone Stats)
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        • 1~12 권역별 실시간 세대수 집계<br />
                        • <b>입주예정 가산 세대수</b> 동시 확인<br />
                        • <b>법적 점검원 & 사무원 정원</b> 산출<br />
                        • 센터별 지분율 및 <b>주관 센터장 추천</b><br />
                        • 엑셀 연동용 <b>CSV 다운로드</b>
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 빠른 3단계 실행 가이드 */}
              <section>
                <h3 className="font-bold text-slate-900 mb-2.5 text-sm flex items-center gap-2">
                  <span>⚡ 3단계 빠른 권역 설정 가이드</span>
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="shrink-0 w-6 h-6 rounded-md bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">1</span>
                    <div className="text-xs">
                      <strong className="text-slate-800">입주예정 연도 선택 및 자동 배정 실행:</strong>
                      <p className="text-slate-600 mt-0.5">
                        좌측 패널에서 반영할 입주예정 연도(예: [2026], [2027])를 누르고, <b>[⚡ 전체 자동 배정]</b>을 클릭하면 145개 행정동이 고립동 없이 100% 인접성을 보장하며 균등 분할됩니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="shrink-0 w-6 h-6 rounded-md bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">2</span>
                    <div className="text-xs">
                      <strong className="text-slate-800">현장 특성에 맞게 미세 조정:</strong>
                      <p className="text-slate-600 mt-0.5">
                        좌측 권역 색상 카드를 선택한 후 지도 상의 행정동을 클릭하여 소속 권역을 즉시 변경할 수 있습니다. 미할당된 동이 일부 남았을 때는 <b>[🧩 미할당 동 자동 채우기]</b>로 주변 권역에 자연스럽게 흡수시킵니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="shrink-0 w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">3</span>
                    <div className="text-xs">
                      <strong className="text-slate-800">[🔒 권역 확정] 및 보고서 내보내기:</strong>
                      <p className="text-slate-600 mt-0.5">
                        배정이 완료되면 상단이나 우측 패널의 <b>[🔒 권역 확정]</b> 버튼을 누릅니다. 지도 상에 1~12 권역의 대형 라벨(대표 센터명·세대수)이 생성되며, <b>[⬇ CSV]</b> 또는 <b>[💾 시나리오 저장]</b>으로 결과를 보관합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 2: 주요 핵심 기능 */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === "features" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 기능 1: 인접성 보장 자동 배정 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded font-bold text-[11px]">핵심 기능 1</span>
                  <h4 className="font-bold text-slate-900 text-sm">지리적 인접성 100% 보장 자동 배정 (고립동 제로화)</h4>
                </div>
                <p className="text-xs text-slate-600 mb-2.5">
                  행정동 인접 그래프 기반 <b>BFS(너비우선탐색) 연결성 검증</b>을 통해 배정 시 섬처럼 떨어지는 고립동(월경지)이 발생하지 않습니다.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <strong className="text-blue-700">⚡ 전체 자동 배정:</strong>
                    <p className="text-slate-600 mt-0.5">기존 19개 센터의 거점 동을 시드로 삼아, 인접성을 유지하며 업무량(세대수+난이도)을 균등 분할합니다.</p>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <strong className="text-indigo-700">🧩 미할당 동 자동 채우기:</strong>
                    <p className="text-slate-600 mt-0.5">수작업으로 핵심 동을 우선 배정한 뒤, 비어있는 동들만 인접 권역으로 매끄럽게 연결 흡수합니다.</p>
                  </div>
                </div>
              </div>

              {/* 기능 2: 5개년 입주예정 물량 연동 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-amber-600 text-white rounded font-bold text-[11px]">핵심 기능 2</span>
                  <h4 className="font-bold text-slate-900 text-sm">5개년(2026~2030) 입주예정 아파트 실시간 연동</h4>
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  행정동별 재개발·재건축 신규 입주예정 세대수 DB를 내장하고 있습니다. 좌측 패널의 연도 버튼을 클릭하면 세대수 합계에 즉각 가산됩니다.
                </p>
                <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-950">
                  💡 <b>실시간 반영 원리:</b> 예컨대 3권역의 기존 세대수가 81,393세대일 때, 입주예정(+6,190세대)을 선택하면 합계가 <b>87,583세대</b>로 즉시 갱신되며, 지도 라벨에도 만 단위 올림 기준 <b>8.8만</b>으로 정확히 연동 표기됩니다.
                </div>
              </div>

              {/* 기능 3: 권역 확정 및 지도 대형 라벨링 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[11px]">핵심 기능 3</span>
                  <h4 className="font-bold text-slate-900 text-sm">[🔒 권역 확정] 및 지도 대형 식별 라벨링</h4>
                </div>
                <p className="text-xs text-slate-600 mb-2.5">
                  배정 완료 후 <b>[🔒 권역 확정]</b>을 누르면 지도 위 각 권역 중심에 대형 명찰 카드가 생성되어, 지도만 보고도 권역을 한눈에 식별할 수 있습니다.
                </p>
                <ul className="text-xs space-y-1 text-slate-700 list-disc list-inside">
                  <li><b>대형 카드 구성:</b> 상단 권역 번호 배지 + 주요 센터명(예: 용산·금호) + 관할 동수 및 세대수(예: 13개동 · 8.8만)</li>
                  <li><b>원클릭 줌 포커스:</b> 지도 배지나 우측 권역 카드의 돋보기(🔍) 클릭 시 해당 권역 전체 영역으로 화면이 부드럽게 자동 이동합니다.</li>
                  <li><b>호버 상세 툴팁:</b> 배지에 마우스를 올리면 총 세대수와 입주예정 가산 세대수가 풍선도움말로 나타납니다.</li>
                </ul>
              </div>

              {/* 기능 4: V1 vs V2 모드 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-purple-600 text-white rounded font-bold text-[11px]">핵심 기능 4</span>
                  <h4 className="font-bold text-slate-900 text-sm">V1 (기본 세대수) vs V2 (계량기 등급 기반) 듀얼 모드</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="border border-blue-200 bg-blue-50/50 p-2.5 rounded-lg">
                    <strong className="text-blue-800">V1 (기본 모드):</strong>
                    <p className="text-slate-600 mt-1">단독/공동/영업 세대수 및 입주예정 가산분을 기준으로 총괄원가 및 시행규칙상 법적 인원을 산출합니다.</p>
                  </div>
                  <div className="border border-purple-200 bg-purple-50/50 p-2.5 rounded-lg">
                    <strong className="text-purple-800">⚡ V2 (등급 기반 베타):</strong>
                    <p className="text-slate-600 mt-1">G2.5 가정용부터 G1600 대용량까지 계량기 등급별 가중치와 단위시간당 공수를 반영하여 분할동 빗금 시각화와 정밀 인원을 산출합니다.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 3: 조작법 & 단축키 */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === "controls" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <section>
                <h3 className="font-bold text-slate-900 mb-3 text-sm flex items-center gap-2">
                  <span>🖱️ 마우스 조작법</span>
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 w-1/3">조작</th>
                        <th className="p-2.5">동작 설명</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-800">행정동 좌클릭</td>
                        <td className="p-2.5">현재 선택된 권역으로 해당 행정동을 즉시 할당/변경합니다.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-800">Shift + 좌클릭</td>
                        <td className="p-2.5">해당 행정동의 권역 할당을 해제하여 <b>미할당 상태</b>로 되돌립니다.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-800">행정동 마우스 호버</td>
                        <td className="p-2.5">동 이름, 현재 배정 권역, 세대수(단독/공동/영업), 원본 센터명이 툴팁으로 표시됩니다.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-800">마우스 휠 스크롤</td>
                        <td className="p-2.5">지도를 확대/축소합니다. (줌 레벨 12 이상 확대 시 동별 라벨이 지도에 직접 표기)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-800">지도 바탕 드래그</td>
                        <td className="p-2.5">지도의 화면 중심을 자유롭게 이동합니다.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-800">권역 확정 배지 클릭</td>
                        <td className="p-2.5">해당 권역을 활성화하고 상세 통계를 우측 패널에서 집중 조회합니다.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 mb-3 text-sm flex items-center gap-2">
                  <span>⌨️ 유용한 키보드 단축키</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-600">도움말 매뉴얼 열기</span>
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono font-bold text-slate-800">F1</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-600">권역 1~9번 즉시 선택</span>
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono font-bold text-slate-800">1 ~ 9</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-600">권역 10번 선택</span>
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono font-bold text-slate-800">0</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-600">도움말 창 / 모달 닫기</span>
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono font-bold text-slate-800">ESC</kbd>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 mb-2.5 text-sm flex items-center gap-2">
                  <span>👀 지도 보기 모드 3가지</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <strong className="text-blue-700">1. 혼합 모드 (기본):</strong>
                    <p className="text-slate-600 mt-1">할당된 동은 권역 색상으로, 아직 배정되지 않은 동은 기존 19개 센터 색상으로 표시되어 작업 진행에 가장 적합합니다.</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <strong className="text-emerald-700">2. 권역 모드:</strong>
                    <p className="text-slate-600 mt-1">신규 설정된 권역 색상만 깔끔하게 표시하며, 미할당 지역은 회색으로 음영 처리되어 최종 확정안 검토 시 유리합니다.</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <strong className="text-slate-700">3. 원본 모드:</strong>
                    <p className="text-slate-600 mt-1">통합 이전의 서울 19개 센터의 원래 관할 구역을 그대로 보여주어 기존 체제와의 차이를 대조할 때 활용합니다.</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 4: 운영 기준 & FAQ */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === "standards" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 text-sm mb-2.5 flex items-center gap-2">
                  <span>📐 도시가스 법적 인원 및 운영 산정 기준</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-800 mb-1">⚖️ 법적 안전점검원 산정 (시행규칙)</div>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside">
                      <li>단독주택: <b>3,000세대당 1명</b> (올림)</li>
                      <li>공동주택: <b>4,000세대당 1명</b> (올림)</li>
                      <li>영업용: <b>3,000세대당 1명</b> (올림)</li>
                    </ul>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-800 mb-1">🏢 사무행정원 산정 (분산형 콜센터)</div>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside">
                      <li>사무행정원: <b>24,000명당 1명</b> (올림)</li>
                      <li>분산형 콜센터 운영 기준 적용</li>
                      <li>권역당 목표 세대수: <b>약 85,000 ~ 110,000세대</b></li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>❓ 자주 묻는 질문 (FAQ)</span>
                </h3>

                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="font-bold text-xs text-blue-900">
                    Q. 시뮬레이션 결과를 보고서나 엑셀 파일로 추출할 수 있나요?
                  </div>
                  <div className="text-xs text-slate-600 mt-1 pl-2 border-l-2 border-blue-400">
                    우측 패널 상단의 <b>[⬇ CSV]</b> 버튼을 누르면 전체 권역별 세대수, 입주예정 가산분, 법적 점검원 및 사무원 정원 통계가 담긴 엑셀 연동 CSV 파일을 즉시 다운로드하실 수 있습니다.
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="font-bold text-xs text-blue-900">
                    Q. 지도에서 빨간 점선 테두리로 표시되는 행정동은 무엇인가요?
                  </div>
                  <div className="text-xs text-slate-600 mt-1 pl-2 border-l-2 border-red-400">
                    <b>지리적 인접성 위반(고립동/월경지) 경고</b>입니다. 같은 권역의 다른 동들과 직접 맞닿아 있지 않고 떨어져 있는 동이 발생했을 때 나타납니다. 해당 동을 인접 권역으로 옮기거나 중간 연결 동을 같은 권역으로 묶어 해결할 수 있습니다.
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="font-bold text-xs text-blue-900">
                    Q. 작성 중인 권역 배치 상태를 저장해두고 나중에 다시 불러올 수 있나요?
                  </div>
                  <div className="text-xs text-slate-600 mt-1 pl-2 border-l-2 border-indigo-400">
                    네, 좌측 패널의 <b>[💾 시나리오 저장]</b> 버튼을 누르면 현재 설정된 권역 배분 상태가 JSON 파일로 다운로드됩니다. 이후 <b>[📂 시나리오 불러오기]</b>로 언제든지 1초 만에 그대로 복원할 수 있어 A안, B안, C안 등 다중 시나리오 비교가 가능합니다.
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="font-bold text-xs text-blue-900">
                    Q. 입주예정 세대수가 반영되었는지 어떻게 확인하나요?
                  </div>
                  <div className="text-xs text-slate-600 mt-1 pl-2 border-l-2 border-amber-400">
                    좌측 패널에서 연도를 선택하면 우측 패널에 <code>합계: 87,583 세대 (입주 +6,190)</code> 형식으로 입주 가산분이 명시되며, 지도상의 권역 확정 라벨(예: 8.8만)에도 입주 가산 세대수가 실시간 포함되어 표기됩니다.
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">예스코 CS팀 · 김종익 M</span>
            <span className="text-slate-300">|</span>
            <span>서울 고객센터 통합 최적화 시스템</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded transition shadow-xs cursor-pointer"
            >
              닫기 (ESC)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
