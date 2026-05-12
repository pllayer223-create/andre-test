"""
일별 시장 데이터 자동 수집기 (Q5/Q6/Q7)

데이터 소스:
  - KRX (data.krx.co.kr): 국내 금리, 주식, 투자자별 동향
  - yfinance: 해외 주식, 환율, 원자재, 암호화폐
  - 수동 입력 폴백: 수집 실패 시 이전 값 유지

사용법:
  python collect_daily.py                  # 오늘 날짜
  python collect_daily.py --date 20260512  # 특정 날짜
  python collect_daily.py --test           # 연결 테스트만

의존성:
  pip install requests yfinance beautifulsoup4

주의: KRX API는 장 마감 후(오후 5시 이후) 데이터가 업데이트됩니다.
"""

import json, sys, os, datetime, time
from pathlib import Path

BASE = Path(__file__).parent

try:
    import requests
    REQUESTS_OK = True
except ImportError:
    REQUESTS_OK = False
    print("[WARN] requests 미설치: pip install requests")

try:
    import yfinance as yf
    YF_OK = True
except ImportError:
    YF_OK = False
    print("[WARN] yfinance 미설치: pip install yfinance")


# ── KRX API 수집 ────────────────────────────────────────────────────

KRX_BASE = "https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd"
KRX_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://data.krx.co.kr/",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
}


