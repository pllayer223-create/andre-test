"""
샘플 일별 데이터 초기화 스크립트
- data/daily/YYYYMMDD/ 에 11개 JSON 파일 생성 (5/6~5/12 거래일)
- data/historical_daily.json 생성 (37개월 월별 시계열, 금리 시리즈 보강)

실행:
  python init_sample_data.py
"""
import json, random
from pathlib import Path
from datetime import date

BASE      = Path(__file__).parent
DAILY_DIR = BASE / "data" / "daily"
HIST_PATH = BASE / "data" / "historical_daily.json"

random.seed(42)

# ── 2025 연말 기준값 (YTD 계산 기준) ─────────────────────────────────
YE25 = {
    "kospi": 4215.0, "kospi200": 607.0, "kosdaq": 925.0, "usdkrw": 1439.0,
    "us_2y": 3.473, "us_10y": 4.169, "us_30y": 4.847,
    "de_10y": 2.858, "jp_10y": 2.073,
    "dow": 44800.0, "sp500": 6850.0, "nasdaq": 23200.0,
    "nikkei": 50300.0, "hang_h": 8912.0, "dax": 24500.0,
    "dxy": 98.25, "usdjpy": 156.70, "eurusd": 1.1747,
    "btc": 87432.0, "eth": 2973.0,
    "wti": 57.36, "brent": 60.98, "gold": 4551.0, "silver": 77.30,
    "sox": 7173.0, "copper": 12290.0,
    "cd91d": 2.750, "통안1y": 2.818, "통안2y": 3.433,
    "국고3y": 3.528, "국고5y": 3.735, "국고10y": 3.885,
    "은행3m": 2.810, "은행1y": 3.186, "은행2y": 3.579,
    "은행3y": 3.805, "은행5y": 3.996,
    "회사1y": 3.343, "회사3y": 4.009, "기타2y": 4.005,
}

# ── 5월 11일(월) 실제값 (example.png 기준) ────────────────────────────
MAY11 = {
    "kospi": 7822.24, "kospi200": 1211.44, "kosdaq": 1207.34, "usdkrw": 1472.40,
    "us_2y": 3.956, "us_10y": 4.414, "us_30y": 4.988,
    "de_10y": 3.047, "jp_10y": 2.525,
    "dow": 49704.0, "sp500": 7413.0, "nasdaq": 26274.0,
    "nikkei": 62418.0, "hang_h": 8884.0, "dax": 24350.0,
    "dxy": 97.93, "usdjpy": 157.11, "eurusd": 1.1784,
    "btc": 81651.0, "eth": 2337.0,
    "wti": 98.07, "brent": 104.21, "gold": 4731.0, "silver": 80.87,
    "sox": 12081.0, "copper": 13720.0,
    "cd91d": 2.810, "통안1y": 2.852, "통안2y": 3.495,
    "국고3y": 3.592, "국고5y": 3.772, "국고10y": 3.950,
    "은행3m": 2.748, "은행1y": 3.202, "은행2y": 3.673,
    "은행3y": 3.886, "은행5y": 4.052,
    "회사1y": 3.423, "회사3y": 4.177, "기타2y": 4.085,
    "if_ks_f": -28147, "if_ks_i": -458,   "if_ks_r": 28669,
    "if_kd_f":   1160, "if_kd_i": -1630,  "if_kd_r":   847,
    "if_k2_f":  -9201, "if_k2_i": 11544,  "if_k2_r": -2313,
    "if_b3_f":   9802, "if_b3_i": -9937,  "if_b3_r":   136,
    "if_b10_f":  4544, "if_b10_i": -5063, "if_b10_r":   500,
}

RATE_KEYS = {
    "us_2y","us_10y","us_30y","de_10y","jp_10y",
    "cd91d","통안1y","통안2y","국고3y","국고5y","국고10y",
    "은행3m","은행1y","은행2y","은행3y","은행5y",
    "회사1y","회사3y","기타2y",
}

def wiggle(base, scale=0.012, is_rate=False):
    if is_rate:
        return round(base + random.gauss(0, scale), 3)
    return round(base * (1 + random.gauss(0, scale)), 2)

def gen_prior(ref):
    out = {}
    flow_keys = [k for k in ref if k.startswith("if_")]
    for k, v in ref.items():
        if k in flow_keys:
            out[k] = int(v * (1 + random.uniform(-0.25, 0.25)))
        elif k in RATE_KEYS:
            out[k] = wiggle(v, 0.008, is_rate=True)
        elif isinstance(v, float):
            out[k] = wiggle(v * 0.992, 0.010)
        else:
            out[k] = v
    return out

