"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { domesticIndicators, foreignIndicators } from "@/lib/dummy-data";
import type { EconomicIndicator } from "@/lib/types";

// ── 색상 팔레트 ───────────────────────────────
const PALETTE = [
  "#60a5fa", "#f87171", "#4ade80", "#fbbf24",
  "#c084fc", "#34d399", "#fb923c", "#38bdf8",
  "#f472b6", "#a3e635",
];

// ── 시리즈 그룹 정의 ──────────────────────────
const SERIES_GROUPS = [
  {
    group: "국내 금리",
    ids: [
      { id: "kor-base-rate", label: "기준금리" },
      { id: "mss-1y",        label: "통안채 1Y" },
      { id: "kor-3y-bond",   label: "KTB 3Y" },
      { id: "kor-10y-bond",  label: "KTB 10Y" },
      { id: "ktb-30y",       label: "KTB 30Y" },
      { id: "cd-91d",        label: "CD 91D" },
      { id: "cp-91d",        label: "CP 91D" },
    ],
  },
  {
    group: "해외 금리",
    ids: [
      { id: "fed-rate", label: "Fed Rate" },
      { id: "us-2y",    label: "US 2Y" },
      { id: "us-10y",   label: "US 10Y" },
      { id: "us-30y",   label: "US 30Y" },
    ],
  },
  {
    group: "주가",
    ids: [
      { id: "kospi",        label: "KOSPI" },
      { id: "kosdaq",       label: "KOSDAQ" },
      { id: "sp500",        label: "S&P 500" },
      { id: "nasdaq",       label: "NASDAQ" },
      { id: "china-csi300", label: "CSI 300" },
    ],
  },
  {
    group: "환율",
    ids: [
      { id: "krw-usd", label: "KRW/USD" },
      { id: "krw-eur", label: "KRW/EUR" },
      { id: "dxy",     label: "DXY" },
      { id: "eur-usd", label: "EUR/USD" },
      { id: "usd-jpy", label: "USD/JPY" },
    ],
  },
  {
    group: "원자재 · 가격",
    ids: [
      { id: "wti",               label: "WTI" },
      { id: "brent",             label: "브렌트유" },
      { id: "gold",              label: "금" },
      { id: "bitcoin",           label: "Bitcoin" },
      { id: "lithium-carbonate", label: "탄산리튬" },
      { id: "ddr5",              label: "DDR5" },
    ],
  },
  {
    group: "기타",
    ids: [
      { id: "vix",                  label: "VIX" },
      { id: "kor-m2",               label: "M2" },
      { id: "kor-investor-deposit", label: "투자자예탁금" },
    ],
  },
];

const DEFAULT_SELECTED = ["kor-base-rate", "kor-3y-bond", "kor-10y-bond", "fed-rate", "us-10y"];

const RANGE_OPTIONS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "3Y", months: 36 },
  { label: "5Y", months: 60 },
  { label: "10Y", months: 120 },
];

// ── 유틸 ─────────────────────────────────────
function buildIndMap(list: EconomicIndicator[]): Record<string, EconomicIndicator> {
  return Object.fromEntries(list.map((i) => [i.id, i]));
}

function getStartDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function fmtTick(v: number, decimals = 2): string {
  if (Math.abs(v) >= 100000) return (v / 1000).toFixed(0) + "k";
  if (Math.abs(v) >= 10000)  return (v / 1000).toFixed(1) + "k";
  if (Math.abs(v) >= 1000)   return (v / 1000).toFixed(2) + "k";
  return v.toFixed(decimals);
}

// ── 스케일 차이로 우축 자동 제안 ─────────────────
// 신규 시리즈 추가 시 기존 좌축 기준과 log10 차이 > 1.0 (10배) 이면 R축 권고
function shouldBeRightAxis(
  newId: string,
  leftIds: string[],
  indMap: Record<string, EconomicIndicator>
): boolean {
  if (leftIds.length === 0) return false;
  const THRESHOLD = 1.0;
  const refLog = Math.log10(Math.max(Math.abs(indMap[leftIds[0]]?.currentValue ?? 1), 0.001));
  const newLog = Math.log10(Math.max(Math.abs(indMap[newId]?.currentValue ?? 1), 0.001));
  return Math.abs(newLog - refLog) > THRESHOLD;
}

