"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ExternalLink, Flag, Globe } from "lucide-react";
import {
  domesticIndicators as _dummyDomestic,
  foreignIndicators as _dummyForeign,
  CATEGORY_COLORS,
  CATEGORY_BG,
  CATEGORY_ORDER,
  CATEGORY_HEX,
} from "@/lib/dummy-data";
import type { EconomicIndicator } from "@/lib/types";
import ChartModal from "./ChartModal";

// ── 지표 카드 ─────────────────────────────────
function IndicatorCard({
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
      className="card card-clickable p-4 flex flex-col gap-2"
      onClick={onClick}
      title={`${indicator.nameKo} 차트 보기`}
    >
      {/* 상단: 카테고리 + 출처 */}
      <div className="flex items-center justify-between">
        <span
          className={`badge text-xs ${CATEGORY_COLORS[indicator.category] || "text-slate-400"}`}
          style={{
            background: CATEGORY_BG[indicator.category]?.split(" ")[0]?.replace("bg-", "bg-") || "rgba(100,116,139,0.1)",
          }}
        >
          {indicator.category}
        </span>
        <a
          href={indicator.sourceUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 hover:underline"
          style={{ color: "var(--text-muted)", fontSize: "10px" }}
        >
          <ExternalLink size={9} />
          {indicator.source}
        </a>
      </div>

      {/* 지표명 */}
      <div>
        <p
          className="font-semibold"
          style={{ color: "var(--text-primary)", fontSize: "13px" }}
        >
          {indicator.nameKo}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "10px" }}>
          {indicator.name}
        </p>
      </div>

      {/* 현재값 */}
      <div className="flex items-end gap-1.5">
        <span
          className="font-bold"
          style={{ color: "var(--text-primary)", fontSize: "22px", lineHeight: 1 }}
        >
          {indicator.currentValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "12px", paddingBottom: "1px" }}>
          {indicator.unit}
        </span>
      </div>

      {/* 변화량 */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-md"
          style={{
            background: isUp ? "rgba(34,197,94,0.1)" : isDown ? "rgba(239,68,68,0.1)" : "rgba(100,116,139,0.1)",
          }}
        >
          <TrendIcon size={11} color={trendColor} />
          <span style={{ color: trendColor, fontSize: "11px", fontWeight: 600 }}>
            {indicator.changeAbs > 0 ? "+" : ""}{indicator.changeAbs.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
          </span>
        </div>
        <span style={{ color: trendColor, fontSize: "10px" }}>
          ({indicator.changePct > 0 ? "+" : ""}{indicator.changePct.toFixed(2)}%)
        </span>
      </div>

      {/* 갱신일 */}
      <p style={{ color: "var(--text-muted)", fontSize: "10px" }}>
        갱신: {indicator.updatedAt} · {
          indicator.frequency === "daily" ? "일별" :
          indicator.frequency === "monthly" ? "월별" :
          indicator.frequency === "quarterly" ? "분기별" : "연별"
        }
      </p>
    </div>
  );
}

// ── 카테고리 그룹 ──────────────────────────────
function CategoryGroup({
  category,
  indicators,
  onCardClick,
}: {
  category: string;
  indicators: EconomicIndicator[];
  onCardClick: (ind: EconomicIndicator) => void;
}) {
  const hex = CATEGORY_HEX[category] ?? "#94a3b8";
  return (
    <div className="mb-5">
      {/* 카테고리 구분선 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <span
          style={{
            width: "3px",
            height: "14px",
            borderRadius: "2px",
            background: hex,
            flexShrink: 0,
          }}
        />
        <span
          className="font-semibold"
          style={{ color: hex, fontSize: "12px" }}
        >
          {category}
        </span>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
          {indicators.length}개
        </span>
      </div>

      {/* 카드 그리드 */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}
      >
        {indicators.map((ind) => (
          <IndicatorCard
            key={ind.id}
            indicator={ind}
            onClick={() => onCardClick(ind)}
          />
        ))}
      </div>
    </div>
  );
}

// ── 지역 섹션 헤더 ────────────────────────────
function SectionHeader({
  region,
  count,
}: {
  region: "domestic" | "foreign";
  count: number;
}) {
  const isDom = region === "domestic";
  return (
    <div className="flex items-center gap-2 mb-4">
      {isDom ? (
        <Flag size={14} color="#60a5fa" />
      ) : (
        <Globe size={14} color="#a78bfa" />
      )}
      <span
        className="font-semibold"
        style={{
          color: isDom ? "#60a5fa" : "#a78bfa",
          fontSize: "13px",
        }}
      >
        {isDom ? "국내 지표" : "국외 지표"}
      </span>
      <span
        style={{
          background: "rgba(100,116,139,0.1)",
          color: "var(--text-muted)",
          borderRadius: "999px",
          padding: "1px 8px",
          fontSize: "11px",
        }}
      >
        {count}개
      </span>
    </div>
  );
}

// ── 카테고리별 그룹핑 헬퍼 ─────────────────────
function groupByCategory(indicators: EconomicIndicator[]): Record<string, EconomicIndicator[]> {
  return indicators.reduce<Record<string, EconomicIndicator[]>>((acc, ind) => {
    if (!acc[ind.category]) acc[ind.category] = [];
    acc[ind.category].push(ind);
    return acc;
  }, {});
}

// ── 지역 블록 ─────────────────────────────────
function RegionBlock({
  region,
  indicators,
  onCardClick,
}: {
  region: "domestic" | "foreign";
  indicators: EconomicIndicator[];
  onCardClick: (ind: EconomicIndicator) => void;
}) {
  const grouped = groupByCategory(indicators);
  const orderedCategories = CATEGORY_ORDER.filter((cat) => grouped[cat]?.length);

  return (
    <div className="mb-8">
      <SectionHeader region={region} count={indicators.length} />
      {orderedCategories.map((cat) => (
        <CategoryGroup
          key={cat}
          category={cat}
          indicators={grouped[cat]}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────

interface KeyDataSectionProps {
  /** 실제 API 데이터. 없으면 더미 데이터 사용 */
  indicators?: EconomicIndicator[];
}

export default function KeyDataSection({ indicators }: KeyDataSectionProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<EconomicIndicator | null>(null);
  const [activeRegion, setActiveRegion] = useState<"both" | "domestic" | "foreign">("both");

  // 실제 데이터가 있으면 사용, 없으면 더미 데이터
  const sourceIndicators = indicators ?? [..._dummyDomestic, ..._dummyForeign];
  const domesticList = sourceIndicators.filter((i) => i.region === "domestic");
  const foreignList = sourceIndicators.filter((i) => i.region === "foreign");

  const showDomestic = activeRegion === "both" || activeRegion === "domestic";
  const showForeign = activeRegion === "both" || activeRegion === "foreign";

  return (
    <div className="flex flex-col h-full">
      {/* 상단 필터 */}
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
          클릭 시 3년 시계열 차트 팝업
        </span>
      </div>

      {/* 스크롤 컨테이너 */}
      <div className="scroll-container flex-1">
        {showDomestic && (
          <RegionBlock
            region="domestic"
            indicators={domesticList}
            onCardClick={setSelectedIndicator}
          />
        )}
        {showForeign && (
          <RegionBlock
            region="foreign"
            indicators={foreignList}
            onCardClick={setSelectedIndicator}
          />
        )}
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
