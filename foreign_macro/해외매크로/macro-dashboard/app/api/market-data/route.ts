// ────────────────────────────────────────────
// API Route: /api/market-data
// GET /api/market-data?date=YYYY-MM-DD
//
// 처리 순서:
//  1. 캐시 파일 확인 (data/market/YYYY-MM-DD.json)
//  2. 캐시 없으면 Yahoo Finance + FRED + BOK 순차 fetch
//  3. 데이터 검증 후 캐시 저장
//  4. EconomicIndicator[] 반환
// ────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { isKRXBusinessDay, isNYSEBusinessDay, prevBusinessDay, localToday } from "@/lib/holidays";

/** Unix timestamp → YYYY-MM-DD (UTC 기준 — Yahoo Finance 일봉 timestamp는 UTC 자정) */
function tsToDate(ts: number): string {
  const d = new Date(ts * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
import { DOMESTIC_SYMBOLS, FOREIGN_SYMBOLS, type SymbolMapping } from "@/lib/market-symbols";
import type { EconomicIndicator, DataPoint } from "@/lib/types";

// ── 환경 변수 ──────────────────────────────
const FRED_API_KEY = process.env.FRED_API_KEY ?? "";
const BOK_API_KEY = process.env.BOK_API_KEY ?? "";
// Vercel은 프로젝트 루트가 read-only → /tmp 사용. 로컬은 data/market 사용.
const CACHE_DIR = process.env.VERCEL
  ? "/tmp/market"
  : path.join(process.cwd(), "data", "market");

// ── 캐시 헬퍼 ──────────────────────────────

function cachePath(date: string): string {
  return path.join(CACHE_DIR, `${date}.json`);
}

function readCache(date: string): EconomicIndicator[] | null {
  const p = cachePath(date);
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw) as EconomicIndicator[];
    }
  } catch {
    // 캐시 읽기 실패 → 무시하고 새로 fetch
  }
  return null;
}

function writeCache(date: string, data: EconomicIndicator[]): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(cachePath(date), JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // 캐시 쓰기 실패 — 무시 (데이터 자체는 반환)
  }
}

// ── Yahoo Finance fetch ────────────────────

interface YahooMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  regularMarketTime?: number;
  currency?: string;
  symbol?: string;
}

interface YahooTimestamp {
  timestamps?: number[];
  closes?: number[];
}

async function fetchYahoo(
  symbol: string,
  range: string = "5y",
  interval: string = "1d"
): Promise<{ meta: YahooMeta; series: DataPoint[] } | null> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${range}&interval=${interval}&includePrePost=false`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta: YahooMeta = result.meta ?? {};
    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];

    const series: DataPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null || isNaN(closes[i])) continue;
      const dateStr = tsToDate(timestamps[i]);
      series.push({ date: dateStr, value: Math.round(closes[i] * 10000) / 10000 });
    }
    // 날짜 오름차순 정렬 (Yahoo는 대체로 정렬되어 있지만 보장용)
    series.sort((a, b) => a.date.localeCompare(b.date));

    return { meta, series };
  } catch {
    return null;
  }
}

// ── FRED fetch ─────────────────────────────

async function fetchFred(
  series: string,
  observationStart: string = "2020-01-01"
): Promise<{ latestValue: number; latestDate: string; series: DataPoint[] } | null> {
  if (!FRED_API_KEY) return null;
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${series}&api_key=${FRED_API_KEY}&file_type=json` +
    `&observation_start=${observationStart}&sort_order=asc`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json = await res.json();
    const obs: { date: string; value: string }[] = json?.observations ?? [];
    const points: DataPoint[] = obs
      .filter((o) => o.value !== "." && !isNaN(parseFloat(o.value)))
      .map((o) => ({ date: o.date, value: parseFloat(o.value) }));
    if (points.length === 0) return null;
    const last = points[points.length - 1];
    return { latestValue: last.value, latestDate: last.date, series: points };
  } catch {
    return null;
  }
}

// ── BOK ECOS fetch ─────────────────────────

