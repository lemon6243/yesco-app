# 변환 스크립트

## meter_converter_gui.py
센터별 자원관리현황 raw 엑셀(19개 파일) → V2용 데이터 변환 GUI

### 사용법
1. Python 3.9+ 설치
2. 의존성 설치: `pip install pandas openpyxl`
3. 실행: `python meter_converter_gui.py`
4. GUI에서 raw 엑셀 폴더 선택 → 출력 폴더를 `public/data/`로 지정 → 변환 시작

### 출력 파일
- `dongs_meters_long.csv`: 행정동×요금용도×등급 long format (감사용)
- `dongs_meters_by_grade.csv`: 행정동×등급 피벗 (V2 계산용)
- `dongs_split_info.json`: 분할동 메타데이터 (D안 시각화용)

### 입력 파일 규칙
- 파일명: `{센터코드}_자원관리현황_{날짜}.xlsx` (예: 9001_자원관리현황_20260616.xlsx)
- 시트: 'Sheet1' 탭에서 raw 데이터 읽음
- 상태 필터: 없음 (raw가 이미 N/D 추출 상태)
- 미8군(코드 72, 74)은 등급 피벗에서 제외, long CSV에는 보존
