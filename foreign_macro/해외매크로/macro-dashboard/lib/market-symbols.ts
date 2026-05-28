// ────────────────────────────────────────────
// 지표 ID → API 심볼 매핑
// ────────────────────────────────────────────
//
// 데이터 소스:
//  - yahoo   : Yahoo Finance (v8/finance/chart, 무료)
//  - fred    : FRED API (api.stlouisfed.org, 무료 키 필요)
//  - bok     : 한국은행 ECOS API (ecos.bok.or.kr, 무료 키 필요)
//  - manual  : 자동 수집 불가 — 수기 입력 필요
// ────────────────────────────────────────────

export type DataSource = "yahoo" | "fred" | "bok" | "manual";

export interface SymbolMapping {
  /** dummy-data.ts의 EconomicIndicator.id */
  indicatorId: string;
  source: DataSource;
  /** API 요청에 사용할 심볼/시리즈 코드 */
  symbol: string;
  /** Yahoo Finance의 경우 조회 기간 (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y) */
  yahooRange?: string;
  yahooInterval?: string;
  /** FRED의 경우 조회 기간 */
  fredObservationStart?: string;
  /** BOK ECOS의 경우 통계표 코드와 주기 */
  bokStatCode?: string;
  bokCycle?: "D" | "M" | "Q" | "A";
  /** 값 변환 함수 (e.g., 소수점 → 퍼센트) */
  transform?: "multiply100" | "divide100" | "none";
  /** 이 지표를 가져올 수 없는 경우 사용할 fallback indicator id */
  fallbackId?: string;
}

// ── 국내 지표 ──────────────────────────────

