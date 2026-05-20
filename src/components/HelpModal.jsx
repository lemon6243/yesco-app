import { useEffect } from "react";

export default function HelpModal({ open, onClose }) {
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
      className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">📘 사용 설명서</h2>
            <p className="text-xs text-blue-100 mt-1">
              예스코 고객센터 통합 시뮬레이터 v1.0
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 overflow-y-auto text-sm leading-relaxed space-y-5">
          {/* 소개 */}
          <section>
            <h3 className="font-bold text-base text-gray-800 mb-2">
              🎯 이 시뮬레이터는?
            </h3>
            <p className="text-gray-700">
              서울 지역 19개 예스코 고객센터를 <b>9~10개 권역</b>으로 통합·재배치하기
              위한 시각화 도구입니다. 119개 행정동을 직접 권역에 배정하면서,
              세대수·난이도·인접성·도심권 분산을 실시간으로 확인할 수 있습니다.
            </p>
          </section>

          {/* 빠른 시작 */}
          <section>
            <h3 className="font-bold text-base text-gray-800 mb-2">
              🚀 빠른 시작 (3단계)
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-700 pl-1">
              <li>
                좌측 <b>"권역 개수"</b>에서 9개 또는 10개를 선택합니다.
              </li>
              <li>
                <b>1~9(10) 색상 카드</b> 중 작업할 권역을 클릭합니다.
              </li>
              <li>
                지도에서 해당 권역에 포함할 행정동을 클릭하면 선택한 권역 색으로
                칠해집니다.
              </li>
            </ol>
          </section>

          {/* 보기 모드 */}
          <section>
            <h3 className="font-bold text-base text-gray-800 mb-2">
              👀 보기 모드 3가지
            </h3>
            <table className="w-full text-xs border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">모드</th>
                  <th className="border px-2 py-1 text-left">설명</th>
                  <th className="border px-2 py-1 text-left">언제 쓰나요?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1 font-semibold">혼합 (기본)</td>
                  <td className="border px-2 py-1">
                    할당된 동은 권역 색, 미할당은 옅은 센터 색
                  </td>
                  <td className="border px-2 py-1">작업 진행 중</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1 font-semibold">권역</td>
                  <td className="border px-2 py-1">
                    권역 색만 표시 (미할당은 회색)
                  </td>
                  <td className="border px-2 py-1">최종 결과 확인</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1 font-semibold">원본</td>
                  <td className="border px-2 py-1">
                    기존 19개 센터 색만 표시
                  </td>
                  <td className="border px-2 py-1">현 체제 참고용</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 조작법 */}
          <section>
            <h3 className="font-bold text-base text-gray-800 mb-2">
              🖱 지도 조작법
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 pl-1">
              <li>
                <b>좌클릭</b>: 현재 선택된 권역에 해당 동을 할당
              </li>
              <li>
                <b>Shift + 좌클릭</b>: 해당 동의 권역 할당 해제
              </li>
              <li>
                <b>마우스 휠</b>: 지도 확대 / 축소
              </li>
              <li>
                <b>드래그</b>: 지도 이동
              </li>
              <li>
                <b>동 위에 호버</b>: 동 이름 툴팁 + 굵은 테두리 강조
              </li>
              <li>
                <b>동 위에 좀 더 머무르면</b>(또는 팝업): 세대수/운영센터 등 상세
              </li>
            </ul>
          </section>

          {/* 권역 정보 패널 */}
          <section>
            <h3 className="font-bold text-base text-gray-800 mb-2">
              📋 좌측 패널 — 권역 작업
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 pl-1">
              <li>
                <b>색상 카드 선택</b> 시, 그 권역에 포함된 동 목록이 바로 아래에
                표시됩니다.
              </li>
              <li>
                <b>지도에서는 선택된 권역의 동들이 검은 굵은 테두리</b>로 강조됩니다.
              </li>
              <li>
                동 목록의 <b>✕</b> 버튼으로 권역에서 바로 제거할 수 있습니다.
              </li>
              <li>
                <b>난이도 가중치</b>를 조정하면 권역별 난이도 점수가 실시간으로
                재계산됩니다 (단독·공동·영업 각각).
              </li>
              <li>
                <b>지도 라벨</b>을 켜면 줌 12 이상에서 동 이름·세대수가
                지도 위에 표시됩니다.
              </li>
            </ul>
          </section>

          {/* 우측 패널 */}
          <section>
            <h3 className="font-bold text-base text-gray-800 mb-2">
              📊 우측 패널 — 권역 현황
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 pl-1">
              <li>
                권역별 <b>단독/공동/영업/합계/난이도점수/상담원수</b>가 실시간 집계
              </li>
              <li>
                상담원수 = 합계 ÷ 24,000 (총괄원가 산정 기준)
              </li>
              <li>
                <b>충족 여부 뱃지</b>:
                <span className="text-green-600 font-bold ml-1">✓ 충족</span>(96,240~132,000) ·
                <span className="text-orange-600 font-bold ml-1">⚠ 미달</span> ·
                <span className="text-red-600 font-bold ml-1">⚠ 초과</span>
              </li>
              <li>
                <b>인접성 위반</b>: 권역 안에 떨어진 동이 있으면 해당 동은
                지도에서 <span className="text-red-600">빨간 점선 테두리</span>로 표시
              </li>
              <li>
                <b>도심권 경고</b>: 한 권역에 도심권 동이 2개 이상이면 ⚠ 표시
              </li>
              <li>
                상단 <b>⬇ CSV</b> 버튼으로 권역 결과를 Excel에서 열 수 있는 CSV로
                내보내기
              </li>
            </ul>
          </section>

          {/* 시나리오 저장/불러오기 */}
          <section>
            <h3 className="font-bold text-base text-gray-800 mb-2">
              💾 시나리오 저장 / 공유
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 pl-1">
              <li>
                <b>💾 시나리오 저장</b>: 현재 작업 상태(권역 개수·가중치·동 배정)를
                JSON 파일로 다운로드
              </li>
              <li>
                <b>📂 시나리오 불러오기</b>: 저장한 JSON을 다시 불러와 그대로 복원
              </li>
              <li>
                동료에게 JSON 파일을 메일로 보내면 동일한 시뮬레이션을 공유할 수
                있습니다.
              </li>
              <li>
                <b>🗑 모든 할당 초기화</b>: 모든 권역 배정을 비웁니다 (가중치·권역
                개수는 유지).
              </li>
            </ul>
          </section>

          {/* 운영 기준 */}
          <section>
            <h3 className="font-bold text-base text-gray-800 mb-2">
              📐 운영 기준 (참고)
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 pl-1">
              <li>
                상담원 산정 기준: <b>24,000세대당 1명</b> (총괄원가 사무행정원
                기준)
              </li>
              <li>
                권역당 목표 세대수: <b>96,240 ~ 132,000세대</b> (4.01~5.5명 기준)
              </li>
              <li>
                난이도 우선순위:{" "}
                <b>영업용(3.0) &gt; 단독(2.0) &gt; 공동(1.0)</b> (가중치 조정 가능)
              </li>
              <li>
                권역 설계 원칙: ① 인접성 ② 주택유형 균형 ③ 세대수 균형 ④ 도심권
                분산
              </li>
            </ul>
          </section>

          {/* FAQ */}
          <section>
            <h3 className="font-bold text-base text-gray-800 mb-2">
              ❓ 자주 묻는 질문
            </h3>
            <div className="space-y-2 text-gray-700">
              <div>
                <div className="font-semibold">
                  Q. 동을 잘못 할당했어요. 어떻게 되돌리나요?
                </div>
                <div className="pl-3">
                  A. 해당 동을 <b>Shift+클릭</b>으로 해제하거나, 좌측 권역 동 목록의
                  ✕ 버튼을 누르세요. 또는 다른 권역 번호를 선택한 뒤 그 동을
                  다시 클릭하면 권역이 바뀝니다.
                </div>
              </div>
              <div>
                <div className="font-semibold">
                  Q. 권역 안의 동이 떨어져 있으면 어떻게 알 수 있나요?
                </div>
                <div className="pl-3">
                  A. 떨어진(고립된) 동은 지도에서 <span className="text-red-600">빨간 점선 테두리</span>로
                  표시되고, 우측 패널 해당 권역 카드에 ⚠ 경고가 뜹니다.
                </div>
              </div>
              <div>
                <div className="font-semibold">
                  Q. 시뮬레이션 결과를 보고서에 넣고 싶어요.
                </div>
                <div className="pl-3">
                  A. 우측 상단 <b>⬇ CSV</b> 버튼으로 권역별 집계를 다운로드하면
                  Excel에서 바로 열 수 있습니다(한글 깨짐 없음). 또한 시나리오 JSON
                  파일을 함께 보관하면 추후 재현 가능합니다.
                </div>
              </div>
              <div>
                <div className="font-semibold">
                  Q. 9개 권역으로는 부족해 보입니다.
                </div>
                <div className="pl-3">
                  A. 좌측 "권역 개수"에서 <b>10개</b>로 전환해보세요. 평균
                  세대수가 124,276 → 111,848로 낮아져 균형 잡기가 더 쉬워집니다.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-600">
          <div>
            <div className="font-semibold text-gray-800">
              제작 · 기획 — CS팀 김종익 매니저
            </div>
            <div>예스코 고객센터 통합 시뮬레이터 · 2026</div>
          </div>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
