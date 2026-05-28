"use client";

import { Calendar, Wifi } from "lucide-react";
import { TODAY } from "@/lib/dummy-data";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const formattedDate = new Date(TODAY).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <header
      className="flex items-center justify-between px-6 py-4"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        minHeight: "60px",
      }}
    >
      {/* 타이틀 */}
      <div>
        <h1
          className="font-semibold"
          style={{ color: "var(--text-primary)", fontSize: "16px" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* 우측 정보 */}
      <div className="flex items-center gap-4">
        {/* 라이브 표시 */}
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
            DUMMY DATA
          </span>
        </div>

        {/* 구분선 */}
        <div
          style={{ width: "1px", height: "20px", background: "var(--border)" }}
        />

        {/* 날짜 */}
        <div className="flex items-center gap-1.5">
          <Calendar size={13} color="#64748b" />
          <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
            {formattedDate}
          </span>
        </div>

        {/* 연결 상태 */}
        <div className="flex items-center gap-1.5">
          <Wifi size={13} color="#22c55e" />
          <span style={{ color: "#22c55e", fontSize: "12px" }}>연결됨</span>
        </div>
      </div>
    </header>
  );
}
