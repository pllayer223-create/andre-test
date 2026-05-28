"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, ExternalLink, FileText, Download,
  Building2, Calendar, Tag, AlertCircle,
} from "lucide-react";
import type { NaverReport } from "@/app/api/research/route";

interface ReportModalProps {
  report: NaverReport;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  economy:   "경제분석",
  debenture: "채권분석",
};

const CATEGORY_COLOR: Record<string, { color: string; bg: string }> = {
  economy:   { color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
  debenture: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
};

export default function ReportModal({ report, onClose }: ReportModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const catStyle = CATEGORY_COLOR[report.category] ?? { color: "#94a3b8", bg: "rgba(100,116,139,0.1)" };
  const dateFormatted = report.date.replace(/\./g, "-");

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="animate-fade-in"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          width: "min(92vw, 960px)",
          height: "min(90vh, 780px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        {/* ── 헤더 ── */}
        <div
          className="flex items-start justify-between p-5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex-1 min-w-0 pr-4">
            {/* 카테고리 뱃지 */}
            <div className="flex items-center gap-2 mb-2">
              <span
                style={{
                  background: catStyle.bg,
                  color: catStyle.color,
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {CATEGORY_LABEL[report.category] ?? report.category}
              </span>
              <Tag size={11} color="#64748b" />
              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                네이버 금융 리서치
              </span>
            </div>

            {/* 제목 */}
            <h2
              className="font-bold leading-snug mb-3"
              style={{ color: "var(--text-primary)", fontSize: "16px" }}
            >
              {report.title}
            </h2>

            {/* 메타 정보 */}
            <div className="flex items-center gap-4 flex-wrap">
              {report.publisher && (
                <div className="flex items-center gap-1.5">
                  <Building2 size={12} color="#64748b" />
                  <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                    {report.publisher}
                  </span>
                </div>
              )}
              {report.date && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} color="#64748b" />
                  <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                    {dateFormatted}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── 액션 버튼 ── */}
        <div
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.015)" }}
        >
          {/* 네이버 리서치 페이지 */}
          <a
            href={report.viewUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.25)",
              color: "#60a5fa",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={13} />
            네이버 리서치에서 보기
          </a>

          {/* PDF 다운로드 */}
          {report.pdfUrl && (
            <a
              href={report.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              <Download size={13} />
              PDF 다운로드
            </a>
          )}

          <div style={{ marginLeft: "auto" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              NID: {report.nid}
            </span>
          </div>
        </div>

        {/* ── 뷰어 영역 ── */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          {iframeLoading && !iframeError && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "var(--bg-primary)", zIndex: 1 }}
            >
              <div className="text-center">
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-3"
                  style={{
                    border: "2px solid rgba(59,130,246,0.2)",
                    borderTopColor: "#3b82f6",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  리포트 로딩 중...
                </p>
              </div>
            </div>
          )}

          {iframeError ? (
            /* 로드 실패 시 안내 */
            <div
              className="flex flex-col items-center justify-center h-full gap-4 p-8"
              style={{ background: "var(--bg-primary)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.1)" }}
              >
                <AlertCircle size={28} color="#ef4444" />
              </div>
              <div className="text-center">
                <p
                  className="font-semibold mb-1"
                  style={{ color: "var(--text-primary)", fontSize: "15px" }}
                >
                  페이지를 직접 표시할 수 없습니다
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  네이버의 보안 정책(X-Frame-Options)으로 인해 인라인 표시가 제한됩니다.
                </p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <a
                  href={report.viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold"
                  style={{
                    background: "rgba(59,130,246,0.2)",
                    border: "1px solid rgba(59,130,246,0.3)",
                    color: "#60a5fa",
                    textDecoration: "none",
                    fontSize: "13px",
                  }}
                >
                  <ExternalLink size={14} />
                  새 탭에서 리포트 열기
                </a>
                {report.pdfUrl && (
                  <a
                    href={report.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold"
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171",
                      textDecoration: "none",
                      fontSize: "13px",
                    }}
                  >
                    <FileText size={14} />
                    PDF 열기
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* iframe 뷰어 */
            <iframe
              src={report.viewUrl}
              title={report.title}
              style={{ width: "100%", height: "100%", border: "none" }}
              onLoad={() => setIframeLoading(false)}
              onError={() => { setIframeError(true); setIframeLoading(false); }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
