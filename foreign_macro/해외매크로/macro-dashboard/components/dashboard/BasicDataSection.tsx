"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { domesticIndicators as _dummyDomestic, foreignIndicators as _dummyForeign, CATEGORY_HEX } from "@/lib/dummy-data";
import type { EconomicIndicator } from "@/lib/types";
import ChartModal from "./ChartModal";

// ── 카테고리 그룹 정의 ────────────────────────
const CATEGORIES = ["성장", "물가", "고용", "금리", "환율", "신용", "유동성", "가격", "주가"] as const;
type Category = typeof CATEGORIES[number];

// ── 데이터 카드 ───────────────────────────────
function DataCard({
  indicator,
  onClick,
}: {
  indicator: EconomicIndicator;
  onClick: () => void;
}) {
  const isUp = indicator.trend === "up";
  const isDown = indicator.trend === "down";
  const trendColor = isUp ? "#22c55e" : isDown ? "#ef4444" : "#94a3b8";
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div
      onClick={onClick}
      title={`${indicator.nameKo} 차트 보기`}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.35)";
        (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.04)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLDivElement).style.background = "var(--bg-card)";
      }}
    >
      {/* 상단: 카테고리 배지 + 지역 아이콘 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "10px",
            padding: "1px 7px",
            borderRadius: "4px",
            background: "rgba(59,130,246,0.12)",
            color: "#60a5fa",
            fontWeight: 600,
          }}
        >
          {indicator.category}
        </span>
        <span style={{ fontSize: "13px" }}>
          {indicator.region === "domestic" ? "🇰🇷" : "🌐"}
        </span>
      </div>

      {/* 중앙: 지표명 + 현재값 + 단위 */}
      <div>
        <p
          style={{ color: "var(--text-primary)", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}
        >
          {indicator.nameKo}
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
          <span style={{ color: "var(--text-primary)", fontSize: "20px", fontWeight: 700, lineHeight: 1 }}>
            {indicator.currentValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px", paddingBottom: "1px" }}>
            {indicator.unit}
          </span>
        </div>
      </div>

      {/* 하단: 전일비 + 등락률 + 갱신일 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: "3px",
              padding: "2px 7px", borderRadius: "5px",
              background: isUp ? "rgba(34,197,94,0.1)" : isDown ? "rgba(239,68,68,0.1)" : "rgba(100,116,139,0.1)",
            }}
          >
            <TrendIcon size={10} color={trendColor} />
            <span style={{ color: trendColor, fontSize: "10px", fontWeight: 600 }}>
              {indicator.changeAbs > 0 ? "+" : ""}{indicator.changeAbs.toFixed(2)}
            </span>
          </div>
          <span style={{ color: trendColor, fontSize: "10px" }}>
            ({indicator.changePct > 0 ? "+" : ""}{indicator.changePct.toFixed(2)}%)
          </span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "9px" }}>
          갱신: {indicator.updatedAt} · {
            indicator.frequency === "daily" ? "일별" :
            indicator.frequency === "monthly" ? "월별" :
            indicator.frequency === "quarterly" ? "분기" : "연간"
          }
        </p>
      </div>
    </div>
  );
}

// ── 카테고리 블록 ─────────────────────────────
function CategoryBlock({
  category,
  indicators,
  onSelect,
}: {
  category: string;
  indicators: EconomicIndicator[];
  onSelect: (ind: EconomicIndicator) => void;
}) {
  if (indicators.length === 0) return null;

  const hex = CATEGORY_HEX[category] ?? "#94a3b8";

  return (
    <div className="mb-5">
      {/* 카테고리 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span
          style={{
            width: "3px",
            height: "14px",
            borderRadius: "2px",
            background: hex,
            flexShrink: 0,
          }}
        />
        <span style={{ color: hex, fontSize: "12px", fontWeight: 600 }}>
          {category}
        </span>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
          {indicators.length}개
        </span>
      </div>

      {/* 카드 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "10px",
        }}
      >
        {indicators.map((ind) => (
          <DataCard key={ind.id} indicator={ind} onClick={() => onSelect(ind)} />
        ))}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────

interface BasicDataSectionProps {
  indicators?: EconomicIndicator[];
}

export default function BasicDataSection({ indicators }: BasicDataSectionProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<EconomicIndicator | null>(null);
  const [activeRegion, setActiveRegion] = useState<"both" | "domestic" | "foreign">("both");

  const sourceIndicators = indicators ?? [..._dummyDomestic, ..._dummyForeign];

  const allIndicators = [
    ...(activeRegion === "both" || activeRegion === "domestic" ? sourceIndicators.filter(i => i.region === "domestic") : []),
    ...(activeRegion === "both" || activeRegion === "foreign" ? sourceIndicators.filter(i => i.region === "foreign") : []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 필터 */}
      <div className="flex items-center gap-2 mb-4">
        {(["both", "domestic", "foreign"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setActiveRegion(r)}
            className={`tab-btn${activeRegion === r ? " active" : ""}`}
          >
            {r === "both" ? "전체" : r === "domestic" ? "국내" : "국외"}
          </button>
        ))}
        <span style={{ color: "var(--text-muted)", fontSize: "11px", marginLeft: "auto" }}>
          카드 클릭 시 차트 조회
        </span>
      </div>

      {/* 카테고리별 카드 그리드 */}
      <div className="scroll-container flex-1">
        {CATEGORIES.map((category) => {
          const inds = allIndicators.filter((i) => i.category === category);
          return (
            <CategoryBlock
              key={category}
              category={category}
              indicators={inds}
              onSelect={setSelectedIndicator}
            />
          );
        })}
      </div>

      {/* 차트 모달 */}
      {selectedIndicator && (
        <ChartModal
          indicator={selectedIndicator}
          onClose={() => setSelectedIndicator(null)}
        />
      )}
    </div>
  );
}