REPORT_MAP = {
    "20260506": "2026-05-05",
    "20260507": "2026-05-06",
    "20260508": "2026-05-07",
    "20260511": "2026-05-08",
    "20260512": "2026-05-11",
}

day_seq = ["2026-05-05","2026-05-06","2026-05-07","2026-05-08","2026-05-11"]
market_data = {"2026-05-11": MAY11}
prev = MAY11
for dd in reversed(day_seq[:-1]):
    prev = gen_prior(prev)
    market_data[dd] = prev

# ── 핵심 요약 ────────────────────────────────────────────────────────
SUMMARIES = {
    "2026-05-11": "미중 관세 유예 합의(90일) 및 4월 고용 호조(비농업 +115K, 예상 대비 +53K 상회)를 반영해 국내외 위험자산 강세. WTI $98 돌파·장기금리 동반 상승으로 인플레이션 경계감은 지속.",
    "2026-05-08": "미국 고용지표(비농업 발표 예정) 대기로 관망세. 이란 핵협상 교착 지속으로 WTI $95대 유지. 국내 채권시장 약세, 외국인 국채선물 매도 지속.",
    "2026-05-07": "4월 PCE 물가 전년비 2.6%(예상 2.5% 상회)로 연준 매파 기조 강화. WTI $95 돌파, 국내 장기 금리 상방 압력 증가.",
    "2026-05-06": "ISM 서비스업 PMI 54.2(예상 52.5 상회)로 경기 회복력 확인. 달러 강세·국내 채권시장 보합 등락.",
    "2026-05-05": "이란 제재 우려 고조로 안전자산 수요 증가, 미국채 금리 소폭 하락. 국내 주식시장 횡보, 외국인 매도 우위.",
}

# ── 경제지표 ─────────────────────────────────────────────────────────
INDICATORS = {
    "2026-05-11": [
        {"name": "미국 비농업취업자",    "date": "05/02", "actual": "+115K", "forecast": "+62K",  "previous": "+125K", "eval": "상회"},
        {"name": "미국 실업률",         "date": "05/02", "actual": "4.2%",  "forecast": "4.3%",  "previous": "4.2%",  "eval": "부합"},
        {"name": "미국 PCE (전년비)",   "date": "04/30", "actual": "2.6%",  "forecast": "2.5%",  "previous": "2.7%",  "eval": "상회"},
        {"name": "미국 ISM 서비스업",   "date": "05/05", "actual": "54.2",  "forecast": "52.5",  "previous": "53.4",  "eval": "상회"},
        {"name": "한국 CPI (전년비)",   "date": "05/02", "actual": "3.1%",  "forecast": "3.0%",  "previous": "3.2%",  "eval": "상회"},
        {"name": "유로존 CPI (전년비)", "date": "04/30", "actual": "2.3%",  "forecast": "2.2%",  "previous": "2.4%",  "eval": "상회"},
    ],
    "2026-05-08": [
        {"name": "미국 ADP 고용",       "date": "05/07", "actual": "+98K",  "forecast": "+110K", "previous": "+134K", "eval": "하회"},
        {"name": "미국 주간 실업청구",  "date": "05/08", "actual": "218K",  "forecast": "225K",  "previous": "222K",  "eval": "부합"},
        {"name": "미국 ISM 제조업",     "date": "05/01", "actual": "49.2",  "forecast": "48.5",  "previous": "49.0",  "eval": "상회"},
        {"name": "한국 수출 (전년비)",  "date": "05/01", "actual": "+4.5%", "forecast": "+3.2%", "previous": "+3.1%", "eval": "상회"},
    ],
    "2026-05-07": [
        {"name": "미국 PCE (전년비)",   "date": "04/30", "actual": "2.6%",  "forecast": "2.5%",  "previous": "2.7%",  "eval": "상회"},
        {"name": "미국 근원 PCE",       "date": "04/30", "actual": "2.4%",  "forecast": "2.3%",  "previous": "2.5%",  "eval": "상회"},
        {"name": "미국 GDP (1Q 확정)",  "date": "04/30", "actual": "2.3%",  "forecast": "2.2%",  "previous": "2.4%",  "eval": "상회"},
        {"name": "미국 소비자신뢰지수", "date": "04/29", "actual": "98.3",  "forecast": "100.0", "previous": "101.2", "eval": "하회"},
    ],
    "2026-05-06": [
        {"name": "미국 ISM 서비스업",   "date": "05/05", "actual": "54.2",  "forecast": "52.5",  "previous": "53.4",  "eval": "상회"},
        {"name": "미국 공장주문",       "date": "05/05", "actual": "+1.2%", "forecast": "+0.8%", "previous": "-0.3%", "eval": "상회"},
        {"name": "한국 PMI 제조업",     "date": "05/02", "actual": "50.8",  "forecast": "50.5",  "previous": "50.3",  "eval": "상회"},
    ],
    "2026-05-05": [
        {"name": "미국 ISM 제조업",     "date": "05/01", "actual": "49.2",  "forecast": "48.5",  "previous": "49.0",  "eval": "상회"},
        {"name": "한국 수출 (전년비)",  "date": "05/01", "actual": "+4.5%", "forecast": "+3.2%", "previous": "+3.1%", "eval": "상회"},
        {"name": "중국 PMI 제조업",     "date": "04/30", "actual": "49.5",  "forecast": "49.8",  "previous": "50.5",  "eval": "하회"},
    ],
}

