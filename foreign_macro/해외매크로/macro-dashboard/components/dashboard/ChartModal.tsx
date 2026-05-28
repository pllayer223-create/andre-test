"use client";

import { useEffect, useRef } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { EconomicIndicator } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/dummy-data";

interface ChartModalProps {
  indicator: EconomicIndicator;
  onClose: () => void;
}

// 커스텀 툴팁
function CustomTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1e2a42",
        border: "1px solid #2d3a52",
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "12px",
      }}
    >
      <p style={{ color: "#94a3b8", marginBottom: "2px" }}>{label}</p>
      <p style={{ color: "#f1f5f9", fontWeight: 600 }}>
        {payload[0].value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}{" "}
        <span style={{ color: "#64748b" }}>{unit}</span>
      </p>
    </div>
  );
}

export default function ChartModal({ indicator, onClose }: ChartModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isUp = indicator.trend === "up";
  const isDown = indicator.trend === "down";

  const trendColor = isUp ? "#22c55e" : isDown ? "#ef4444" : "#94a3b8";
  const trendBg = isUp ? "rgba(34,197,94,0.1)" : isDown ? "rgba(239,68,68,0.1)" : "rgba(100,116,139,0.1)";
  const areaColor = isUp ? "#22c55e" : isDown ? "#ef4444" : "#3b82f6";
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  // 통계 계산
  const values = indicator.timeSeries.map((d) => d.value);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const avgVal = values.reduce((a, b) => a + b, 0) / values.length;

  // XAxis 라벨: 월별 표시 (6개월마다)
  const chartData = indicator.timeSeries.map((d) => ({
    ...d,
    displayDate: d.date.slice(0, 7), // "YYYY-MM"
  }));

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          width: "min(90vw, 820px)",
          maxHeight: "88vh",
          overflowY: "auto",
          padding: "0",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-start justify-between p-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                style={{
                  background: trendBg,
                  color: trendColor,
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {indicator.category}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                {indicator.region === "domestic" ? "국내" : "국외"}
              </span>
            </div>
            <h2
              className="font-bold"
              style={{ color: "var(--text-primary)", fontSize: "18px" }}
            >
              {indicator.nameKo}
              <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "13px", marginLeft: "8px" }}>
                {indicator.name}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 현재 값 영역 */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-end gap-3">
            <span
              className="font-bold"
              style={{ color: "var(--text-primary)", fontSize: "32px", lineHeight: 1 }}
            >
              {indicator.currentValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "16px", paddingBottom: "2px" }}>
              {indicator.unit}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: trendBg }}
            >
              <TrendIcon size={14} color={trendColor} />
              <span style={{ color: trendColor, fontWeight: 600, fontSize: "13px" }}>
                {indicator.changeAbs > 0 ? "+" : ""}{indicator.changeAbs.toFixed(2)} ({indicator.changePct > 0 ? "+" : ""}{indicator.changePct.toFixed(2)}%)
              </span>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
              전일 대비
            </div>
          </div>
        </div>

        {/* 차트 */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
              과거 3년 시계열 (더미 데이터)
            </span>
            <a
              href={indicator.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1"
              style={{ color: "#3b82f6", fontSize: "11px", textDecoration: "none" }}
            >
              <ExternalLink size={11} />
              {indicator.source}
            </a>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="displayDate"
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={55}
                tickFormatter={(v) =>
                  v >= 1000
                    ? (v / 1000).toFixed(1) + "k"
                    : v.toFixed(1)
                }
              />
              <Tooltip
                content={<CustomTooltip unit={indicator.unit} />}
                cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
              />
              <ReferenceLine
                y={avgVal}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="4 4"
                label={{ value: "평균", fill: "#64748b", fontSize: 9, position: "insideTopRight" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={areaColor}
                strokeWidth={1.5}
                fill={`url(#grad-${indicator.id})`}
                dot={false}
                activeDot={{ r: 4, fill: areaColor, stroke: "#0a0e17", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 통계 요약 */}
        <div
          className="grid grid-cols-4 gap-3 px-5 pb-5"
          style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
        >
          {[
            { label: "현재", value: indicator.currentValue },
            { label: "3년 최고", value: maxVal },
            { label: "3년 최저", value: minVal },
            { label: "3년 평균", value: avgVal },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="text-center p-3 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
              }}
            >
              <p style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "4px" }}>
                {label}
              </p>
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "14px" }}>
                {value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                {indicator.unit}
              </p>
            </div>
          ))}
        </div>

        {/* 데이터 출처 면책 */}
        <div
          className="flex items-start gap-2 mx-5 mb-5 p-3 rounded-xl"
          style={{
            background: "rgba(234,179,8,0.05)",
            border: "1px solid rgba(234,179,8,0.1)",
          }}
        >
          <Info size={13} color="#ca8a04" style={{ flexShrink: 0, marginTop: "1px" }} />
          <p style={{ color: "#92400e", fontSize: "11px", opacity: 0.8 }}>
            현재 표시된 데이터는 UI 개발용 더미 데이터입니다. 실제 운영 시{" "}
            <strong>{indicator.source}</strong>에서 데이터를 가져옵니다.
          </p>
        </div>
      </div>
    </div>
  );
}
