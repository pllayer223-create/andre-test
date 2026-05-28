"use client";

import { useMemo } from "react";
import { ExternalLink, Printer, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { domesticIndicators as _dummyDomestic, foreignIndicators as _dummyForeign } from "@/lib/dummy-data";
import type { EconomicIndicator } from "@/lib/types";

// ── 지표 ID → 객체 맵 ────────────────────────
function buildMap(list: EconomicIndicator[]): Record<string, EconomicIndicator> {
  return Object.fromEntries(list.map((i) => [i.id, i]));
}

// ── 보고 섹션 정의 ────────────────────────────
const SECTIONS = {
  domestic: [
    {
      title: "국내 금리",
      source: "한국은행",
      sourceUrl: "https://www.bok.or.kr",
      ids: ["kor-base-rate", "mss-1y", "cd-91d", "cp-91d", "kor-3y-bond", "kor-10y-bond", "ktb-30y"],
    },
    {
      title: "국내 주식 · 환율",
      source: "KRX / 한국은행",
      sourceUrl: "https://www.krx.co.kr",
      ids: ["kospi", "kosdaq", "krw-usd", "krw-eur", "krw-jpy"],
    },
    {
      title: "국내 기타",
      source: "한국은행 / 금투협",
      sourceUrl: "https://www.bok.or.kr",
      ids: ["kor-m2", "kor-household-debt", "kor-current-account", "kor-investor-deposit"],
    },
  ],
  foreign: [
    {
      title: "해외 금리",
      source: "FRED",
      sourceUrl: "https://fred.stlouisfed.org",
      ids: ["fed-rate", "us-2y", "us-10y", "us-30y"],
    },
    {
      title: "해외 주식 · 환율 · 암호화폐",
      source: "Yahoo Finance",
      sourceUrl: "https://finance.yahoo.com",
      ids: ["sp500", "nasdaq", "china-csi300", "dxy", "eur-usd", "usd-jpy", "bitcoin"],
    },
    {
      title: "상품 · 기타",
      source: "Yahoo / SMM",
      sourceUrl: "https://finance.yahoo.com",
      ids: ["wti", "brent", "gold", "lithium-carbonate", "ddr5", "vix"],
    },
  ],
};

// ── 포맷 헬퍼 ─────────────────────────────────
function fmtVal(v: number, unit: string): string {
  const n = v.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  return `${n} ${unit}`;
}
function fmtChg(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}`;
}
function fmtPct(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

// ── 단일 행 ───────────────────────────────────
function DataRow({ ind }: { ind: EconomicIndicator }) {
  const isUp = ind.trend === "up";
  const isDown = ind.trend === "down";
  const color = isUp ? "#22c55e" : isDown ? "#ef4444" : "#94a3b8";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <tr
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(59,130,246,0.05)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
    >
      {/* 지표명 */}
      <td style={{ padding: "6px 10px", textAlign: "left" }}>
        <span style={{ color: "#93c5fd", fontWeight: 600, fontSize: "11px" }}>
          {ind.nameKo}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "9px", marginLeft: "4px" }}>
          {ind.name}
        </span>
      </td>

      {/* 현재값 */}
      <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--text-primary)", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>
        {fmtVal(ind.currentValue, ind.unit)}
      </td>

      {/* 전일비 */}
      <td style={{ padding: "6px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
        <span style={{ color, fontSize: "11px", fontWeight: 700 }}>
          {fmtChg(ind.changeAbs)}
        </span>
      </td>

      {/* 전일비(%) */}
      <td style={{ padding: "6px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
          <Icon size={10} color={color} />
          <span style={{ color, fontSize: "11px", fontWeight: 700 }}>
            {fmtPct(ind.changePct)}
          </span>
        </div>
      </td>

      {/* 갱신일 */}
      <td style={{ padding: "6px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: "10px" }}>
        {ind.updatedAt}
      </td>
    </tr>
  );
}

// ── 섹션 카드 ────────────────────────────────
function SectionCard({
  title,
  source,
  sourceUrl,
  ids,
  map,
}: {
  title: string;
  source: string;
  sourceUrl: string;
  ids: string[];
  map: Record<string, EconomicIndicator>;
}) {
  const rows = ids.map((id) => map[id]).filter(Boolean);

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        overflow: "hidden",
        marginBottom: "10px",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          background: "linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)",
          padding: "6px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: "#fff", fontWeight: 700, fontSize: "11px", letterSpacing: "0.4px" }}>
          {title}
        </span>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: "rgba(255,255,255,0.65)", fontSize: "10px", textDecoration: "none", display: "flex", alignItems: "center", gap: "3px" }}
        >
          <ExternalLink size={10} />
          {source}
        </a>
      </div>

      {/* 테이블 */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr style={{ background: "rgba(30,58,138,0.12)", borderBottom: "1px solid var(--border)" }}>
            {["구분", "현재", "전일비", "등락률", "갱신"].map((h, i) => (
              <th
                key={h}
                style={{
                  padding: "5px 10px",
                  color: "#93c5fd",
                  fontWeight: 700,
                  fontSize: "10px",
                  textAlign: i === 0 ? "left" : i === 4 ? "center" : "right",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((ind) => <DataRow key={ind.id} ind={ind} />)}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: "11px", textAlign: "center", padding: "12px" }}>
          데이터 없음
        </p>
      )}
    </div>
  );
}

// ── KPI 카드 ──────────────────────────────────
function KpiCard({ ind }: { ind: EconomicIndicator }) {
  const isUp = ind.trend === "up";
  const isDown = ind.trend === "down";
  const color = isUp ? "#22c55e" : isDown ? "#ef4444" : "#94a3b8";

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "10px 12px",
        textAlign: "center",
        flex: 1,
        minWidth: "100px",
      }}
    >
      <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "3px" }}>
        {ind.nameKo}
      </div>
      <div style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700, lineHeight: 1 }}>
        {ind.currentValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
        <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "2px" }}>{ind.unit}</span>
      </div>
      <div style={{ color, fontSize: "10px", marginTop: "3px", fontWeight: 600 }}>
        {fmtChg(ind.changeAbs)} ({fmtPct(ind.changePct)})
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────

interface ReportSectionProps {
  indicators?: EconomicIndicator[];
  date?: string;
}

export default function ReportSection({ indicators, date }: ReportSectionProps) {
  const sourceIndicators = indicators ?? [..._dummyDomestic, ..._dummyForeign];
  const allMap = useMemo(
    () => buildMap(sourceIndicators),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indicators]
  );

  const KPI_IDS = ["kospi", "krw-usd", "kor-3y-bond", "us-10y", "dxy", "wti", "gold", "vix"];

  const dateStr = date
    ? new Date(date + "T00:00:00").toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric", weekday: "short",
      })
    : new Date().toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric", weekday: "short",
      });

  return (
    <div style={{ maxWidth: "1200px" }}>
      {/* ── 리포트 헤더 ── */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "12px 18px",
          marginBottom: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "3px solid #1d4ed8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "#1e3a8a", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "18px",
            }}
          >
            M
          </div>
          <div>
            <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "16px", letterSpacing: "1px" }}>
              MARKET DAILY
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>재무실 자금운용본부 — 더미데이터 기준</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: "14px" }}>{dateStr}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>기준: {dateStr}</div>
          </div>
          <button
            onClick={() => window.print()}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              background: "rgba(29,78,216,0.15)", border: "1px solid rgba(29,78,216,0.3)",
              color: "#60a5fa", borderRadius: "7px", padding: "6px 12px",
              fontSize: "11px", cursor: "pointer", fontWeight: 600,
            }}
          >
            <Printer size={13} />
            인쇄
          </button>
        </div>
      </div>

      {/* ── KPI 요약 바 ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        {KPI_IDS.map((id) => allMap[id] && <KpiCard key={id} ind={allMap[id]} />)}
      </div>

      {/* ── 2컬럼 본문 ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          alignItems: "start",
        }}
      >
        {/* 국내 */}
        <div>
          {SECTIONS.domestic.map((sec) => (
            <SectionCard key={sec.title} {...sec} map={allMap} />
          ))}
        </div>

        {/* 국외 */}
        <div>
          {SECTIONS.foreign.map((sec) => (
            <SectionCard key={sec.title} {...sec} map={allMap} />
          ))}
        </div>
      </div>

      {/* ── 푸터 ── */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "10px 0",
          marginTop: "12px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "10px",
          fontStyle: "italic",
        }}
      >
        Market Daily · 재무실 자금운용본부 · 출처: KRX, FRED, Yahoo Finance, 한국은행, 통계청 · 본 자료는 내부 참고용 더미데이터입니다
      </div>

      {/* ── 인쇄용 스타일 ── */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; }
          .sidebar-item, header, footer { display: none !important; }
        }
      `}</style>
    </div>
  );
}