export const DOMESTIC_SYMBOLS: SymbolMapping[] = [
  // 주가
  {
    indicatorId: "kospi",
    source: "yahoo",
    symbol: "^KS11",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "kosdaq",
    source: "yahoo",
    symbol: "^KQ11",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "kospi200",
    source: "yahoo",
    symbol: "^KS200",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  // 환율
  {
    indicatorId: "usdkrw",
    source: "yahoo",
    symbol: "KRW=X",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "eurkrw",
    source: "yahoo",
    symbol: "EURKRW=X",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "jpykrw",
    source: "yahoo",
    symbol: "JPYKRW=X",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "cnykrw",
    source: "yahoo",
    symbol: "CNYKRW=X",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  // 금리 — BOK (한국은행)
  {
    indicatorId: "bok-rate",
    source: "bok",
    symbol: "722Y001/0101000",
    bokStatCode: "722Y001",
    bokCycle: "D",
  },
  {
    indicatorId: "ktb-3m",
    source: "bok",
    symbol: "817Y002/010100000",
    bokStatCode: "817Y002",
    bokCycle: "D",
  },
  {
    indicatorId: "ktb-2y",
    source: "bok",
    symbol: "817Y002/010200000",
    bokStatCode: "817Y002",
    bokCycle: "D",
  },
  {
    indicatorId: "ktb-3y",
    source: "bok",
    symbol: "817Y002/010300000",
    bokStatCode: "817Y002",
    bokCycle: "D",
  },
  {
    indicatorId: "ktb-5y",
    source: "bok",
    symbol: "817Y002/010500000",
    bokStatCode: "817Y002",
    bokCycle: "D",
  },
  {
    indicatorId: "ktb-10y",
    source: "bok",
    symbol: "817Y002/010600000",
    bokStatCode: "817Y002",
    bokCycle: "D",
  },
  {
    indicatorId: "cd-91",
    source: "bok",
    symbol: "817Y002/010400000",
    bokStatCode: "817Y002",
    bokCycle: "D",
  },
  {
    indicatorId: "corp-aa",
    source: "bok",
    symbol: "817Y002/010700000",
    bokStatCode: "817Y002",
    bokCycle: "D",
  },
  // 물가 — 통계청/BOK (월간)
  {
    indicatorId: "cpi-kr",
    source: "bok",
    symbol: "901Y009/0",
    bokStatCode: "901Y009",
    bokCycle: "M",
  },
  {
    indicatorId: "ppi-kr",
    source: "bok",
    symbol: "404Y014/4900000",
    bokStatCode: "404Y014",
    bokCycle: "M",
  },
  // 성장 — BOK (분기)
  {
    indicatorId: "gdp-kr",
    source: "bok",
    symbol: "200Y002/10101",
    bokStatCode: "200Y002",
    bokCycle: "Q",
  },
  {
    indicatorId: "ip-kr",
    source: "bok",
    symbol: "301Y013/I37000",
    bokStatCode: "301Y013",
    bokCycle: "M",
  },
  // 고용 — 통계청 (월간)
  {
    indicatorId: "unemployment-kr",
    source: "bok",
    symbol: "901Y028/L",
    bokStatCode: "901Y028",
    bokCycle: "M",
  },
  // 기타
  {
    indicatorId: "m2-kr",
    source: "bok",
    symbol: "101Y003/AAAA00",
    bokStatCode: "101Y003",
    bokCycle: "M",
  },
  {
    indicatorId: "ca-kr",
    source: "bok",
    symbol: "403Y003/S10000",
    bokStatCode: "403Y003",
    bokCycle: "M",
  },
];

// ── 해외 지표 ──────────────────────────────

export const FOREIGN_SYMBOLS: SymbolMapping[] = [
  // 주가
  {
    indicatorId: "sp500",
    source: "yahoo",
    symbol: "^GSPC",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "nasdaq",
    source: "yahoo",
    symbol: "^IXIC",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "dow",
    source: "yahoo",
    symbol: "^DJI",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "sse",
    source: "yahoo",
    symbol: "000001.SS",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "nikkei",
    source: "yahoo",
    symbol: "^N225",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "ftse",
    source: "yahoo",
    symbol: "^FTSE",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "dax",
    source: "yahoo",
    symbol: "^GDAXI",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "vix",
    source: "yahoo",
    symbol: "^VIX",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  // 환율 (달러 기준)
  {
    indicatorId: "eurusd",
    source: "yahoo",
    symbol: "EURUSD=X",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "usdjpy",
    source: "yahoo",
    symbol: "USDJPY=X",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "usdcny",
    source: "yahoo",
    symbol: "USDCNY=X",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "gbpusd",
    source: "yahoo",
    symbol: "GBPUSD=X",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "dxy",
    source: "yahoo",
    symbol: "DX-Y.NYB",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  // 금리 — FRED
  {
    indicatorId: "us-ffr",
    source: "fred",
    symbol: "EFFR",
    fredObservationStart: "2015-01-01",
  },
  {
    indicatorId: "us-t2y",
    source: "fred",
    symbol: "DGS2",
    fredObservationStart: "2015-01-01",
  },
  {
    indicatorId: "us-t10y",
    source: "fred",
    symbol: "DGS10",
    fredObservationStart: "2015-01-01",
  },
  {
    indicatorId: "us-t30y",
    source: "fred",
    symbol: "DGS30",
    fredObservationStart: "2015-01-01",
  },
  {
    indicatorId: "tips-10y",
    source: "fred",
    symbol: "DFII10",
    fredObservationStart: "2015-01-01",
  },
  // SOFR / 단기금리
  {
    indicatorId: "sofr",
    source: "fred",
    symbol: "SOFR",
    fredObservationStart: "2015-01-01",
  },
  // 원자재
  {
    indicatorId: "wti",
    source: "yahoo",
    symbol: "CL=F",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "brent",
    source: "yahoo",
    symbol: "BZ=F",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "gold",
    source: "yahoo",
    symbol: "GC=F",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "silver",
    source: "yahoo",
    symbol: "SI=F",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "copper",
    source: "yahoo",
    symbol: "HG=F",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  {
    indicatorId: "natgas",
    source: "yahoo",
    symbol: "NG=F",
    yahooRange: "10y",
    yahooInterval: "1d",
  },
  // 미국 경제지표 — FRED (월간/분기)
  {
    indicatorId: "cpi-us",
    source: "fred",
    symbol: "CPIAUCSL",
    fredObservationStart: "2015-01-01",
    transform: "none",
  },
  {
    indicatorId: "cpi-us-yoy",
    source: "fred",
    symbol: "CPIAUCSL",
    fredObservationStart: "2015-01-01",
  },
  {
    indicatorId: "pce",
    source: "fred",
    symbol: "PCEPI",
    fredObservationStart: "2015-01-01",
  },
  {
    indicatorId: "gdp-us",
    source: "fred",
    symbol: "GDPC1",
    fredObservationStart: "2018-01-01",
  },
  {
    indicatorId: "unemployment-us",
    source: "fred",
    symbol: "UNRATE",
    fredObservationStart: "2015-01-01",
  },
  {
    indicatorId: "nonfarm",
    source: "fred",
    symbol: "PAYEMS",
    fredObservationStart: "2015-01-01",
  },
  {
    indicatorId: "ism-mfg",
    source: "manual",
    symbol: "ISM_MFG",
  },
  {
    indicatorId: "ism-svc",
    source: "manual",
    symbol: "ISM_SVC",
  },
];

// ── 통합 조회 맵 ───────────────────────────

const _ALL_SYMBOLS = [...DOMESTIC_SYMBOLS, ...FOREIGN_SYMBOLS];

export function getSymbolMapping(indicatorId: string): SymbolMapping | undefined {
  return _ALL_SYMBOLS.find((s) => s.indicatorId === indicatorId);
}

/** Yahoo Finance 심볼 목록 (중복 제거) */
export function allYahooSymbols(): string[] {
  return [
    ...new Set(
      _ALL_SYMBOLS
        .filter((s) => s.source === "yahoo")
        .map((s) => s.symbol)
    ),
  ];
}

/** FRED 시리즈 목록 (중복 제거) */
export function allFredSeries(): string[] {
  return [
    ...new Set(
      _ALL_SYMBOLS
        .filter((s) => s.source === "fred")
        .map((s) => s.symbol)
    ),
  ];
}
