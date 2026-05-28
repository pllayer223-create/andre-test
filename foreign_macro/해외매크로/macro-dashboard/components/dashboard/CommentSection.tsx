"use client";

import { useState, useEffect } from "react";
import {
  ExternalLink, Clock, CalendarDays,
  AlertCircle, Minus, CircleDot, RefreshCw, Loader2, Newspaper,
} from "lucide-react";
import { economicEvents, TODAY } from "@/lib/dummy-data";
import type { EconomicEvent } from "@/lib/types";
import type { NaverReport } from "@/app/api/research/route";
import ReportModal from "./ReportModal";

// ── Props ─────────────────────────────────────
interface CommentSectionProps {
  date?: string; // YYYY-MM-DD, 없으면 오늘
}

// ── 중요도 설정 ───────────────────────────────
const IMPORTANCE_CONFIG = {
  high:   { label: "HIGH",   color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: AlertCircle },
  medium: { label: "MED",    color: "#eab308", bg: "rgba(234,179,8,0.1)",   icon: CircleDot },
  low:    { label: "LOW",    color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: Minus },
};

// ── 날짜 포매터 ───────────────────────────────
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" });
}

function getDayLabel(dateStr: string) {
  if (dateStr === TODAY) return "오늘";
  const today = new Date(TODAY);
  const target = new Date(dateStr);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 1) return "내일";
  if (diff <= 7) return `${diff}일 후`;
  return formatDate(dateStr);
}