# ── 주요 일정 ────────────────────────────────────────────────────────
SCHEDULES = {
    "2026-05-11": [
        {"date": "05/13", "time": "21:30", "country": "미국", "event": "CPI (4월)",         "forecast": "3.3%",   "previous": "3.4%",  "importance": "★★★"},
        {"date": "05/13", "time": "21:30", "country": "미국", "event": "근원 CPI (4월)",    "forecast": "3.0%",   "previous": "3.1%",  "importance": "★★★"},
        {"date": "05/14", "time": "00:00", "country": "한국", "event": "한은 금통위",        "forecast": "동결",   "previous": "3.50%", "importance": "★★★"},
        {"date": "05/14", "time": "21:30", "country": "미국", "event": "PPI (4월)",         "forecast": "2.5%",   "previous": "2.7%",  "importance": "★★"},
        {"date": "05/14", "time": "23:00", "country": "미국", "event": "미시간대 소비자심리","forecast": "62.0",   "previous": "60.2",  "importance": "★★"},
        {"date": "05/15", "time": "21:30", "country": "미국", "event": "소매판매 (4월)",    "forecast": "+0.2%",  "previous": "-0.6%", "importance": "★★"},
        {"date": "05/15", "time": "21:30", "country": "미국", "event": "필라델피아 연준 제조업","forecast": "3.5","previous": "2.6",   "importance": "★★"},
        {"date": "05/16", "time": "21:30", "country": "미국", "event": "주택착공 (4월)",    "forecast": "135만",  "previous": "132만", "importance": "★"},
    ],
    "2026-05-08": [
        {"date": "05/09", "time": "21:30", "country": "미국", "event": "비농업취업자 (4월)","forecast": "+62K",   "previous": "+125K", "importance": "★★★"},
        {"date": "05/09", "time": "21:30", "country": "미국", "event": "실업률 (4월)",      "forecast": "4.3%",   "previous": "4.2%",  "importance": "★★★"},
        {"date": "05/09", "time": "21:30", "country": "미국", "event": "평균임금 (전년비)", "forecast": "3.9%",   "previous": "4.0%",  "importance": "★★"},
        {"date": "05/12", "time": "10:00", "country": "한국", "event": "수출입 동향 (4월)",  "forecast": "+4.0%",  "previous": "+3.1%", "importance": "★★"},
        {"date": "05/12", "time": "21:30", "country": "미국", "event": "CPI 선행 지표",     "forecast": "—",      "previous": "—",      "importance": "★"},
    ],
    "2026-05-07": [
        {"date": "05/07", "time": "21:15", "country": "미국", "event": "ADP 고용 (4월)",   "forecast": "+110K",  "previous": "+134K", "importance": "★★"},
        {"date": "05/08", "time": "21:30", "country": "미국", "event": "주간 실업청구건수", "forecast": "225K",   "previous": "222K",  "importance": "★★"},
        {"date": "05/09", "time": "21:30", "country": "미국", "event": "비농업취업자 (4월)","forecast": "+62K",   "previous": "+125K", "importance": "★★★"},
        {"date": "05/08", "time": "00:00", "country": "유럽", "event": "ECB 통화정책 회의", "forecast": "동결",   "previous": "2.50%", "importance": "★★★"},
    ],
    "2026-05-06": [
        {"date": "05/06", "time": "22:00", "country": "미국", "event": "공장주문 (3월)",   "forecast": "+0.8%",  "previous": "-0.3%", "importance": "★"},
        {"date": "05/07", "time": "21:15", "country": "미국", "event": "ADP 고용 (4월)",   "forecast": "+110K",  "previous": "+134K", "importance": "★★"},
        {"date": "05/07", "time": "21:30", "country": "미국", "event": "무역수지 (3월)",   "forecast": "-$95B",  "previous": "-$92B", "importance": "★★"},
        {"date": "05/08", "time": "00:00", "country": "유럽", "event": "ECB 통화정책 회의", "forecast": "동결",   "previous": "2.50%", "importance": "★★★"},
    ],
    "2026-05-05": [
        {"date": "05/05", "time": "23:00", "country": "미국", "event": "ISM 서비스업 (4월)","forecast": "52.5",  "previous": "53.4",  "importance": "★★★"},
        {"date": "05/06", "time": "22:00", "country": "미국", "event": "공장주문 (3월)",   "forecast": "+0.8%",  "previous": "-0.3%", "importance": "★"},
        {"date": "05/07", "time": "21:15", "country": "미국", "event": "ADP 고용 (4월)",   "forecast": "+110K",  "previous": "+134K", "importance": "★★"},
        {"date": "05/05", "time": "09:00", "country": "한국", "event": "한국 CPI (4월)",   "forecast": "3.2%",   "previous": "3.1%",  "importance": "★★★"},
    ],
}