def krx_post(bld: str, params: dict, timeout=10) -> dict | None:
    if not REQUESTS_OK:
        return None
    try:
        params["bld"] = bld
        resp = requests.post(KRX_BASE, data=params, headers=KRX_HEADERS, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as ex:
        print(f"  [KRX 오류] {bld}: {ex}")
        return None


def collect_krx_stocks(trade_date: str) -> dict | None:
    """KRX에서 주가지수 데이터 수집."""
    params = {
        "trdDd": trade_date,  # YYYYMMDD
        "mktId": "STK",
        "idxIndMidclssCd": "02",
    }
    raw = krx_post("dbms/MDC/STAT/standard/MDCSTAT00601", params)
    if not raw or "output" not in raw:
        return None

    result = {}
    for item in raw.get("output", []):
        name = item.get("IDX_NM", "")
        val  = item.get("CLSPRC_IDX", "0").replace(",","")
        if "코스피" in name and "200" not in name:
            result["kospi"] = float(val) if val else None
        elif "코스피 200" in name or "KOSPI 200" in name:
            result["kospi200"] = float(val) if val else None
        elif "코스닥" in name:
            result["kosdaq"] = float(val) if val else None
    return result if result else None


def collect_krx_investor_flow(trade_date: str) -> list | None:
    """KRX에서 투자자별 매매동향 수집."""
    params = {
        "trdDd": trade_date,
        "mktId": "STK",
    }
    raw = krx_post("dbms/MDC/STAT/standard/MDCSTAT02203", params)
    if not raw:
        return None

    flows = []
    for item in raw.get("output", []):
        name = item.get("MKT_NM", "")
        def get_int(key):
            v = item.get(key, "0").replace(",","").replace("+","").replace("-","")
            try: return int(item.get(key,"0").replace(",",""))
            except: return 0

        flows.append({
            "market": name,
            "foreign":     get_int("FORN_NETBID_TRDVAL"),
            "institution": get_int("ORGN_NETBID_TRDVAL"),
            "individual":  get_int("INDV_NETBID_TRDVAL"),
        })
    return flows if flows else None


# ── yfinance 수집 ────────────────────────────────────────────────────

YF_TICKERS = {
    # 미국 주식
    "dow":    "^DJI",
    "sp500":  "^GSPC",
    "nasdaq": "^IXIC",
    "nikkei": "^N225",
    "hang_h": "^HSCE",
    "dax":    "^GDAXI",
    # 환율
    "usdkrw": "USDKRW=X",
    "dxy":    "DX-Y.NYB",
    "usdjpy": "USDJPY=X",
    "eurusd": "EURUSD=X",
    # 원자재
    "wti":    "CL=F",
    "brent":  "BZ=F",
    "gold":   "GC=F",
    "silver": "SI=F",
    "copper": "HG=F",
    # 암호화폐
    "btc":    "BTC-USD",
    "eth":    "ETH-USD",
    # 미국 국채
    "us_2y":  "^IRX",   # 13주 (대리)
    "us_10y": "^TNX",
    "us_30y": "^TYX",
    # 반도체지수
    "sox":    "^SOXX",
}


def collect_yfinance(date_str: str) -> dict:
    """yfinance로 전날 종가 수집."""
    if not YF_OK:
        return {}

    from datetime import date, timedelta
    try:
        trade_dt = datetime.datetime.strptime(date_str, "%Y%m%d").date()
    except ValueError:
        trade_dt = datetime.date.today()

    start = (trade_dt - timedelta(days=7)).strftime("%Y-%m-%d")
    end   = (trade_dt + timedelta(days=1)).strftime("%Y-%m-%d")

    result = {}
    tickers = list(YF_TICKERS.values())

    try:
        data = yf.download(tickers, start=start, end=end, progress=False, auto_adjust=True)
        closes = data.get("Close", data) if isinstance(data.columns, object) else data

        for key, ticker in YF_TICKERS.items():
            try:
                series = closes[ticker].dropna()
                if len(series) > 0:
                    result[key] = round(float(series.iloc[-1]), 4)
            except Exception:
                pass
    except Exception as ex:
        print(f"  [yfinance 오류] {ex}")

    return result


# ── 변화율 계산 ──────────────────────────────────────────────────────

def load_prev_data(report_date: str) -> dict:
    """이전 보고서 날짜 데이터 로드."""
    daily_dir = BASE / "data" / "daily"
    folders = sorted([d.name for d in daily_dir.iterdir() if d.is_dir()
                      and d.name < report_date])
    if not folders:
        return {}

    prev_folder = daily_dir / folders[-1]
    combined = {}
    for fname in ["domestic_markets","overseas_rates","overseas_markets","commodities"]:
        fp = prev_folder / f"{fname}.json"
        if fp.exists():
            d = json.loads(fp.read_text(encoding="utf-8"))
            for section in ["items","stocks","fx","crypto"]:
                for item in d.get(section, []):
                    combined[item["name"]] = item.get("value")
    return combined


YE25 = {
    "KOSPI": 4215.0, "KOSPI 200": 607.0, "KOSDAQ": 925.0, "USDKRW": 1439.0,
    "미국 2Y": 3.473, "미국 10Y": 4.169, "미국 30Y": 4.847,
    "독일 10Y": 2.858, "일본 10Y": 2.073,
    "DOW": 44800, "S&P 500": 6850, "NASDAQ": 23200,
    "일본 니케이 225": 50300, "홍콩 항셍 H": 8912, "독일 DAX": 24500,
    "달러인덱스": 98.25, "USDJPY": 156.70, "EURUSD": 1.1747,
    "비트코인(USD)": 87432, "이더리움(USD)": 2973,
    "WTI": 57.36, "BRENT": 60.98, "금": 4551, "은": 77.30,
    "PHIL 반도체지수": 7173, "구리": 12290,
}


def sign_bp(bp):
    if bp is None: return "—"
    return f"{'▲' if bp > 0 else '▼'}{abs(bp):.1f}bp"

def sign_pct(p):
    if p is None: return "—"
    if abs(p) < 0.005: return "▲0.0%"
    return f"{'▲' if p > 0 else '▼'}{abs(p):.1f}%"

def calc_changes(name, val, prev_map, is_rate=False):
    prev = prev_map.get(name)
    ye   = YE25.get(name)

    if is_rate:
        pd = round((val - prev) * 100, 1) if prev and val else None
        yd = round((val - ye) * 100, 1)  if ye   and val else None
        return {"prev_day_bp": pd, "ytd_bp": yd,
                "prev_day_str": sign_bp(pd), "ytd_str": sign_bp(yd)}
    else:
        pd = round((val/prev - 1)*100, 1) if prev and val else None
        yd = round((val/ye   - 1)*100, 1) if ye   and val else None
        return {"prev_day_pct": pd, "ytd_pct": yd,
                "prev_day_str": sign_pct(pd), "ytd_str": sign_pct(yd)}


# ── 파일 저장 ────────────────────────────────────────────────────────

def save_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def build_and_save(report_date: str, yf_data: dict,
                   krx_stocks: dict | None, krx_flow: list | None,
                   data_date: str, prev_map: dict):

    out = BASE / "data" / "daily" / report_date

    # ── 국내 주식/환율 ────────────────────────────────────────────────
    kospi_val   = krx_stocks.get("kospi")   if krx_stocks else yf_data.get("kospi")
    kospi200_val= krx_stocks.get("kospi200")if krx_stocks else None
    kosdaq_val  = krx_stocks.get("kosdaq")  if krx_stocks else None
    krw_val     = yf_data.get("usdkrw")

    dom_mkt_items = []
    for name, val in [("KOSPI",kospi_val),("KOSPI 200",kospi200_val),
                      ("KOSDAQ",kosdaq_val),("USDKRW",krw_val)]:
        item = {"name": name, "value": round(val,2) if val else None}
        item.update(calc_changes(name, val, prev_map, is_rate=False))
        dom_mkt_items.append(item)
    save_json(out / "domestic_markets.json",
              {"data_date": data_date, "items": dom_mkt_items, "source": "https://data.krx.co.kr"})

    # ── 해외 금리 ─────────────────────────────────────────────────────
    os_rate_items = []
    for name, key in [("미국 2Y","us_2y"),("미국 10Y","us_10y"),("미국 30Y","us_30y"),
                      ("독일 10Y","de_10y"),("일본 10Y","jp_10y")]:
        val = yf_data.get(key)
        # yfinance TNX 등은 × 0.01 변환 불필요 (이미 % 단위)
        item = {"name": name, "value": round(val,3) if val else None}
        item.update(calc_changes(name, val, prev_map, is_rate=True))
        os_rate_items.append(item)
    save_json(out / "overseas_rates.json",
              {"data_date": data_date, "items": os_rate_items, "source": "https://investing.com / yfinance"})

    # ── 해외 주식/환율/암호화폐 ──────────────────────────────────────
    stock_map = [("DOW","dow"),("S&P 500","sp500"),("NASDAQ","nasdaq"),
                 ("일본 니케이 225","nikkei"),("홍콩 항셍 H","hang_h"),("독일 DAX","dax")]
    fx_map    = [("달러인덱스","dxy"),("USDJPY","usdjpy"),("EURUSD","eurusd")]
    crypto_map= [("비트코인(USD)","btc"),("이더리움(USD)","eth")]

    def mk_items(mapping):
        items = []
        for name, key in mapping:
            val = yf_data.get(key)
            item = {"name": name, "value": round(val,2) if val else None}
            item.update(calc_changes(name, val, prev_map, is_rate=False))
            items.append(item)
        return items

    save_json(out / "overseas_markets.json", {
        "data_date": data_date,
        "stocks": mk_items(stock_map),
        "fx":     mk_items(fx_map),
        "crypto": mk_items(crypto_map),
        "source": "https://investing.com / yfinance"
    })

    # ── 상품 ─────────────────────────────────────────────────────────
    comm_map = [("WTI","wti"),("BRENT","brent"),("금","gold"),("은","silver"),
                ("PHIL 반도체지수","sox"),("구리","copper")]
    save_json(out / "commodities.json", {
        "data_date": data_date,
        "items": mk_items(comm_map),
        "source": "https://investing.com / yfinance"
    })

    # ── 투자자 동향 ───────────────────────────────────────────────────
    if krx_flow:
        save_json(out / "investor_flow.json", {
            "data_date": data_date, "unit": "억원",
            "items": krx_flow, "source": "https://data.krx.co.kr"
        })
    else:
        # 이전 데이터에서 복사 또는 placeholder
        prev_fp = None
        daily_dir = BASE / "data" / "daily"
        prev_folders = sorted([d.name for d in daily_dir.iterdir()
                                if d.is_dir() and d.name < report_date])
        if prev_folders:
            prev_fp = daily_dir / prev_folders[-1] / "investor_flow.json"
        if prev_fp and prev_fp.exists():
            prev_d = json.loads(prev_fp.read_text(encoding="utf-8"))
            prev_d["data_date"] = data_date
            prev_d["_note"] = "이전 데이터 복사 (KRX 수집 실패)"
            save_json(out / "investor_flow.json", prev_d)

    # ── 국내 금리, 코멘터리, 크레딧 스프레드는 수동/init_sample 사용 ──
    # (KRX 채권 API는 별도 인증 필요 — 수동 입력 or excel_to_data.py 활용)
    for fname in ["domestic_rates.json", "commentary.json", "credit_spread.json"]:
        fp = out / fname
        if not fp.exists():
            # 이전 데이터 복사
            daily_dir = BASE / "data" / "daily"
            prev_folders = sorted([d.name for d in daily_dir.iterdir()
                                    if d.is_dir() and d.name < report_date])
            if prev_folders:
                prev_fp = daily_dir / prev_folders[-1] / fname
                if prev_fp.exists():
                    prev_d = json.loads(prev_fp.read_text(encoding="utf-8"))
                    prev_d["data_date"] = data_date
                    prev_d["_note"] = "이전 데이터 복사 (수동 업데이트 필요)"
                    save_json(fp, prev_d)


# ── 메인 ─────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    test_mode = "--test" in args
    args = [a for a in args if not a.startswith("--")]

    date_arg = None
    for i, a in enumerate(sys.argv[1:]):
        if a == "--date" and i + 1 < len(sys.argv) - 1:
            date_arg = sys.argv[i + 2].replace("-","")

    if not date_arg:
        date_arg = args[0] if args else datetime.date.today().strftime("%Y%m%d")

    # 데이터 날짜 = 보고서 날짜 전 영업일 (간단히 -1일)
    dt = datetime.datetime.strptime(date_arg, "%Y%m%d")
    data_dt = dt - datetime.timedelta(days=1)
    while data_dt.weekday() >= 5:  # 토/일 건너뜀
        data_dt -= datetime.timedelta(days=1)
    data_date_str = data_dt.strftime("%Y-%m-%d")
    trade_date_krx = data_dt.strftime("%Y%m%d")

    print(f"[수집] 보고서: {date_arg}  |  데이터날짜: {data_date_str}")

    if test_mode:
        print("[테스트] 연결 확인 중...")
        if REQUESTS_OK:
            try:
                r = requests.get("https://data.krx.co.kr", timeout=5)
                print(f"  KRX 접속: {r.status_code}")
            except Exception as e:
                print(f"  KRX 접속 실패: {e}")
        if YF_OK:
            try:
                t = yf.Ticker("^GSPC")
                info = t.fast_info
                print(f"  yfinance S&P500: {info.last_price:.0f}")
            except Exception as e:
                print(f"  yfinance 실패: {e}")
        return

    # ── 데이터 수집 ───────────────────────────────────────────────────
    print("  [1/3] yfinance 수집 중...")
    yf_data = collect_yfinance(date_arg)
    print(f"       {len(yf_data)}개 지표 수집")

    print("  [2/3] KRX 주식 수집 중...")
    krx_stocks = collect_krx_stocks(trade_date_krx)
    print(f"       {'성공' if krx_stocks else '실패 (yfinance 폴백)'}")

    print("  [3/3] KRX 투자자 동향 수집 중...")
    krx_flow = collect_krx_investor_flow(trade_date_krx)
    print(f"       {'성공' if krx_flow else '실패 (이전 데이터 복사)'}")

    prev_map = load_prev_data(date_arg)

    build_and_save(date_arg, yf_data, krx_stocks, krx_flow, data_date_str, prev_map)

    print(f"\n[OK] data/daily/{date_arg}/ 저장 완료")
    print("  * 국내 금리/코멘터리는 수동 입력 또는 excel_to_data.py 사용 권장")
    print(f"\n다음 실행:")
    print(f"  python generate_daily.py {date_arg}")


if __name__ == "__main__":
    main()
