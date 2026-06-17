# meter_converter_gui.py
"""
자원관리현황 raw 엑셀 → V2용 CSV/JSON 변환기 (GUI)
- 'Sheet1' 탭을 이름으로 찾아 읽음
- 출력: long CSV, 등급 피벗 CSV, 분할동 메타 JSON
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import pandas as pd
from pathlib import Path
import re
import threading
import json
import os
import platform

CENTER_MAP = {
    "9001": "자양", "9002": "휘경", "9003": "중부", "9004": "구의",
    "9005": "금호", "9006": "면목", "9007": "행당", "9009": "중화",
    "9010": "제기", "9011": "삼선", "9012": "중곡", "9013": "신내",
    "9014": "종로", "9016": "용산", "9018": "장안", "9019": "상봉",
    "9020": "성수", "9021": "정릉", "9022": "서부",
}
EXCLUDE_USAGE_CODES = {"72", "74"}


def open_folder(path):
    try:
        if platform.system() == "Windows":
            os.startfile(path)
        elif platform.system() == "Darwin":
            os.system(f"open '{path}'")
        else:
            os.system(f"xdg-open '{path}'")
    except Exception:
        pass


def load_one(xlsx_path: Path, log_fn) -> pd.DataFrame:
    m = re.match(r"(\d{4})_", xlsx_path.stem)
    if not m:
        log_fn(f"⚠️  파일명에서 센터코드 추출 실패: {xlsx_path.name}")
        return pd.DataFrame()
    file_center_code = m.group(1)
    expected_name = CENTER_MAP.get(file_center_code, "미상")

    try:
        xl = pd.ExcelFile(xlsx_path)
        target_sheet = None
        for s in xl.sheet_names:
            if s.strip().lower() == "sheet1":
                target_sheet = s
                break
        if target_sheet is None:
            log_fn(f"❌ {xlsx_path.name}: 'Sheet1' 탭을 찾을 수 없음. 시트 목록: {xl.sheet_names}")
            return pd.DataFrame()
        df = pd.read_excel(xlsx_path, sheet_name=target_sheet, dtype=str)
        log_fn(f"   📄 읽은 시트: '{target_sheet}'")
    except Exception as e:
        log_fn(f"❌ {xlsx_path.name} 읽기 실패: {e}")
        return pd.DataFrame()

    df.columns = [str(c).strip() for c in df.columns]

    required = ["고객센터명", "시군구명", "행정동명", "등급", "요금용도"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        log_fn(f"❌ {xlsx_path.name}: 필수 컬럼 누락 {missing}")
        log_fn(f"   실제 컬럼: {list(df.columns)[:15]}...")
        return pd.DataFrame()

    df["센터명"] = (
        df["고객센터명"].astype(str)
        .str.replace("고객센터", "", regex=False).str.strip()
    )

    if expected_name not in df["센터명"].unique():
        log_fn(f"   ⚠️  예상 '{expected_name}' 없음. 발견: {list(df['센터명'].unique())}")

    name_to_code = {v: k for k, v in CENTER_MAP.items()}
    df["센터코드"] = df["센터명"].map(name_to_code).fillna(file_center_code)

    df["자치구"] = (
        df["시군구명"].astype(str)
        .str.replace("서울특별시 ", "", regex=False).str.strip()
    )
    df["행정동"] = df["행정동명"].astype(str).str.strip()
    df["등급"] = pd.to_numeric(
        df["등급"].astype(str).str.replace(",", ""), errors="coerce"
    )

    usage = df["요금용도"].astype(str).str.split(".", n=1, expand=True)
    df["요금용도코드"] = usage[0].str.strip()
    df["요금용도명"] = usage[1].fillna("").str.strip() if usage.shape[1] > 1 else ""
    df["법적산정제외"] = df["요금용도코드"].isin(EXCLUDE_USAGE_CODES).astype(int)

    df = df.dropna(subset=["등급", "행정동"])
    df = df[df["행정동"] != ""]

    return df[[
        "센터코드", "센터명", "자치구", "행정동",
        "요금용도코드", "요금용도명", "등급", "법적산정제외",
    ]]


def convert_files(file_paths, out_dir: Path, log_fn, progress_fn):
    parts = []
    total = len(file_paths)
    for i, fp in enumerate(file_paths, 1):
        log_fn(f"[{i}/{total}] 처리 중: {Path(fp).name}")
        part = load_one(Path(fp), log_fn)
        if not part.empty:
            log_fn(f"   ✓ {len(part):,}건")
            parts.append(part)
        progress_fn(i / total * 100)

    if not parts:
        log_fn("❌ 처리할 수 있는 파일이 없습니다.")
        return None

    raw = pd.concat(parts, ignore_index=True)
    log_fn(f"\n📊 전체 raw: {len(raw):,}건")

    # ── 출력 1) long format ─────────────────────────────────
    long_df = (
        raw.groupby(
            ["센터코드", "센터명", "자치구", "행정동",
             "요금용도코드", "요금용도명", "등급", "법적산정제외"],
            as_index=False,
        )
        .size().rename(columns={"size": "수용가수"})
        .sort_values(["센터코드", "행정동", "요금용도코드", "등급"])
    )
    out1 = out_dir / "dongs_meters_long.csv"
    long_df.to_csv(out1, index=False, encoding="utf-8-sig")
    log_fn(f"📁 {out1.name}: {len(long_df):,}행, 합계 {long_df['수용가수'].sum():,}")

    # ── 출력 2) 등급 피벗 (미8군 제외) ────────────────────
    pivot = (
        raw[raw["법적산정제외"] == 0]
        .groupby(["센터코드", "센터명", "자치구", "행정동", "등급"])
        .size().unstack(fill_value=0).reset_index()
    )
    pivot["총합계"] = pivot.iloc[:, 4:].sum(axis=1)
    out2 = out_dir / "dongs_meters_by_grade.csv"
    pivot.to_csv(out2, index=False, encoding="utf-8-sig")
    log_fn(f"📁 {out2.name}: {len(pivot):,}행, 합계 {pivot['총합계'].sum():,.0f}")

    # ── 출력 3) 분할동 메타데이터 JSON ─────────────────────
    dong_center = (
        raw[raw["법적산정제외"] == 0]
        .groupby(["행정동", "센터코드", "센터명"])
        .size().reset_index(name="count")
    )

    dongs_dict = {}
    for dong, group in dong_center.groupby("행정동"):
        group_sorted = group.sort_values("count", ascending=False).reset_index(drop=True)
        total_count = int(group_sorted["count"].sum())

        primary_row = group_sorted.iloc[0]
        primary = {
            "center_code": primary_row["센터코드"],
            "center_name": primary_row["센터명"],
            "count": int(primary_row["count"]),
            "ratio": round(primary_row["count"] / total_count, 4),
        }
        secondary = []
        for _, row in group_sorted.iloc[1:].iterrows():
            secondary.append({
                "center_code": row["센터코드"],
                "center_name": row["센터명"],
                "count": int(row["count"]),
                "ratio": round(row["count"] / total_count, 4),
            })

        dongs_dict[dong] = {
            "total": total_count,
            "is_split": len(secondary) > 0,
            "primary": primary,
            "secondary": secondary,
        }

    split_count = sum(1 for d in dongs_dict.values() if d["is_split"])

    output_json = {
        "_meta": {
            "description": "행정동별 센터 관할 정보 (분할동 식별용)",
            "version": "1.0",
            "generated": pd.Timestamp.now().strftime("%Y-%m-%d"),
            "total_dongs": len(dongs_dict),
            "split_dongs_count": split_count,
            "note": "is_split=true인 행정동은 여러 센터가 공동 관리. UI에서 빗금/배지로 표시.",
        },
        "dongs": dict(sorted(dongs_dict.items())),
    }

    out3 = out_dir / "dongs_split_info.json"
    with open(out3, "w", encoding="utf-8") as f:
        json.dump(output_json, f, ensure_ascii=False, indent=2)
    log_fn(f"📁 {out3.name}: {len(dongs_dict)}동 (분할동 {split_count}개)")

    # ── 분할동 목록 ────────────────────────────────────────
    log_fn("\n[분할동 목록]")
    for dong, info in sorted(dongs_dict.items()):
        if info["is_split"]:
            parts_str = [f"{info['primary']['center_name']}({info['primary']['count']:,})"]
            for s in info["secondary"]:
                parts_str.append(f"{s['center_name']}({s['count']:,})")
            log_fn(f"  {dong}: {' + '.join(parts_str)} = {info['total']:,}")

    # ── 센터별 요약 ────────────────────────────────────────
    log_fn("\n[센터별 검증]")
    summary = (
        raw.groupby(["센터코드", "센터명"])
        .size().reset_index(name="건수").sort_values("센터코드")
    )
    for _, row in summary.iterrows():
        log_fn(f"  {row['센터코드']} {row['센터명']}: {row['건수']:,}건")
    log_fn(f"\n✅ 완료! 총 {summary['건수'].sum():,}건")

    return out_dir


class ConverterApp:
    def __init__(self, root):
        self.root = root
        root.title("자원관리현황 → V2 CSV/JSON 변환기")
        root.geometry("780x680")

        self.file_paths = []
        self.out_dir = tk.StringVar(value=str(Path.cwd()))

        tk.Label(root, text="📋 자원관리현황 raw 엑셀 → V2 데이터 변환기",
                 font=("맑은 고딕", 13, "bold"), pady=8).pack(fill="x")
        tk.Label(root,
                 text="각 파일의 'Sheet1' 탭을 자동으로 찾아 읽습니다.\n"
                      "출력: long CSV + 등급 피벗 CSV + 분할동 메타 JSON",
                 fg="gray", font=("맑은 고딕", 9)).pack(fill="x", padx=10)

        list_frame = tk.LabelFrame(root, text=" 1. 엑셀 파일 선택 ", padx=8, pady=8)
        list_frame.pack(fill="both", expand=False, padx=10, pady=6)

        btn_row = tk.Frame(list_frame)
        btn_row.pack(fill="x", pady=(0, 6))
        tk.Button(btn_row, text="📂 파일 추가", command=self.add_files, width=12).pack(side="left", padx=2)
        tk.Button(btn_row, text="📁 폴더 전체 추가", command=self.add_folder, width=14).pack(side="left", padx=2)
        tk.Button(btn_row, text="🗑 선택 삭제", command=self.remove_selected, width=12).pack(side="left", padx=2)
        tk.Button(btn_row, text="❌ 전체 삭제", command=self.clear_files, width=12).pack(side="left", padx=2)
        self.count_label = tk.Label(btn_row, text="0개 파일", fg="blue")
        self.count_label.pack(side="right", padx=4)

        self.file_listbox = tk.Listbox(list_frame, height=8, selectmode="extended")
        self.file_listbox.pack(fill="both", expand=True)

        out_frame = tk.LabelFrame(root, text=" 2. 출력 폴더 ", padx=8, pady=8)
        out_frame.pack(fill="x", padx=10, pady=6)
        tk.Entry(out_frame, textvariable=self.out_dir).pack(side="left", fill="x", expand=True, padx=(0, 6))
        tk.Button(out_frame, text="찾아보기...", command=self.choose_out_dir).pack(side="left")

        run_frame = tk.Frame(root)
        run_frame.pack(fill="x", padx=10, pady=8)
        self.run_btn = tk.Button(
            run_frame, text="🚀 변환 시작", command=self.run_convert,
            bg="#4CAF50", fg="white", font=("맑은 고딕", 11, "bold"), height=2,
        )
        self.run_btn.pack(fill="x")

        self.progress = ttk.Progressbar(root, mode="determinate")
        self.progress.pack(fill="x", padx=10, pady=(0, 6))

        log_frame = tk.LabelFrame(root, text=" 진행 로그 ", padx=4, pady=4)
        log_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        self.log = scrolledtext.ScrolledText(log_frame, height=16, font=("Consolas", 9))
        self.log.pack(fill="both", expand=True)

    def add_files(self):
        paths = filedialog.askopenfilenames(
            title="자원관리현황 엑셀 파일 선택",
            filetypes=[("Excel files", "*.xlsx *.xls"), ("All files", "*.*")],
        )
        for p in paths:
            if p not in self.file_paths:
                self.file_paths.append(p)
                self.file_listbox.insert("end", Path(p).name)
        self.update_count()

    def add_folder(self):
        folder = filedialog.askdirectory(title="엑셀 파일이 있는 폴더 선택")
        if not folder:
            return
        added = 0
        for p in sorted(Path(folder).glob("*.xlsx")):
            sp = str(p)
            if sp not in self.file_paths:
                self.file_paths.append(sp)
                self.file_listbox.insert("end", p.name)
                added += 1
        self.update_count()
        self.write_log(f"폴더에서 {added}개 파일 추가됨")

    def remove_selected(self):
        for idx in reversed(self.file_listbox.curselection()):
            self.file_listbox.delete(idx)
            del self.file_paths[idx]
        self.update_count()

    def clear_files(self):
        self.file_listbox.delete(0, "end")
        self.file_paths.clear()
        self.update_count()

    def choose_out_dir(self):
        d = filedialog.askdirectory(title="출력 폴더 선택", initialdir=self.out_dir.get())
        if d:
            self.out_dir.set(d)

    def update_count(self):
        self.count_label.config(text=f"{len(self.file_paths)}개 파일")

    def write_log(self, msg):
        self.log.insert("end", msg + "\n")
        self.log.see("end")
        self.root.update_idletasks()

    def set_progress(self, pct):
        self.progress["value"] = pct
        self.root.update_idletasks()

    def run_convert(self):
        if not self.file_paths:
            messagebox.showwarning("알림", "엑셀 파일을 먼저 추가하세요.")
            return
        out_dir = Path(self.out_dir.get())
        if not out_dir.exists():
            if messagebox.askyesno("폴더 없음", f"'{out_dir}'를 새로 만들까요?"):
                out_dir.mkdir(parents=True, exist_ok=True)
            else:
                return

        self.run_btn.config(state="disabled", text="처리 중...")
        self.log.delete("1.0", "end")
        self.set_progress(0)

        t = threading.Thread(
            target=self._worker, args=(list(self.file_paths), out_dir), daemon=True
        )
        t.start()

    def _worker(self, file_paths, out_dir):
        try:
            result = convert_files(file_paths, out_dir, self.write_log, self.set_progress)
            if result:
                self.root.after(0, lambda: messagebox.showinfo(
                    "완료", f"변환이 완료되었습니다.\n\n출력 위치:\n{out_dir}"
                ))
                # 완료 후 폴더 자동 열기 (실수 방지)
                self.root.after(100, lambda: open_folder(str(out_dir)))
        except Exception as e:
            self.write_log(f"\n❌ 오류 발생: {e}")
            self.root.after(0, lambda: messagebox.showerror("오류", str(e)))
        finally:
            self.root.after(0, lambda: self.run_btn.config(state="normal", text="🚀 변환 시작"))


if __name__ == "__main__":
    root = tk.Tk()
    app = ConverterApp(root)
    root.mainloop()
