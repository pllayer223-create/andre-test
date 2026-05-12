"""
파이프라인 하네스 오케스트레이터 (Q2)

역할: 데이터 수집 → JSON 생성 → HTML/DOCX 보고서 생성을 자동화합니다.

사용법:
  python pipeline.py                  # 오늘 날짜로 전체 파이프라인 실행
  python pipeline.py --date 20260512  # 특정 날짜
  python pipeline.py --weekly         # 주간 보고서만
  python pipeline.py --daily          # 일별 보고서만
  python pipeline.py --dry-run        # 실행 계획만 출력

하네스 엔지니어링 개념:
  1. Collect (수집): collect_daily.py 실행 → data/daily/YYYYMMDD/ 생성
  2. Transform (가공): 이미 JSON 형태이므로 패스 (Excel 입력 시 excel_to_data.py)
  3. Generate (생성): generate_daily.py → archive/daily/
                      generate_html.py  → archive/index.html
                      generate_report.py→ archive/YYYY/*.docx  (주간만)
  4. Verify (검증): 파일 존재 확인, 오류 여부 체크
  5. Notify (알림): 완료 로그 출력

Claude Code 훅 연동:
  .claude/settings.json 의 hooks 항목에 등록하면
  매일 특정 시간에 자동 실행 가능.
"""

import sys, subprocess, datetime
from pathlib import Path

BASE = Path(__file__).parent

STAGES = {
    "collect_daily":  BASE / "collect_daily.py",
    "generate_daily": BASE / "generate_daily.py",
    "generate_html":  BASE / "generate_html.py",
    "generate_report":BASE / "generate_report.py",
}

LOG_PREFIX = {
    "collect":  "📡",
    "generate": "📄",
    "verify":   "✅",
    "error":    "❌",
    "skip":     "⏭",
}


def log(kind: str, msg: str):
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    prefix = LOG_PREFIX.get(kind, "ℹ")
    print(f"[{ts}] {prefix} {msg}", flush=True)


def run_script(script: Path, args: list[str], dry_run=False) -> bool:
    cmd = [sys.executable, str(script)] + args
    log("generate", f"실행: {script.name} {' '.join(args)}")
    if dry_run:
        print(f"     [dry-run] {' '.join(cmd)}")
        return True
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        if result.stdout:
            for line in result.stdout.strip().splitlines():
                print(f"     {line}")
        if result.returncode != 0:
            log("error", f"{script.name} 실패 (exit {result.returncode})")
            if result.stderr:
                print(result.stderr[:500])
            return False
        return True
    except Exception as ex:
        log("error", f"{script.name} 예외: {ex}")
        return False


def verify_outputs(date: str, run_weekly: bool) -> list[str]:
    """생성된 파일 검증."""
    expected = [
        BASE / "archive" / "daily" / "index.html",
        BASE / "archive" / "daily" / date[:4] / f"market_daily_{date}.html",
    ]
    if run_weekly:
        weekly_json = BASE / "data" / f"data_{date}.json"
        if weekly_json.exists():
            expected += [
                BASE / "archive" / date[:4] / f"Weekly foreign-macro_{date}.html",
            ]

    missing = [str(p) for p in expected if not p.exists()]
    return missing


def run_pipeline(date: str, run_daily=True, run_weekly=False,
                 skip_collect=False, dry_run=False):

    print(f"\n{'='*55}")
    print(f"  Market Daily 파이프라인 — {date}")
    print(f"  Daily: {'ON' if run_daily else 'OFF'}  |  Weekly: {'ON' if run_weekly else 'OFF'}")
    print(f"  {'[DRY-RUN 모드]' if dry_run else ''}")
    print(f"{'='*55}\n")

    ok = True

    # ── Stage 1: 데이터 수집 ───────────────────────────────────────
    if run_daily and not skip_collect:
        collect_script = STAGES["collect_daily"]
        if collect_script.exists():
            ok &= run_script(collect_script, [date], dry_run)
        else:
            log("skip", "collect_daily.py 없음 — 기존 data/daily/ 데이터 사용")
    else:
        log("skip", "수집 단계 건너뜀")

    # ── Stage 2: 일별 HTML 생성 ─────────────────────────────────
    if run_daily:
        ok &= run_script(STAGES["generate_daily"], [date], dry_run)

    # ── Stage 3: 주간 보고서 생성 ────────────────────────────────
    if run_weekly:
        weekly_json = BASE / "data" / f"data_{date}.json"
        if weekly_json.exists():
            ok &= run_script(STAGES["generate_html"],   [date], dry_run)
            ok &= run_script(STAGES["generate_report"], [date], dry_run)
        else:
            log("skip", f"주간 데이터 없음: data/data_{date}.json")

    # ── Stage 4: 검증 ────────────────────────────────────────────
    if not dry_run:
        missing = verify_outputs(date, run_weekly)
        if missing:
            log("error", f"누락된 출력 파일 {len(missing)}개:")
            for m in missing:
                print(f"     - {m}")
            ok = False
        else:
            log("verify", "출력 파일 모두 확인됨")

    # ── 완료 ─────────────────────────────────────────────────────
    print(f"\n{'='*55}")
    status = "성공" if ok else "일부 실패"
    print(f"  파이프라인 완료: {status}")
    print(f"{'='*55}\n")
    return ok


def main():
    args = sys.argv[1:]

    date_arg    = None
    run_weekly  = "--weekly" in args or "--all" in args
    run_daily   = "--daily"  in args or "--all" in args or True  # 기본 daily ON
    skip_collect= "--no-collect" in args
    dry_run     = "--dry-run" in args

    for i, a in enumerate(args):
        if a == "--date" and i + 1 < len(args):
            date_arg = args[i + 1].replace("-", "")

    if not date_arg:
        date_arg = datetime.date.today().strftime("%Y%m%d")

    success = run_pipeline(
        date=date_arg,
        run_daily=run_daily,
        run_weekly=run_weekly,
        skip_collect=skip_collect,
        dry_run=dry_run,
    )
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