// ── 경제지표 일정 아이템 ──────────────────────
function EventItem({ event }: { event: EconomicEvent }) {
  const cfg = IMPORTANCE_CONFIG[event.importance];
  const ImportanceIcon = cfg.icon;
  const isPast = event.scheduledDate < TODAY;
  const isToday = event.scheduledDate === TODAY;

  return (
    <div
      className="flex items-start gap-2.5 py-2.5 px-3 rounded-lg"
      style={{
        background: isToday ? "rgba(59,130,246,0.05)" : "transparent",
        borderLeft: `2px solid ${isToday ? "#3b82f6" : cfg.color}`,
        opacity: isPast ? 0.55 : 1,
      }}
    >
      {/* 중요도 */}
      <div
        className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded"
        style={{ background: cfg.bg, marginTop: "1px" }}
      >
        <ImportanceIcon size={9} color={cfg.color} />
        <span style={{ color: cfg.color, fontSize: "9px", fontWeight: 700 }}>
          {cfg.label}
        </span>
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <p
          className="font-medium leading-snug"
          style={{ color: "var(--text-primary)", fontSize: "12px" }}
        >
          {event.name}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "10px" }}>
          {event.nameEn}
        </p>

        {/* 이전값 / 예측 / 실제 */}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {event.previous && (
            <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
              이전 <span style={{ color: "var(--text-secondary)" }}>{event.previous}</span>
            </span>
          )}
          {event.forecast && (
            <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
              예측 <span style={{ color: "#60a5fa" }}>{event.forecast}</span>
            </span>
          )}
          {event.actual && (
            <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
              실제{" "}
              <span
                style={{
                  color:
                    event.actual === event.forecast ? "#94a3b8"
                    : event.actual > (event.forecast ?? "") ? "#22c55e"
                    : "#ef4444",
                  fontWeight: 600,
                }}
              >
                {event.actual}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* 시간 */}
      {event.scheduledTime && (
        <div className="flex-shrink-0 text-right" style={{ minWidth: "38px" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
            {event.scheduledTime}
          </span>
          <p style={{ color: "var(--text-muted)", fontSize: "9px" }}>KST</p>
        </div>
      )}
    </div>
  );
}

// ── 날짜 그룹 ─────────────────────────────────
function DateGroup({ date, events }: { date: string; events: EconomicEvent[] }) {
  const isToday = date === TODAY;
  const isPast = date < TODAY;
  const highCount = events.filter(e => e.importance === "high").length;

  return (
    <div className="mb-3">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-1"
        style={{
          background: isToday ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${isToday ? "rgba(59,130,246,0.2)" : "var(--border)"}`,
        }}
      >
        <CalendarDays size={11} color={isToday ? "#60a5fa" : "#64748b"} />
        <span
          className="font-semibold"
          style={{
            color: isToday ? "#60a5fa" : isPast ? "var(--text-muted)" : "var(--text-secondary)",
            fontSize: "11px",
          }}
        >
          {getDayLabel(date)}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
          {formatDate(date)}
        </span>
        {highCount > 0 && (
          <span
            className="ml-auto"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "#ef4444",
              borderRadius: "999px",
              padding: "0px 6px",
              fontSize: "9px",
              fontWeight: 700,
            }}
          >
            HIGH ×{highCount}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        {events.map(ev => <EventItem key={ev.id} event={ev} />)}
      </div>
    </div>
  );
}

// ── 경제지표 일정 패널 ────────────────────────
function EventSchedule() {
  const allEvents = economicEvents
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  const grouped = allEvents.reduce<Record<string, EconomicEvent[]>>((acc, ev) => {
    if (!acc[ev.scheduledDate]) acc[ev.scheduledDate] = [];
    acc[ev.scheduledDate].push(ev);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();
  const upcomingCount = allEvents.filter(e => e.scheduledDate >= TODAY).length;
  const highCount = allEvents.filter(e => e.importance === "high" && e.scheduledDate >= TODAY).length;

  return (
    <div>
      {/* 요약 */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
          향후 <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{upcomingCount}건</span>
        </span>
        {highCount > 0 && (
          <span
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "#ef4444",
              borderRadius: "6px",
              padding: "1px 7px",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            HIGH {highCount}건
          </span>
        )}
      </div>

      {dates.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "12px", textAlign: "center", padding: "24px 0" }}>
          등록된 일정이 없습니다.
        </p>
      ) : (
        dates.map(date => (
          <DateGroup key={date} date={date} events={grouped[date]} />
        ))
      )}
    </div>
  );
}

// ── 카테고리 배지 설정 ────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  economy:   "경제분석",
  debenture: "채권분석",
};
const CATEGORY_COLOR: Record<string, string> = {
  economy:   "#60a5fa",
  debenture: "#f59e0b",
};

// ── 네이버 리서치 아이템 카드 ─────────────────
function NaverReportItem({
  report,
  onClick,
}: {
  report: NaverReport;
  onClick: () => void;
}) {
  return (
    <div
      className="card p-3 mb-2 animate-fade-in"
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "rgba(59,130,246,0.1)" }}
        >
          <Newspaper size={13} color="#60a5fa" />
        </div>
        <div className="flex-1 min-w-0">
          {/* 제목 */}
          <p
            className="font-medium leading-snug mb-1.5"
            style={{ color: "var(--text-primary)", fontSize: "13px" }}
          >
            {report.title}
          </p>

          {/* 메타 배지 행 */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {/* 발간일 */}
            <div className="flex items-center gap-1">
              <Clock size={10} color="#64748b" />
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                {report.date}
              </span>
            </div>

            {/* 카테고리 배지 */}
            <span
              style={{
                background: `${CATEGORY_COLOR[report.category] ?? "#94a3b8"}22`,
                color: CATEGORY_COLOR[report.category] ?? "#94a3b8",
                borderRadius: "4px",
                padding: "1px 6px",
                fontSize: "10px",
                fontWeight: 600,
              }}
            >
              {CATEGORY_LABEL[report.category] ?? report.category}
            </span>

            {/* 증권사 */}
            {report.publisher && (
              <span
                style={{
                  background: "rgba(234,179,8,0.1)",
                  color: "#ca8a04",
                  borderRadius: "4px",
                  padding: "1px 6px",
                  fontSize: "10px",
                  fontWeight: 600,
                }}
              >
                {report.publisher}
              </span>
            )}
          </div>

          {/* 원문 보기 링크 */}
          <a
            href={report.viewUrl}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 hover:underline"
            style={{ color: "#3b82f6", fontSize: "11px", width: "fit-content" }}
          >
            <ExternalLink size={11} />
            원문 보기
          </a>
        </div>
      </div>
    </div>
  );
}

// ── 리서치 리포트 패널 ────────────────────────
// date prop: YYYY-MM-DD 형식
// NaverReport.date: YYYY.MM.DD 형식 → 변환 후 비교
function ResearchReportPanel({ date }: { date?: string }) {
  const [reports, setReports] = useState<NaverReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<NaverReport | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [cutoffDate, setCutoffDate] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");

  // YYYY-MM-DD → YYYY.MM.DD (NaverReport.date 형식과 비교용)
  const targetDateDot = date ? date.replace(/-/g, ".") : null;

  const fetchReports = async (cat: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/research?category=${cat}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "API 오류");
      setReports(data.reports ?? []);
      setFetchedAt(data.fetchedAt ?? null);
      setCutoffDate(data.cutoffDate ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(category); }, [category]);

  // date prop 필터링
  const displayedReports = targetDateDot
    ? reports.filter(r => r.date === targetDateDot)
    : reports;

  const categoryTabs = [
    { key: "all",       label: "전체" },
    { key: "economy",   label: "경제분석" },
    { key: "debenture", label: "채권분석" },
  ];

  return (
    <>
      {/* 카테고리 필터 */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {categoryTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setCategory(tab.key)}
            style={{
              padding: "3px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              background: category === tab.key ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)",
              color: category === tab.key ? "#60a5fa" : "var(--text-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => fetchReports(category)}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: "3px",
          }}
          title="새로고침"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* 기준일 / 건수 표시 */}
      {!loading && (
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <Clock size={10} color="#64748b" />
          {targetDateDot ? (
            <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
              선택 날짜:{" "}
              <span style={{ color: "var(--text-secondary)" }}>{targetDateDot}</span>
            </span>
          ) : (
            cutoffDate && (
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                최근 3영업일 기준&nbsp;
                <span style={{ color: "var(--text-secondary)" }}>{cutoffDate}</span>
                {" ~ 오늘"}
              </span>
            )
          )}
          {!loading && !error && (
            <span
              style={{
                marginLeft: "4px",
                background: "rgba(34,197,94,0.1)",
                color: "#22c55e",
                borderRadius: "4px",
                padding: "0px 6px",
                fontSize: "10px",
                fontWeight: 600,
              }}
            >
              {displayedReports.length}건
            </span>
          )}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 size={16} color="#3b82f6" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
            네이버 리서치 로딩 중...
          </span>
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div
          className="p-3 rounded-xl mb-3"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <p style={{ color: "#f87171", fontSize: "11px" }}>{error}</p>
        </div>
      )}

      {/* 날짜 필터 결과 없음 */}
      {!loading && !error && targetDateDot && displayedReports.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "32px 0" }}>
          선택된 날짜({targetDateDot})에 발간된 리서치 자료가 없습니다.
        </p>
      )}

      {/* 날짜 필터 없이 전체 결과 없음 */}
      {!loading && !error && !targetDateDot && displayedReports.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: "12px", textAlign: "center", padding: "24px 0" }}>
          리서치 자료가 없습니다.
        </p>
      )}

      {/* 리포트 목록 */}
      {!loading && !error && displayedReports.length > 0 && (
        <>
          <div className="flex flex-col">
            {displayedReports.map(r => (
              <NaverReportItem
                key={r.nid}
                report={r}
                onClick={() => setSelectedReport(r)}
              />
            ))}
          </div>
          {fetchedAt && (
            <p style={{ color: "var(--text-muted)", fontSize: "10px", textAlign: "center", marginTop: "8px" }}>
              갱신: {new Date(fetchedAt).toLocaleTimeString("ko-KR")}
            </p>
          )}
        </>
      )}

      {/* 리포트 모달 */}
      {selectedReport && (
        <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────
export default function CommentSection({ date }: CommentSectionProps = {}) {
  return (
    <div style={{ display: "flex", gap: "20px", height: "100%" }}>
      {/* 좌측: 네이버 리서치 리포트 (약 60%) */}
      <div
        style={{ flex: "3", overflowY: "auto", paddingRight: "4px" }}
        className="scroll-container"
      >
        {/* 섹션 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <Newspaper size={15} color="#60a5fa" />
          <span
            className="font-semibold"
            style={{ color: "var(--text-primary)", fontSize: "14px" }}
          >
            네이버 리서치 리포트
          </span>
          {date && (
            <span
              style={{
                background: "rgba(59,130,246,0.12)",
                color: "#60a5fa",
                borderRadius: "6px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {date}
            </span>
          )}
        </div>

        <ResearchReportPanel date={date} />
      </div>

      {/* 우측: 경제지표 일정 (약 40%, 고정 너비) */}
      <div
        style={{ width: "320px", flexShrink: 0 }}
        className="card flex flex-col"
      >
        {/* 패널 헤더 */}
        <div
          className="flex items-center gap-2 p-3"
          style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}
        >
          <CalendarDays size={13} color="#60a5fa" />
          <span
            className="font-semibold"
            style={{ color: "var(--text-primary)", fontSize: "13px" }}
          >
            경제지표 일정
          </span>
        </div>

        {/* 일정 목록 */}
        <div
          className="flex-1 scroll-container p-3"
          style={{ overflowY: "auto" }}
        >
          <EventSchedule />
        </div>
      </div>
    </div>
  );
}
