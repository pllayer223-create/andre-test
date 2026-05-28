// ────────────────────────────────────────────
// 공통 타입 정의
// ────────────────────────────────────────────

export type Region = "domestic" | "foreign";

export type TrendDirection = "up" | "down" | "neutral";

// 경제 지표 단일 데이터 포인트
export interface DataPoint {
  date: string; // "YYYY-MM-DD"
  value: number;
}

// 경제 지표 카드
export interface EconomicIndicator {
  id: string;
  name: string;
  nameKo: string;
  category: string; // "주가" | "금리" | "환율" | "물가" | "성장" | "고용" | "신용" | "유동성"
  currentValue: number;
  previousValue: number;
  unit: string; // "%" | "pt" | "원" | "달러" 등
  source: string;
  sourceUrl: string;
  region: Region;
  trend: TrendDirection;
  changeAbs: number;
  changePct: number;
  timeSeries: DataPoint[]; // 3년치 시계열
  updatedAt: string; // "YYYY-MM-DD"
  frequency: "daily" | "monthly" | "quarterly" | "annual";
}

// 핵심 코멘트
export interface MacroComment {
  id: string;
  region: Region;
  title: string;
  body: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  tags: string[];
  relatedIndicators: string[]; // EconomicIndicator.id 참조
}

// 리서치 리포트
export interface ResearchReport {
  id: string;
  region: Region;
  title: string;
  publisher: string; // 증권사/IB 이름
  publishedAt: string;
  url: string;
  summary: string;
  tags: string[];
}

// 경제지표 발표 일정
export interface EconomicEvent {
  id: string;
  indicatorId: string;        // EconomicIndicator.id 참조
  name: string;               // 표시명
  nameEn: string;
  region: Region;
  scheduledDate: string;      // "YYYY-MM-DD"
  scheduledTime?: string;     // "HH:MM" KST 기준
  importance: "high" | "medium" | "low";
  previous?: string;          // 이전 발표값
  forecast?: string;          // 컨센서스 예측값
  actual?: string;            // 실제 발표값 (발표 후 입력)
  source: string;
  category: string;
}

// 검색 결과
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: "naver" | "google" | "yahoo";
}