// ── 시계열 머지 ───────────────────────────────
type MergedPoint = { date: string; [key: string]: number | string | null };

function mergeTimeSeries(
  selectedIds: string[],
  indMap: Record<string, EconomicIndicator>,
  startDate: string
): MergedPoint[] {
  const valid = selectedIds.filter((id) => indMap[id]?.timeSeries?.length);
  const filtered = valid.map((id) => ({
    id,
    data: indMap[id].timeSeries.filter((d) => d.date >= startDate),
  }));
  if (filtered.length === 0) return [];

  const dateSet = new Set<string>();
  filtered.forEach((s) => s.data.forEach((d) => dateSet.add(d.date)));
  const dates = Array.from(dateSet).sort();

  const valueMaps = Object.fromEntries(
    filtered.map((s) => [s.id, Object.fromEntries(s.data.map((d) => [d.date, d.value]))])
  );

  return dates.map((date) => {
    const point: MergedPoint = { date };
    valid.forEach((id) => {
      const raw = valueMaps[id]?.[date] ?? null;
      point[id] = raw;
    });
    return point;
  });
}

// ── 커스텀 툴팁 ───────────────────────────────
function CustomTooltip({
  active, payload, label,
  indMap, colorMap, axisLeft,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
  indMap: Record<string, EconomicIndicator>;
  colorMap: Record<string, string>;
  axisLeft: string[];
}) {
  if (!active || !payload?.length) return null;
  const valid = payload.filter((p) => p.value != null);
  if (!valid.length) return null;

  // 좌/우 축 그룹 분리
  const leftItems  = valid.filter((p) => axisLeft.includes(p.dataKey));
  const rightItems = valid.filter((p) => !axisLeft.includes(p.dataKey));
  const showSplit  = rightItems.length > 0;

  return (
    <div style={{
      background: "#0f172a",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px",
      padding: "10px 14px",
      fontSize: "11px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      minWidth: "200px",
      maxWidth: "280px",
    }}>
      <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "7px" }}>{label}</p>

      {/* 좌축 항목 */}
      {showSplit && leftItems.length > 0 && (
        <p style={{ color: "#60a5fa", fontSize: "9px", fontWeight: 700, marginBottom: "4px", letterSpacing: "0.5px" }}>
          ◀ 좌축
        </p>
      )}
      {(showSplit ? leftItems : valid).map((p) => {
        const ind = indMap[p.dataKey];
        return (
          <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "4px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colorMap[p.dataKey], flexShrink: 0 }} />
              <span style={{ color: "#cbd5e1" }}>{ind?.nameKo ?? p.dataKey}</span>
            </span>
            <span style={{ color: "#f1f5f9", fontWeight: 700 }}>
              {p.value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} {ind?.unit ?? ""}
            </span>
          </div>
        );
      })}

      {/* 우축 항목 */}
      {showSplit && rightItems.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0 4px" }} />
          <p style={{ color: "#fb923c", fontSize: "9px", fontWeight: 700, marginBottom: "4px", letterSpacing: "0.5px" }}>
            ▶ 우축 (보조)
          </p>
          {rightItems.map((p) => {
            const ind = indMap[p.dataKey];
            return (
              <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "4px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colorMap[p.dataKey], flexShrink: 0 }} />
                  <span style={{ color: "#cbd5e1" }}>{ind?.nameKo ?? p.dataKey}</span>
                </span>
                <span style={{ color: "#f1f5f9", fontWeight: 700 }}>
                  {p.value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} {ind?.unit ?? ""}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── 시리즈 태그 ───────────────────────────────
function SeriesTag({
  id, label, selected, color, onToggle, disabled, isRight, onToggleAxis,
}: {
  id: string;
  label: string;
  selected: boolean;
  color: string;
  onToggle: (id: string) => void;
  disabled: boolean;
  isRight?: boolean;   // 현재 R축 배정 여부
  onToggleAxis?: (id: string) => void; // L↔R 전환 콜백
}) {
  return (
    <button
      onClick={() => onToggle(id)}
      disabled={disabled && !selected}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 10px",
        borderRadius: "20px",
        fontSize: "11px",
        cursor: disabled && !selected ? "not-allowed" : "pointer",
        border: selected ? `1.5px solid ${color}` : "1.5px solid var(--border)",
        background: selected ? `${color}22` : "rgba(255,255,255,0.03)",
        color: selected ? color : "var(--text-muted)",
        fontWeight: selected ? 700 : 400,
        transition: "all 0.15s",
        opacity: disabled && !selected ? 0.35 : 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{
        width: "7px", height: "7px", borderRadius: "50%",
        background: selected ? color : "var(--text-muted)", flexShrink: 0,
      }} />
      {label}
      {/* 축 전환 뱃지 — 선택된 시리즈에만 표시, 클릭으로 L↔R 전환 */}
      {selected && onToggleAxis && (
        <span
          onClick={(e) => { e.stopPropagation(); onToggleAxis(id); }}
          title={isRight ? "클릭: 좌축으로 이동" : "클릭: 우측 보조축으로 이동"}
          style={{
            fontSize: "8px",
            fontWeight: 800,
            padding: "1px 5px",
            borderRadius: "3px",
            marginLeft: "2px",
            cursor: "pointer",
            background: isRight ? "rgba(251,146,60,0.3)" : "rgba(96,165,250,0.15)",
            color: isRight ? "#fb923c" : "#93c5fd",
            border: isRight ? "1px solid rgba(251,146,60,0.5)" : "1px solid rgba(96,165,250,0.3)",
            letterSpacing: "0.3px",
            transition: "all 0.15s",
          }}
        >
          {isRight ? "R" : "L"}
        </span>
      )}
    </button>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────
export default function ChartCompareSection() {
  const [selected, setSelected]         = useState<string[]>(DEFAULT_SELECTED);
  const [rightAxisIds, setRightAxisIds] = useState<string[]>([]);   // 우측 보조축 배정
  const [rangeMonths, setRangeMonths]   = useState(36);

  const indMap = useMemo(
    () => buildIndMap([...domesticIndicators, ...foreignIndicators]),
    []
  );

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    selected.forEach((id, i) => { map[id] = PALETTE[i % PALETTE.length]; });
    return map;
  }, [selected]);

  const MAX_SERIES = 8;

  // 보조축 활성 여부: R축에 1개 이상 배정된 경우
  const showDual = rightAxisIds.length > 0;

  // 좌/우축 ID 목록 (우축에 없으면 좌축)
  const leftAxisIds  = selected.filter((id) => !rightAxisIds.includes(id));
  const rightAxisIdsActive = selected.filter((id) => rightAxisIds.includes(id));

  const chartData = useMemo(() => {
    const start = getStartDate(rangeMonths);
    return mergeTimeSeries(selected, indMap, start);
  }, [selected, indMap, rangeMonths]);

  const xTickInterval = useMemo(() => {
    if (chartData.length <= 30)  return 4;
    if (chartData.length <= 90)  return 10;
    if (chartData.length <= 180) return 20;
    if (chartData.length <= 400) return 40;
    return 80;
  }, [chartData.length]);

  function toggleSeries(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        // 제거 시 R축에서도 제거
        setRightAxisIds((r) => r.filter((rid) => rid !== id));
        return prev.filter((s) => s !== id);
      }
      if (prev.length >= MAX_SERIES) return prev;
      // 추가 시 스케일 차이가 크면 자동으로 R축 제안
      const currentLeftIds = prev.filter((s) => !rightAxisIds.includes(s));
      if (shouldBeRightAxis(id, currentLeftIds, indMap)) {
        setRightAxisIds((r) => [...r, id]);
      }
      return [...prev, id];
    });
  }

  // L↔R 축 전환
  function toggleAxisAssignment(id: string) {
    setRightAxisIds((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  }

  // 기간 내 통계
  const stats = useMemo(() => {
    return selected.map((id) => {
      const ind = indMap[id];
      if (!ind) return null;
      const start = getStartDate(rangeMonths);
      const pts = ind.timeSeries.filter((d) => d.date >= start);
      if (!pts.length) return null;
      const vals = pts.map((d) => d.value);
      return {
        id, ind,
        min:    Math.min(...vals),
        max:    Math.max(...vals),
        first:  vals[0],
        last:   vals[vals.length - 1],
        chgPct: ((vals[vals.length - 1] - vals[0]) / vals[0]) * 100,
      };
    }).filter(Boolean);
  }, [selected, indMap, rangeMonths]);

  // 좌/우축 지표명 요약
  const leftNames  = leftAxisIds.map((id)        => indMap[id]?.nameKo ?? id).join(", ");
  const rightNames = rightAxisIdsActive.map((id) => indMap[id]?.nameKo ?? id).join(", ");

  // 좌/우축 단위 (첫 번째 시리즈의 unit 사용)
  const leftUnit  = indMap[leftAxisIds[0]]?.unit ?? "";
  const rightUnit = indMap[rightAxisIdsActive[0]]?.unit ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── 컨트롤 바 ── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px" }}>

        {/* 기간 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "11px", marginRight: "4px" }}>기간</span>
          {RANGE_OPTIONS.map((r) => (
            <button key={r.label} onClick={() => setRangeMonths(r.months)} style={{
              padding: "4px 12px", borderRadius: "6px", fontSize: "11px",
              cursor: "pointer", border: "none",
              background: rangeMonths === r.months ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
              color: rangeMonths === r.months ? "#60a5fa" : "var(--text-muted)",
              fontWeight: rangeMonths === r.months ? 700 : 400,
            }}>
              {r.label}
            </button>
          ))}
          <span style={{ color: "var(--text-muted)", fontSize: "10px", marginLeft: "auto" }}>
            {selected.length}/{MAX_SERIES}개 선택
          </span>
        </div>

        {/* 시리즈 그룹 */}
        {SERIES_GROUPS.map((grp) => (
          <div key={grp.group} style={{ marginBottom: "8px" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600, display: "inline-block", minWidth: "80px", marginRight: "6px" }}>
              {grp.group}
            </span>
            <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "5px" }}>
              {grp.ids.map((item, idx) => {
                const colorIdx = selected.indexOf(item.id);
                const color = colorIdx >= 0 ? PALETTE[colorIdx % PALETTE.length] : PALETTE[idx % PALETTE.length];
                const isSelected = selected.includes(item.id);
                return (
                  <SeriesTag
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    selected={isSelected}
                    color={color}
                    onToggle={toggleSeries}
                    disabled={selected.length >= MAX_SERIES}
                    isRight={isSelected && rightAxisIds.includes(item.id)}
                    onToggleAxis={isSelected ? toggleAxisAssignment : undefined}
                  />
                );
              })}
            </span>
          </div>
        ))}

        {selected.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "11px", textAlign: "center", padding: "8px 0" }}>
            위에서 시리즈를 선택하세요 (최대 {MAX_SERIES}개)
          </p>
        )}
      </div>

      {/* ── 차트 ── */}
      {selected.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>

          {/* 안내 바 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
            {showDual ? (
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "11px" }}>
                  <span style={{ color: "#60a5fa", fontWeight: 700 }}>◀ 좌축</span>
                  <span style={{ color: "var(--text-muted)", marginLeft: "5px" }}>{leftNames}</span>
                </span>
                <span style={{ fontSize: "11px" }}>
                  <span style={{ color: "#fb923c", fontWeight: 700 }}>▶ 우측 보조축</span>
                  <span style={{ color: "var(--text-muted)", marginLeft: "5px" }}>{rightNames}</span>
                </span>
              </div>
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                시리즈 태그의{" "}
                <span style={{
                  display: "inline-block", fontSize: "8px", fontWeight: 800,
                  padding: "1px 5px", borderRadius: "3px", verticalAlign: "middle",
                  background: "rgba(96,165,250,0.15)", color: "#93c5fd",
                  border: "1px solid rgba(96,165,250,0.3)",
                }}>L</span>
                {" "}뱃지를 클릭하면 우측 보조축으로 이동합니다
              </span>
            )}
            <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
              데이터 {chartData.length}개 포인트
            </span>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: showDual ? 64 : 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={xTickInterval}
                tickFormatter={(v: string) => v.slice(0, 7)}
              />

              {/* 좌축 */}
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fill: showDual ? "#93c5fd" : "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v: number) => fmtTick(v, 2)}
                label={{ value: leftUnit, angle: -90, position: "insideLeft", offset: 10, style: { fill: "var(--text-muted)", fontSize: "10px" } }}
              />

              {/* 우축 (보조) — 보조축 필요 시만 렌더 */}
              {showDual && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#fdba74", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={(v: number) => fmtTick(v, 2)}
                  label={{ value: rightUnit, angle: 90, position: "insideRight", offset: 10, style: { fill: "var(--text-muted)", fontSize: "10px" } }}
                />
              )}

              <Tooltip
                content={
                  <CustomTooltip
                    indMap={indMap}
                    colorMap={colorMap}
                    axisLeft={leftAxisIds}
                  />
                }
                cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
              />
              <Legend
                wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }}
                formatter={(value: string) => (
                  <span style={{ color: colorMap[value] ?? "#94a3b8" }}>
                    {indMap[value]?.nameKo ?? value}
                  </span>
                )}
              />

              {selected.map((id) => {
                const isRight = showDual && rightAxisIds.includes(id);
                return (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    yAxisId={isRight ? "right" : "left"}
                    stroke={colorMap[id] ?? "#94a3b8"}
                    strokeWidth={isRight ? 1.5 : 2}
                    strokeDasharray={isRight ? "5 3" : undefined}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#0f172a" }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>

          {/* 보조축 범례 안내 */}
          {showDual && (
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", justifyContent: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#64748b" }}>
                <span style={{ width: "20px", height: "2px", background: "#60a5fa", display: "inline-block" }} />
                좌축 (실선)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#64748b" }}>
                <span style={{ width: "20px", height: "0", borderTop: "2px dashed #fb923c", display: "inline-block" }} />
                우축 보조 (점선)
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── 기간 통계 테이블 ── */}
      {stats.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{
            background: "linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)",
            padding: "7px 14px", fontSize: "11px", fontWeight: 700,
            color: "#fff", letterSpacing: "0.4px",
          }}>
            기간 내 통계 ({RANGE_OPTIONS.find((r) => r.months === rangeMonths)?.label})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "rgba(30,58,138,0.1)", borderBottom: "1px solid var(--border)" }}>
                {["지표", "축", "현재값", "기간 시작", "기간 최저", "기간 최고", "기간 등락"].map((h, i) => (
                  <th key={h} style={{
                    padding: "6px 12px", color: "#93c5fd", fontWeight: 700,
                    fontSize: "10px", textAlign: i <= 1 ? "left" : "right",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                if (!s) return null;
                const chgColor = s.chgPct >= 0 ? "#22c55e" : "#ef4444";
                const isRight  = showDual && rightAxisIds.includes(s.id);
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(59,130,246,0.05)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  >
                    <td style={{ padding: "6px 12px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colorMap[s.id], flexShrink: 0 }} />
                        <span style={{ color: "#93c5fd", fontWeight: 600 }}>{s.ind.nameKo}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>{s.ind.unit}</span>
                      </span>
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      {showDual && (
                        <span style={{
                          fontSize: "9px", fontWeight: 800, padding: "1px 5px", borderRadius: "3px",
                          background: isRight ? "rgba(251,146,60,0.2)" : "rgba(96,165,250,0.2)",
                          color: isRight ? "#fb923c" : "#60a5fa",
                        }}>
                          {isRight ? "우" : "좌"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-primary)", fontWeight: 700 }}>
                      {s.last.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {s.first.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "6px 12px", textAlign: "right", color: "#f87171" }}>
                      {s.min.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "6px 12px", textAlign: "right", color: "#4ade80" }}>
                      {s.max.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "6px 12px", textAlign: "right", color: chgColor, fontWeight: 700 }}>
                      {s.chgPct >= 0 ? "+" : ""}{s.chgPct.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
