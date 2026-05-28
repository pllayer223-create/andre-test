// ────────────────────────────────────────────
// 공휴일 테이블 — KRX(한국) + NYSE(미국) 2024-2026
// ────────────────────────────────────────────

/** KRX 한국거래소 휴장일 (YYYY-MM-DD) */
const KRX_HOLIDAYS: readonly string[] = [
  // ── 2024 ──
  "2024-01-01", // 신정
  "2024-02-09", // 설날 연휴
  "2024-02-12", // 설날 대체공휴일
  "2024-03-01", // 삼일절
  "2024-04-10", // 제22대 국회의원선거
  "2024-05-01", // 근로자의 날
  "2024-05-06", // 어린이날 대체공휴일
  "2024-05-15", // 부처님오신날
  "2024-06-06", // 현충일
  "2024-08-15", // 광복절
  "2024-09-16", // 추석 연휴
  "2024-09-17", // 추석
  "2024-09-18", // 추석 연휴
  "2024-10-03", // 개천절
  "2024-10-09", // 한글날
  "2024-12-25", // 성탄절
  "2024-12-31", // 연말 휴장
  // ── 2025 ──
  "2025-01-01", // 신정
  "2025-01-28", // 설날 연휴
  "2025-01-29", // 설날
  "2025-01-30", // 설날 연휴
  "2025-03-03", // 삼일절 대체공휴일
  "2025-05-01", // 근로자의 날
  "2025-05-05", // 어린이날
  "2025-05-06", // 부처님오신날 대체공휴일
  "2025-06-06", // 현충일
  "2025-08-15", // 광복절
  "2025-10-03", // 개천절
  "2025-10-06", // 추석 연휴
  "2025-10-07", // 추석
  "2025-10-08", // 추석 연휴
  "2025-10-09", // 한글날
  "2025-12-25", // 성탄절
  // ── 2026 ──
  "2026-01-01", // 신정
  "2026-02-16", // 설날 연휴
  "2026-02-17", // 설날
  "2026-02-18", // 설날 연휴
  "2026-02-19", // 설날 연휴 (임시공휴일 예상)
  "2026-03-02", // 삼일절 대체공휴일
  "2026-05-01", // 근로자의 날
  "2026-05-05", // 어린이날
  "2026-05-25", // 부처님오신날
  "2026-06-03", // 제21대 대통령선거
  "2026-06-06", // 현충일 (토요일이면 대체 없음)
  "2026-08-17", // 광복절 대체공휴일
  "2026-09-24", // 추석 연휴
  "2026-09-25", // 추석
  "2026-09-28", // 추석 연휴
  "2026-10-09", // 한글날
  "2026-12-25", // 성탄절
  "2026-12-31", // 연말 휴장
];

/** NYSE 미국증권거래소 휴장일 (YYYY-MM-DD) */
const NYSE_HOLIDAYS: readonly string[] = [
  // ── 2024 ──
  "2024-01-01", // New Year's Day
  "2024-01-15", // MLK Jr. Day
  "2024-02-19", // Presidents' Day
  "2024-03-29", // Good Friday
  "2024-05-27", // Memorial Day
  "2024-06-19", // Juneteenth
  "2024-07-04", // Independence Day
  "2024-09-02", // Labor Day
  "2024-11-28", // Thanksgiving
  "2024-11-29", // Day after Thanksgiving (early close 13:00 — treated as full holiday here for simplicity)
  "2024-12-25", // Christmas
  // ── 2025 ──
  "2025-01-01", // New Year's Day
  "2025-01-09", // National Day of Mourning (Jimmy Carter)
  "2025-01-20", // MLK Jr. Day
  "2025-02-17", // Presidents' Day
  "2025-04-18", // Good Friday
  "2025-05-26", // Memorial Day
  "2025-06-19", // Juneteenth
  "2025-07-04", // Independence Day
  "2025-09-01", // Labor Day
  "2025-11-27", // Thanksgiving
  "2025-12-25", // Christmas
  // ── 2026 ──
  "2026-01-01", // New Year's Day
  "2026-01-19", // MLK Jr. Day
  "2026-02-16", // Presidents' Day
  "2026-04-03", // Good Friday
  "2026-05-25", // Memorial Day
  "2026-06-19", // Juneteenth
  "2026-07-03", // Independence Day (observed)
  "2026-09-07", // Labor Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas
];

