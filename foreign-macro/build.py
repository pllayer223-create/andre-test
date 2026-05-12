"""
Vercel 빌드 스크립트 (Q5)

Vercel 배포 시 자동 실행됨:
  1. 기존 데이터로 주간 대시보드 재생성 (archive/index.html)
  2. 기존 데이터로 일별 대시보드 재생성 (archive/daily/index.html)
  3. archive/ 폴더를 정적 파일로 서빙

로컬에서 미리보기:
  python build.py
  npx vercel dev  (vercel CLI 설치 필요)

배포:
  npx vercel --prod
"""

import subprocess, sys
from pathlib import Path

BASE = Path(__file__).parent

def run(cmd: list, desc: str):
    print(f"[build] {desc}")
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if result.stdout:
        for line in result.stdout.strip().splitlines():
            print(f"  {line}")
    if result.returncode != 0:
        print(f"  [ERROR] exit={result.returncode}")
        if result.stderr:
            print(result.stderr[:300])
        return False
    return True

def main():
    py = sys.executable
    ok = True

    # 1. 주간 대시보드
    ok &= run([py, str(BASE / "generate_html.py")], "주간 HTML 대시보드 생성")

    # 2. 일별 대시보드 (전체)
    ok &= run([py, str(BASE / "generate_daily.py"), "--all"], "일별 Market Daily 대시보드 생성")

    # 3. archive/index.html 이 없으면 daily로 리다이렉트하는 index 생성
    root_index = BASE / "archive" / "index.html"
    if not root_index.exists():
        root_index.write_text("""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="refresh" content="0;url=daily/index.html">
<title>Market Dashboard</title></head>
<body><p><a href="daily/index.html">Market Daily →</a></p></body></html>""", encoding="utf-8")
        print("  [OK] archive/index.html (리다이렉트) 생성")

    print(f"\n{'빌드 성공' if ok else '빌드 일부 실패'}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