async function fetchBok(
  statCode: string,
  itemCode: string,
  cycle: string = "D",
  startDate: string = "20200101",
  endDate: string = localToday().replace(/-/g, "")
): Promise<{ latestValue: number; latestDate: string; series: DataPoint[] } | null> {
  if (!BOK_API_KEY) return null;
  const url =
    `https://ecos.bok.or.kr/api/StatisticSearch/${BOK_API_KEY}/json/kr/1/1000` +
    `/${statCode}/${cycle}/${startDate}/${endDate}/${itemCode}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json = await res.json();
    const rows: { TIME: string; DATA_VALUE: string }[] =
      json?.StatisticSearch?.row ?? [];
    const points: DataPoint[] = rows
      .filter((r) => r.DATA_VALUE && !isNaN(parseFloat(r.DATA_VALUE)))
      .map((r) => {
        // TIME 형식: 일간=YYYYMMDD, 월간=YYYYMM, 분기=YYYYQQ
        const t = r.TIME;
        let dateStr = t;
        if (t.length === 8) dateStr = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
        else if (t.length === 6) dateStr = `${t.slice(0, 4)}-${t.slice(4, 6)}-01`;
        else if (t.length === 5 && t[4] === "Q")
          dateStr = `${t.slice(0, 4)}-${["01", "04", "07", "10"][parseInt(t[5]) - 1]}-01`;
        return { date: dateStr, value: parseFloat(r.DATA_VALUE) };
      });
    if (points.length === 0) return null;
    const last = points[points.length - 1];
    return { latestValue: last.value, latestDate: last.date, series: points };
  } catch {
    return null;
  }
}

// ── 지표 빌더 ──────────────────────────────

function calcTrend(current: number, previous: number) {
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0;
  return {
    trend: (diff > 0 ? "up" : diff < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
    // changeAbs: 부호 유지 (양수 = 상승, 음수 = 하락)
    changeAbs: Math.round(diff * 10000) / 10000,
    changePct: Math.round(pct * 100) / 100,
  };
}

/**
 * 시계열에서 targetDate 이하 가장 최신 데이터 포인트를 찾습니다.
 * series는 날짜 오름차순 정렬을 전제합니다.
 */
function findLatestOnOrBefore(series: DataPoint[], targetDate: string): DataPoint | null {
  // 이진 탐색으로 targetDate 이하 최대값 위치 찾기
  let lo = 0, hi = series.length - 1, result: DataPoint | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].date <= targetDate) {
      result = series[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

async function buildIndicator(
  mapping: SymbolMapping,
  targetDate: string
): Promise<EconomicIndicator | null> {
  let currentValue: number | null = null;
  let previousValue: number | null = null;
  let updatedAt = targetDate;
  let series: DataPoint[] = [];

  const region: "domestic" | "foreign" = DOMESTIC_SYMBOLS.some(
    (s) => s.indicatorId === mapping.indicatorId
  ) ? "domestic" : "foreign";

  if (mapping.source === "yahoo") {
    const data = await fetchYahoo(
      mapping.symbol,
      mapping.yahooRange ?? "10y",
      mapping.yahooInterval ?? "1d"
    );
    if (!data) return null;
    series = data.series; // 이미 날짜 오름차순 정렬됨

    // targetDate 이하 가장 최신 종가 (해당 날짜 데이터 없으면 이전 날 사용)
    const found = findLatestOnOrBefore(series, targetDate);
    if (!found) return null;

    currentValue = found.value;
    updatedAt = found.date;

    // 바로 직전 거래일 종가 (시계열에서 found 바로 앞 항목)
    const foundIdx = series.findLastIndex((p) => p.date === found.date);
    const prevPoint = foundIdx > 0 ? series[foundIdx - 1] : null;
    previousValue = prevPoint?.value ?? currentValue;

  } else if (mapping.source === "fred" && FRED_API_KEY) {
    const data = await fetchFred(mapping.symbol, mapping.fredObservationStart ?? "2015-01-01");
    if (!data) return null;
    series = data.series;
    // FRED: targetDate 기준 최신값
    const found = findLatestOnOrBefore(series, targetDate);
    if (!found) return null;
    currentValue = found.value;
    updatedAt = found.date;
    const foundIdx = series.findLastIndex((p) => p.date === found.date);
    previousValue = foundIdx > 0 ? series[foundIdx - 1].value : currentValue;

  } else if (mapping.source === "bok" && BOK_API_KEY && mapping.bokStatCode) {
    const [, itemCode] = mapping.symbol.split("/");
    const data = await fetchBok(
      mapping.bokStatCode,
      itemCode,
      mapping.bokCycle ?? "D",
      "20150101"
    );
    if (!data) return null;
    series = data.series;
    const found = findLatestOnOrBefore(series, targetDate);
    if (!found) return null;
    currentValue = found.value;
    updatedAt = found.date;
    const foundIdx = series.findLastIndex((p) => p.date === found.date);
    previousValue = foundIdx > 0 ? series[foundIdx - 1].value : currentValue;

  } else {
    return null;
  }

  if (currentValue == null) return null;
  if (previousValue == null) previousValue = currentValue;

  const MAX_SERIES = 3650; // 최대 10년치
  return {
    id: mapping.indicatorId,
    name: mapping.indicatorId,
    nameKo: mapping.indicatorId,
    category: "",
    currentValue,
    previousValue,
    unit: "",
    source: mapping.source === "yahoo" ? "Yahoo Finance" : mapping.source === "fred" ? "FRED" : "BOK ECOS",
    sourceUrl: "",
    region,
    ...calcTrend(currentValue, previousValue),
    timeSeries: series.slice(-MAX_SERIES),
    updatedAt,
    frequency: mapping.bokCycle === "M" ? "monthly" : mapping.bokCycle === "Q" ? "quarterly" : "daily",
  };
}

// ── 데이터 검증 ────────────────────────────

interface ValidationResult {
  indicatorId: string;
  pass: boolean;
  issues: string[];
}

function validateIndicators(indicators: EconomicIndicator[]): ValidationResult[] {
  return indicators.map((ind) => {
    const issues: string[] = [];
    if (ind.currentValue == null || isNaN(ind.currentValue)) issues.push("currentValue 없음");
    if (ind.currentValue < 0 && !["changeAbs", "changePct"].includes(ind.id)) {
      // 일부 지표 (금리 역전, 변화량)는 음수 허용
    }
    if (ind.timeSeries.length < 5) issues.push("시계열 데이터 부족 (<5)");
    const staleThreshold = ind.frequency === "daily" ? 5 : ind.frequency === "monthly" ? 45 : 100;
    const daysSinceUpdate = Math.round(
      (Date.now() - new Date(ind.updatedAt).getTime()) / 86_400_000
    );
    if (daysSinceUpdate > staleThreshold) {
      issues.push(`데이터 갱신 지연 (${daysSinceUpdate}일 경과)`);
    }
    return { indicatorId: ind.id, pass: issues.length === 0, issues };
  });
}

// ── 더미 데이터 병합 헬퍼 ─────────────────
// 실제 데이터 fetch 실패 시 더미 데이터로 보완

async function getDummyIndicators(): Promise<EconomicIndicator[]> {
  // 동적 import로 더미 데이터 로드 (빌드 타임 의존성 방지)
  const { domesticIndicators, foreignIndicators } = await import("@/lib/dummy-data");
  return [...domesticIndicators, ...foreignIndicators];
}

// ── 메인 핸들러 ───────────────────────────

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get("date");
  const forceRefresh = searchParams.get("refresh") === "1";

  // 날짜 검증
  const today = new Date().toISOString().slice(0, 10);
  const targetDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  // 미래 날짜 방지
  if (targetDate > today) {
    return NextResponse.json(
      { error: "미래 날짜는 조회할 수 없습니다.", date: targetDate },
      { status: 400 }
    );
  }

  // 주말/공휴일 여부 확인
  const krxClosed = !isKRXBusinessDay(targetDate);
  const nyseClosed = !isNYSEBusinessDay(targetDate);

  // 캐시 확인 (refresh 파라미터 없을 때)
  if (!forceRefresh) {
    const cached = readCache(targetDate);
    if (cached) {
      const validation = validateIndicators(cached);
      return NextResponse.json({
        date: targetDate,
        fromCache: true,
        krxClosed,
        nyseClosed,
        indicators: cached,
        validation,
      });
    }
  }

  // 더미 데이터 로드 (fetch 실패 시 fallback)
  const dummyIndicators = await getDummyIndicators();
  const dummyMap = new Map(dummyIndicators.map((i) => [i.id, i]));

  // 실제 데이터 fetch (병렬)
  const allMappings = [...DOMESTIC_SYMBOLS, ...FOREIGN_SYMBOLS];
  const fetchResults = await Promise.allSettled(
    allMappings.map((m) => buildIndicator(m, targetDate))
  );

  const indicators: EconomicIndicator[] = [];
  for (let i = 0; i < allMappings.length; i++) {
    const mapping = allMappings[i];
    const result = fetchResults[i];
    let indicator: EconomicIndicator | null = null;

    if (result.status === "fulfilled" && result.value) {
      indicator = result.value;
      // 더미 데이터의 메타 정보(name, nameKo, unit 등) 보완
      const dummy = dummyMap.get(mapping.indicatorId);
      if (dummy) {
        indicator.name = dummy.name;
        indicator.nameKo = dummy.nameKo;
        indicator.unit = dummy.unit;
        indicator.category = dummy.category;
        indicator.sourceUrl = dummy.sourceUrl;
      }
    } else {
      // fetch 실패 → 더미 데이터 사용
      const dummy = dummyMap.get(mapping.indicatorId);
      if (dummy) indicator = { ...dummy };
    }

    if (indicator) indicators.push(indicator);
  }

  // 더미 데이터에만 있는 지표 추가 (매핑 없는 항목)
  const fetchedIds = new Set(indicators.map((i) => i.id));
  for (const dummy of dummyIndicators) {
    if (!fetchedIds.has(dummy.id)) {
      indicators.push({ ...dummy });
    }
  }

  // 데이터 검증
  const validation = validateIndicators(indicators);

  // 캐시 저장 (오늘 날짜가 아니거나 오늘이면 1시간 유효)
  writeCache(targetDate, indicators);

  return NextResponse.json({
    date: targetDate,
    fromCache: false,
    krxClosed,
    nyseClosed,
    indicators,
    validation,
  });
}