// Set으로 변환 (O(1) 조회)
const KRX_SET = new Set(KRX_HOLIDAYS);
const NYSE_SET = new Set(NYSE_HOLIDAYS);

/** YYYY-MM-DD 형식 날짜 파싱 헬퍼 (로컬 시각 기준) */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Date → YYYY-MM-DD (로컬 시각 기준 — toISOString은 UTC라 시차 오류 발생) */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 오늘 날짜 YYYY-MM-DD (로컬 시각 기준) */
export function localToday(): string {
  return localDateStr(new Date());
}

/** 주말 여부 */
export function isWeekend(dateStr: string): boolean {
  const day = parseDate(dateStr).getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

/** KRX 공휴일 여부 */
export function isKRXHoliday(dateStr: string): boolean {
  return KRX_SET.has(dateStr);
}

/** NYSE 공휴일 여부 */
export function isNYSEHoliday(dateStr: string): boolean {
  return NYSE_SET.has(dateStr);
}

/** KRX 영업일 여부 */
export function isKRXBusinessDay(dateStr: string): boolean {
  return !isWeekend(dateStr) && !isKRXHoliday(dateStr);
}

/** NYSE 영업일 여부 */
export function isNYSEBusinessDay(dateStr: string): boolean {
  return !isWeekend(dateStr) && !isNYSEHoliday(dateStr);
}

/**
 * 특정 날짜가 데이터 수신 불가 날짜인지 확인
 * Korean indicators: KRX 기준, Foreign indicators: NYSE 기준
 */
export function isDataUnavailable(
  dateStr: string,
  region: "domestic" | "foreign"
): boolean {
  if (region === "domestic") return !isKRXBusinessDay(dateStr);
  return !isNYSEBusinessDay(dateStr);
}

/** 데이터 없음 사유 반환 */
export function getUnavailableReason(
  dateStr: string,
  region: "domestic" | "foreign"
): string | null {
  if (!isDataUnavailable(dateStr, region)) return null;
  if (isWeekend(dateStr)) {
    const day = parseDate(dateStr).getDay();
    return day === 0 ? "일요일" : "토요일";
  }
  if (region === "domestic" && isKRXHoliday(dateStr)) return "한국 공휴일";
  if (region === "foreign" && isNYSEHoliday(dateStr)) return "미국 공휴일";
  return "휴장일";
}

/**
 * YYYY-MM-DD 기준 이전 영업일 반환
 * @param dateStr 기준 날짜 (포함하지 않음 — 이전 날부터 탐색)
 * @param region 시장 구분
 * @param maxDays 탐색 최대 일수 (무한 루프 방지)
 */
export function prevBusinessDay(
  dateStr: string,
  region: "domestic" | "foreign" = "foreign",
  maxDays = 14
): string {
  const d = parseDate(dateStr);
  for (let i = 0; i < maxDays; i++) {
    d.setDate(d.getDate() - 1);
    const s = localDateStr(d);
    if (!isDataUnavailable(s, region)) return s;
  }
  return dateStr; // fallback
}

/**
 * 오늘 기준 가장 최근 영업일 (오늘 포함)
 */
export function lastBusinessDay(region: "domestic" | "foreign" = "foreign"): string {
  const today = localToday();
  if (!isDataUnavailable(today, region)) return today;
  return prevBusinessDay(today, region);
}

/**
 * 날짜 범위 내 모든 영업일 목록 (역순 — 최신 우선)
 */
export function businessDaysInRange(
  from: string,
  to: string,
  region: "domestic" | "foreign" = "foreign"
): string[] {
  const result: string[] = [];
  const d = parseDate(to);
  const start = parseDate(from);
  while (d >= start) {
    const s = localDateStr(d);
    if (!isDataUnavailable(s, region)) result.push(s);
    d.setDate(d.getDate() - 1);
  }
  return result;
}