# ── 코멘터리 ─────────────────────────────────────────────────────────
COMMENTS = {
    "2026-05-11": [
        {"tag": "국내", "source": "삼성증권 채권팀",
         "text": "국내 채권시장은 미국-이란 종전 협상 교착 장기화와 신성환 금통위원의 매파적인 발언, 외국인 투자자의 국채 선물 매도세에 금리 상승. 신성환 한은 금통위원은 고유가로 인한 물가 상승 우려가 크며, 성장과 물가가 상충하는 상황이더라도 물가에 무게를 두는 것이 적절하다고 설명."},
        {"tag": "해외", "source": "미래에셋증권 Global Macro",
         "text": "미국 채권시장은 미국-이란의 종전 협상 교착 속, 영국 정치 불안으로 인한 영국 금리 상승세와 3년물 입찰 부진 등 영향으로 금리 상승. 트럼프 대통령은 이란이 핵 문제에 대한 양보가 없었기에 종전안을 거부했다고 밝힘. 미중 90일 관세 유예 합의로 위험자산 강세."},
    ],
    "2026-05-08": [
        {"tag": "국내", "source": "KB증권 FICC",
         "text": "국내 채권시장은 미중 무역 협상 기대감에 금리 소폭 하락. 한은 5월 금통위 의사록 공개를 앞두고 관망세 지속. 외국인의 국채 선물 순매도는 3거래일 연속 이어지며 매수 여력 부재."},
        {"tag": "해외", "source": "JP모건 Fixed Income",
         "text": "미국 채권시장은 4월 고용지표(비농업 +115K, 예상 +62K 크게 상회) 대기로 관망세. 연준 위원들의 매파적 발언이 이어지며 금리인하 기대감 후퇴. 연방기금 선물은 '26년 내 1회 인하로 기대 축소."},
    ],
    "2026-05-07": [
        {"tag": "국내", "source": "신한투자증권 채권분석",
         "text": "국내 금리는 외국인 매도세 지속으로 약세. 유가 상승에 따른 인플레이션 우려가 반영되며 금리 상방 압력 지속. 국고채 10년물은 전일 대비 3bp 상승하며 4% 육박."},
        {"tag": "해외", "source": "골드만삭스 Rates Strategy",
         "text": "미국 10년물 금리는 4월 PCE 물가(전년비 2.6%, 예상 2.5% 상회)로 상승. 연준의 긴축 기조 유지 가능성이 높아지며 장기금리 상승 압력. 2년-10년 스프레드 확대, 커브 스티프닝."},
    ],
    "2026-05-06": [
        {"tag": "국내", "source": "한국투자증권 채권팀",
         "text": "국내 채권시장은 보합권 등락. 외국인의 국채 선물 매도가 지속되며 금리 상승 압력이 이어짐. 단기물(통안 2년) 수급은 양호하나 장기물 약세 지속."},
        {"tag": "해외", "source": "씨티그룹 G10 Rates",
         "text": "미국 금리는 ISM 서비스업 PMI 54.2(예상 52.5 상회)로 상승. 견고한 고용시장과 경기 회복력 반영. 달러 지수(DXY) 강세 전환, 이머징 시장 통화 압력."},
    ],
    "2026-05-05": [
        {"tag": "국내", "source": "하나증권 채권분석",
         "text": "국내 채권시장은 주간 강세 마감 후 소폭 조정. 한미 금리차 확대에 따른 자본유출 우려 상존. 한국은행 기준금리 동결(2.75%) 기조 속 완화 기대감 점진적 소멸."},
        {"tag": "해외", "source": "BofA Global Research",
         "text": "미국 채권시장은 서방의 이란 제재 우려 고조로 안전자산 수요 증가, 금리 소폭 하락. WTI 급등($97 돌파)으로 스태그플레이션 리스크 부각, 위험 회피 심리 확산."},
    ],
}

