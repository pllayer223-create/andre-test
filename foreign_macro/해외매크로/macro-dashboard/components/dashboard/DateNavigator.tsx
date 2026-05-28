"use client";

import { ChevronLeft, ChevronRight, Calendar, RotateCcw, Loader2 } from "lucide-react";
import { isKRXBusinessDay, isNYSEBusinessDay, localToday } from "@/lib/holidays";

/** Date → YYYY-MM-DD 로컬 시각 기준 (UTC 변환 금지 — 시차 오류 방지) */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── 공휴일/주말 배지 ───────────────────────

function DayBadge({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const isWeekend = day === 0 || day === 6;
  const krxOpen = isKRXBusinessDay(dateStr);
  const nyseOpen = isNYSEBusinessDay(dateStr);

  if (isWeekend) {
    return (
      <span
        style={{
          fontSize: "10px",
          padding: "1px 6px",
          borderRadius: "4px",
          background: "rgba(234,179,8,0.15)",
          color: "#ca8a04",
          border: "1px solid rgba(234,179,8,0.3)",
        }}
      >
        {day === 0 ? "일요일" : "토요일"}
      </span>
    );
  }
  if (!krxOpen && !nyseOpen) {
    return (
      <span
        style={{
          fontSize: "10px",
          padding: "1px 6px",
          borderRadius: "4px",
          background: "rgba(239,68,68,0.12)",
          color: "#ef4444",
          border: "1px solid rgba(239,68,68,0.25)",
        }}
      >
        한·미 공휴일
      </span>
    );
  }
  if (!krxOpen) {
    return (
      <span
        style={{
          fontSize: "10px",
          padding: "1px 6px",
          borderRadius: "4px",
          background: "rgba(239,68,68,0.12)",
          color: "#ef4444",
          border: "1px solid rgba(239,68,68,0.25)",
        }}
      >
        KRX 휴장
      </span>
    );
  }
  if (!nyseOpen) {
    return (
      <span
        style={{
          fontSize: "10px",
          padding: "1px 6px",
          borderRadius: "4px",
          background: "rgba(249,115,22,0.12)",
          color: "#f97316",
          border: "1px solid rgba(249,115,22,0.25)",
        }}
      >
        NYSE 휴장
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: "10px",
        padding: "1px 6px",
        borderRadius: "4px",
        background: "rgba(34,197,94,0.12)",
        color: "#16a34a",
        border: "1px solid rgba(34,197,94,0.25)",
      }}
    >
      영업일
    </span>
  );
}

// ── 날짜 포맷 ──────────────────────────────

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  // new Date(y, m-1, d) = 로컬 시각 기준 — 시차 오류 없음
  const weekDay = ["일", "월", "화", "수", "목", "금", "토"][
    new Date(y, m - 1, d).getDay()
  ];
  return `${y}년 ${m}월 ${d}일 (${weekDay})`;
}

// ── props ──────────────────────────────────

interface DateNavigatorProps {
  date: string;                      // YYYY-MM-DD
  loading?: boolean;
  onDateChange: (date: string) => void;
  onRefresh?: () => void;
}

// ── 컴포넌트 ───────────────────────────────

export default function DateNavigator({
  date,
  loading = false,
  onDateChange,
  onRefresh,
}: DateNavigatorProps) {
  // localToday() = 로컬 시각 기준 오늘 (toISOString은 UTC라 한국에서 하루 뒤로 밀림)
  const today = localToday();
  const isToday = date === today;

  function step(direction: -1 | 1) {
    const [y, m, d] = date.split("-").map(Number);
    const cur = new Date(y, m - 1, d); // 로컬 시각
    cur.setDate(cur.getDate() + direction);
    const next = toLocalDateStr(cur);
    if (next > today) return; // 미래 방지
    onDateChange(next);
  }

  function goToday() {
    onDateChange(today);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= today) onDateChange(v);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 16px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        flexWrap: "wrap",
      }}
    >
      {/* 이전 날 */}
      <button
        onClick={() => step(-1)}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "30px",
          height: "30px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--bg-primary)",
          cursor: loading ? "not-allowed" : "pointer",
          color: "var(--text-primary)",
          opacity: loading ? 0.5 : 1,
        }}
        title="이전 날"
      >
        <ChevronLeft size={16} />
      </button>

      {/* 날짜 입력 + 배지 */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Calendar size={14} style={{ color: "var(--text-muted)" }} />
        <input
          type="date"
          value={date}
          max={today}
          onChange={handleInput}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        />
        <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          {formatDate(date)}
        </span>
        <DayBadge dateStr={date} />
      </div>

      {/* 다음 날 */}
      <button
        onClick={() => step(1)}
        disabled={loading || isToday}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "30px",
          height: "30px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--bg-primary)",
          cursor: loading || isToday ? "not-allowed" : "pointer",
          color: "var(--text-primary)",
          opacity: loading || isToday ? 0.4 : 1,
        }}
        title="다음 날"
      >
        <ChevronRight size={16} />
      </button>

      {/* 오늘 버튼 */}
      {!isToday && (
        <button
          onClick={goToday}
          disabled={loading}
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid rgba(59,130,246,0.4)",
            background: "rgba(59,130,246,0.1)",
            color: "#3b82f6",
            fontSize: "12px",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          오늘
        </button>
      )}

      {/* 로딩 인디케이터 */}
      {loading && (
        <Loader2
          size={16}
          style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }}
        />
      )}

      {/* 새로고침 */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            background: "var(--bg-primary)",
            color: "var(--text-secondary)",
            fontSize: "12px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
          title="데이터 강제 갱신"
        >
          <RotateCcw size={12} />
          갱신
        </button>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