# ── 부호 포맷 ─────────────────────────────────────────────────────────
def sign_bp(bp):
    if bp is None: return "—"
    if abs(bp) < 0.05: return "▲0.0bp"
    return f"{'▲' if bp > 0 else '▼'}{abs(bp):.1f}bp"

def sign_pct(p):
    if p is None: return "—"
    if abs(p) < 0.005: return "▲0.0%"
    return f"{'▲' if p > 0 else '▼'}{abs(p):.1f}%"


# ── 파일 생성 ─────────────────────────────────────────────────────────
def build_files(report_dt: str, data_dt: str):
    cur  = market_data[data_dt]
    idx  = day_seq.index(data_dt)
    prev = market_data[day_seq[idx - 1]] if idx > 0 else cur

    out = DAILY_DIR / report_dt
    out.mkdir(parents=True, exist_ok=True)

    def bp_pd(k):   return round((cur[k] - prev[k]) * 100, 1)
    def bp_ytd(k):  return round((cur[k] - YE25[k])  * 100, 1)
    def pct_pd(k):  return round((cur[k] / prev[k] - 1) * 100, 1)
    def pct_ytd(k): return round((cur[k] / YE25[k]  - 1) * 100, 1)

    # 1. 핵심 요약
    summary = {
        "data_date": data_dt,
        "text": SUMMARIES.get(data_dt, "데이터 준비 중입니다.")
    }
    (out / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    # 2. 경제지표
    indicators = {
        "data_date": data_dt,
        "items": INDICATORS.get(data_dt, []),
        "note": "실제치>예상치: 상회 / 실제치=예상치: 부합 / 실제치<예상치: 하회"
    }
    (out / "indicators.json").write_text(json.dumps(indicators, ensure_ascii=False, indent=2), encoding="utf-8")

    # 3. 주요 일정
    schedule = {
        "data_date": data_dt,
        "items": SCHEDULES.get(data_dt, []),
        "note": "★★★: 고중요도 / ★★: 중간 / ★: 낮음 | 시간: ET 기준"
    }
    (out / "schedule.json").write_text(json.dumps(schedule, ensure_ascii=False, indent=2), encoding="utf-8")

    # 4. 국내 금리
    kr_rates = [
        ("CD 91D",           "cd91d"),
        ("통안채 1Y",         "통안1y"),
        ("통안채 2Y",         "통안2y"),
        ("국고채 3Y",         "국고3y"),
        ("국고채 5Y",         "국고5y"),
        ("국고채 10Y",        "국고10y"),
        ("은행채 3M",         "은행3m"),
        ("은행채 1Y",         "은행1y"),
        ("은행채 2Y",         "은행2y"),
        ("은행채 3Y",         "은행3y"),
        ("은행채 5Y",         "은행5y"),
        ("회사채 1Y (AA)",    "회사1y"),
        ("회사채 3Y (AA)",    "회사3y"),
        ("기타금융채 2Y (AA-)","기타2y"),
    ]
    dom_rates = {"data_date": data_dt, "items": [], "source": "https://data.krx.co.kr"}
    for name, k in kr_rates:
        pd = bp_pd(k); yd = bp_ytd(k)
        dom_rates["items"].append({
            "name": name, "value": round(cur[k], 3),
            "prev_day_bp": pd, "ytd_bp": yd,
            "prev_day_str": sign_bp(pd), "ytd_str": sign_bp(yd),
        })
    (out / "domestic_rates.json").write_text(json.dumps(dom_rates, ensure_ascii=False, indent=2), encoding="utf-8")

    # 5. 국내 주식/환율
    dom_mkt = {"data_date": data_dt, "items": [], "source": "https://data.krx.co.kr"}
    for name, k in [("KOSPI","kospi"),("KOSPI 200","kospi200"),("KOSDAQ","kosdaq"),("USDKRW","usdkrw")]:
        pd = pct_pd(k); yd = pct_ytd(k)
        dom_mkt["items"].append({
            "name": name, "value": round(cur[k], 2),
            "prev_day_pct": pd, "ytd_pct": yd,
            "prev_day_str": sign_pct(pd), "ytd_str": sign_pct(yd),
        })
    (out / "domestic_markets.json").write_text(json.dumps(dom_mkt, ensure_ascii=False, indent=2), encoding="utf-8")

    # 6. 투자자별 전일 동향
    flow = {
        "data_date": data_dt, "unit": "억원",
        "items": [
            {"market": "KOSPI",          "foreign": cur["if_ks_f"],  "institution": cur["if_ks_i"],  "individual": cur["if_ks_r"]},
            {"market": "KOSDAQ",         "foreign": cur["if_kd_f"],  "institution": cur["if_kd_i"],  "individual": cur["if_kd_r"]},
            {"market": "KOSPI 200 선물", "foreign": cur["if_k2_f"],  "institution": cur["if_k2_i"],  "individual": cur["if_k2_r"]},
            {"market": "국채 3년 선물",  "foreign": cur["if_b3_f"],  "institution": cur["if_b3_i"],  "individual": cur["if_b3_r"]},
            {"market": "국채 10년 선물", "foreign": cur["if_b10_f"], "institution": cur["if_b10_i"], "individual": cur["if_b10_r"]},
        ],
        "source": "https://data.krx.co.kr"
    }
    (out / "investor_flow.json").write_text(json.dumps(flow, ensure_ascii=False, indent=2), encoding="utf-8")

    # 7. 해외 금리
    os_rates = {"data_date": data_dt, "items": [], "source": "https://investing.com"}
    for name, k in [("미국 2Y","us_2y"),("미국 10Y","us_10y"),("미국 30Y","us_30y"),
                    ("독일 10Y","de_10y"),("일본 10Y","jp_10y")]:
        pd = bp_pd(k); yd = bp_ytd(k)
        os_rates["items"].append({
            "name": name, "value": round(cur[k], 3),
            "prev_day_bp": pd, "ytd_bp": yd,
            "prev_day_str": sign_bp(pd), "ytd_str": sign_bp(yd),
        })
    (out / "overseas_rates.json").write_text(json.dumps(os_rates, ensure_ascii=False, indent=2), encoding="utf-8")

    # 8. 해외 주식/환율/암호화폐
    os_mkt = {"data_date": data_dt, "stocks": [], "fx": [], "crypto": [], "source": "https://investing.com"}
    for name, k in [("DOW","dow"),("S&P 500","sp500"),("NASDAQ","nasdaq"),
                    ("일본 니케이 225","nikkei"),("홍콩 항셍 H","hang_h"),("독일 DAX","dax")]:
        pd = pct_pd(k); yd = pct_ytd(k)
        os_mkt["stocks"].append({"name":name,"value":round(cur[k],2),"prev_day_pct":pd,"ytd_pct":yd,"prev_day_str":sign_pct(pd),"ytd_str":sign_pct(yd)})
    for name, k in [("달러인덱스","dxy"),("USDJPY","usdjpy"),("EURUSD","eurusd")]:
        pd = pct_pd(k); yd = pct_ytd(k)
        os_mkt["fx"].append({"name":name,"value":round(cur[k],4 if k=="eurusd" else 2),"prev_day_pct":pd,"ytd_pct":yd,"prev_day_str":sign_pct(pd),"ytd_str":sign_pct(yd)})
    for name, k in [("비트코인(USD)","btc"),("이더리움(USD)","eth")]:
        pd = pct_pd(k); yd = pct_ytd(k)
        os_mkt["crypto"].append({"name":name,"value":round(cur[k],0),"prev_day_pct":pd,"ytd_pct":yd,"prev_day_str":sign_pct(pd),"ytd_str":sign_pct(yd)})
    (out / "overseas_markets.json").write_text(json.dumps(os_mkt, ensure_ascii=False, indent=2), encoding="utf-8")

    # 9. 상품
    comm = {"data_date": data_dt, "items": [], "source": "https://investing.com"}
    for name, k in [("WTI","wti"),("BRENT","brent"),("금","gold"),("은","silver"),
                    ("PHIL 반도체지수","sox"),("구리","copper")]:
        pd = pct_pd(k); yd = pct_ytd(k)
        comm["items"].append({"name":name,"value":round(cur[k],2),"prev_day_pct":pd,"ytd_pct":yd,"prev_day_str":sign_pct(pd),"ytd_str":sign_pct(yd)})
    (out / "commodities.json").write_text(json.dumps(comm, ensure_ascii=False, indent=2), encoding="utf-8")

    # 10. 코멘터리
    (out / "commentary.json").write_text(
        json.dumps({"data_date": data_dt, "items": COMMENTS.get(data_dt, [{"tag":"국내","text":"—"},{"tag":"해외","text":"—"}])},
                   ensure_ascii=False, indent=2), encoding="utf-8")

    # 11. 크레딧 스프레드
    gov2y  = round(cur["통안2y"], 3)
    corp3y = round(cur["회사3y"], 3)
    (out / "credit_spread.json").write_text(json.dumps({
        "data_date": data_dt,
        "labels":     ["2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"],
        "gov_2y":     [3.200, 3.150, 3.300, 3.400, 3.430, gov2y],
        "corp_aa_2y": [3.800, 3.720, 3.900, 4.000, 4.090, corp3y],
        "spread":     [0.600, 0.570, 0.600, 0.600, 0.660, round(corp3y - gov2y, 3)],
        "source": "https://data.krx.co.kr"
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"  [OK] {report_dt} → data: {data_dt} (11개 파일)")


# ── 실행 ─────────────────────────────────────────────────────────────
print("■ 일별 샘플 데이터 생성 중...")
for rdt, ddt in REPORT_MAP.items():
    build_files(rdt, ddt)

# ── 37개월 히스토리컬 데이터 (금리 시리즈 보강) ───────────────────────
print("\n■ 37개월 히스토리컬 데이터 생성 중...")

def make_labels():
    labels, d = [], date(2023, 5, 1)
    while d <= date(2026, 5, 1):
        labels.append(d.strftime("%Y-%m"))
        d = date(d.year + (1 if d.month == 12 else 0),
                 1 if d.month == 12 else d.month + 1, 1)
    return labels

def interp(start, end, n, seed=0, noise=0.03):
    random.seed(seed)
    return [round(start + (end-start)*i/(n-1) + random.gauss(0, abs(end-start)*noise), 2)
            for i in range(n)]

def interp_rate(start, end, n, seed=0, noise=0.08):
    random.seed(seed)
    vals = [round(start + (end-start)*i/(n-1) + random.gauss(0, noise), 3) for i in range(n)]
    vals[-1] = end
    return vals

labels = make_labels()
n = len(labels)

hist = {
    "labels": labels,
    "_note": "월별 시계열 (2023-05 ~ 2026-05). 출처: data.krx.co.kr, investing.com",
    # 국내 주식/환율
    "kospi":    {"label":"KOSPI",    "unit":"pt",   "source":"https://data.krx.co.kr", "values": interp(2420,7822,n,1,0.05)},
    "kospi200": {"label":"KOSPI 200","unit":"pt",   "source":"https://data.krx.co.kr", "values": interp(308,1211,n,2,0.05)},
    "kosdaq":   {"label":"KOSDAQ",   "unit":"pt",   "source":"https://data.krx.co.kr", "values": interp(781,1207,n,3,0.04)},
    "usdkrw":   {"label":"USD/KRW",  "unit":"원",   "source":"https://data.krx.co.kr", "values": interp(1310,1472,n,4,0.02)},
    # 해외 주식
    "sp500":    {"label":"S&P 500",  "unit":"pt",   "source":"https://investing.com",  "values": interp(4200,7413,n,15,0.04)},
    "nasdaq":   {"label":"NASDAQ",   "unit":"pt",   "source":"https://investing.com",  "values": interp(14100,26274,n,16,0.05)},
    "dow":      {"label":"DOW",      "unit":"pt",   "source":"https://investing.com",  "values": interp(33500,49704,n,17,0.03)},
    "nikkei":   {"label":"닛케이225", "unit":"pt",   "source":"https://investing.com",  "values": interp(29200,62418,n,18,0.04)},
    # 해외 금리
    "us_10y":   {"label":"미국 10Y",  "unit":"%",   "source":"https://investing.com",  "values": interp_rate(3.65,4.414,n,5,0.15)},
    "us_2y":    {"label":"미국 2Y",   "unit":"%",   "source":"https://investing.com",  "values": interp_rate(4.60,3.956,n,6,0.15)},
    "us_30y":   {"label":"미국 30Y",  "unit":"%",   "source":"https://investing.com",  "values": interp_rate(3.85,4.988,n,7,0.12)},
    "de_10y":   {"label":"독일 10Y",  "unit":"%",   "source":"https://investing.com",  "values": interp_rate(2.45,3.047,n,8,0.10)},
    "jp_10y":   {"label":"일본 10Y",  "unit":"%",   "source":"https://investing.com",  "values": interp_rate(0.43,2.525,n,9,0.07)},
    # 국내 금리 (비교 차트용) — 시리즈 보강
    "국고3y":     {"label":"국고채 3Y",        "unit":"%", "source":"https://data.krx.co.kr", "values": interp_rate(3.65,3.592,n,21,0.10)},
    "국고5y":     {"label":"국고채 5Y",        "unit":"%", "source":"https://data.krx.co.kr", "values": interp_rate(3.70,3.772,n,30,0.09)},
    "국고10y":    {"label":"국고채 10Y",       "unit":"%", "source":"https://data.krx.co.kr", "values": interp_rate(3.70,3.950,n,31,0.09)},
    "은행1y":     {"label":"은행채 1Y",        "unit":"%", "source":"https://data.krx.co.kr", "values": interp_rate(3.55,3.202,n,32,0.09)},
    "은행2y":     {"label":"은행채 2Y",        "unit":"%", "source":"https://data.krx.co.kr", "values": interp_rate(3.80,3.673,n,23,0.08)},
    "은행3y":     {"label":"은행채 3Y",        "unit":"%", "source":"https://data.krx.co.kr", "values": interp_rate(3.90,3.886,n,33,0.08)},
    "회사1y_aa":  {"label":"회사채 1Y (AA)",   "unit":"%", "source":"https://data.krx.co.kr", "values": interp_rate(3.70,3.423,n,34,0.08)},
    "회사3y_aa":  {"label":"회사채 3Y (AA)",   "unit":"%", "source":"https://data.krx.co.kr", "values": interp_rate(4.20,4.177,n,22,0.08)},
    "기타2y_aa":  {"label":"기타금융채 2Y (AA-)","unit":"%","source":"https://data.krx.co.kr","values": interp_rate(4.15,4.085,n,35,0.08)},
    "통안2y":     {"label":"통안채 2Y",        "unit":"%", "source":"https://data.krx.co.kr", "values": interp_rate(3.50,3.495,n,36,0.09)},
    # 원자재/암호화폐
    "wti":      {"label":"WTI 원유",   "unit":"$/bbl","source":"https://investing.com", "values": interp(73.0,98.07,n,10,0.06)},
    "brent":    {"label":"BRENT",      "unit":"$/bbl","source":"https://investing.com", "values": interp(77.0,104.21,n,11,0.06)},
    "gold":     {"label":"금",         "unit":"$/oz", "source":"https://investing.com", "values": interp(1970,4731,n,12,0.03)},
    "silver":   {"label":"은",         "unit":"$/oz", "source":"https://investing.com", "values": interp(23.5,80.87,n,13,0.04)},
    "btc":      {"label":"비트코인",   "unit":"USD",  "source":"https://investing.com", "values": interp(27000,81651,n,19,0.08)},
    "eth":      {"label":"이더리움",   "unit":"USD",  "source":"https://investing.com", "values": interp(1800,2337,n,20,0.06)},
}

# 크레딧 스프레드
g3 = hist["국고3y"]["values"]
c3 = hist["회사3y_aa"]["values"]
hist["spread_3y"] = {
    "label":"크레딧 스프레드 (회사채3Y-국고3Y)","unit":"%p",
    "source":"https://data.krx.co.kr",
    "values": [round(c3[i]-g3[i],3) for i in range(n)]
}

HIST_PATH.write_text(json.dumps(hist, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"  [OK] {HIST_PATH}  ({len([k for k in hist if k not in ('labels','_note')])}개 시리즈)")
print("\n완료!")
