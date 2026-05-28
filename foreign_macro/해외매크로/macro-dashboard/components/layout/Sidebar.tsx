"use client";

import { useState, useEffect } from "react";
import {
  Search,
  MessageSquare,
  BarChart2,
  Database,
  Globe,
  Settings,
  RefreshCw,
  FileText,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

export type NavTab = "search" | "comment" | "keydata" | "basicdata" | "report" | "chart" | "settings" | "admin";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onRefresh?: () => void;
}

const NAV_ITEMS: { id: NavTab; icon: React.ReactNode; label: string }[] = [
  {
    id: "comment",
    icon: <MessageSquare size={20} />,
    label: "리서치",
  },
  {
    id: "keydata",
    icon: <BarChart2 size={20} />,
    label: "주요데이터",
  },
  {
    id: "basicdata",
    icon: <Database size={20} />,
    label: "기본데이터",
  },
  {
    id: "report",
    icon: <FileText size={20} />,
    label: "보고용",
  },
  {
    id: "chart",
    icon: <TrendingUp size={20} />,
    label: "차트",
  },
  {
    id: "search",
    icon: <Search size={20} />,
    label: "검색",
  },
];

// settings, admin은 항상 하단 고정 — 순서 변경 대상에서 제외
const FIXED_BOTTOM_IDS: NavTab[] = ["settings", "admin"];

export default function Sidebar({ activeTab, onTabChange, onRefresh }: SidebarProps) {
  const [navItems, setNavItems] = useState(NAV_ITEMS);

  function applyMenuConfig() {
    try {
      const raw = localStorage.getItem("macro_menu_config");
      if (!raw) {
        setNavItems(NAV_ITEMS.filter((item) => !FIXED_BOTTOM_IDS.includes(item.id)));
        return;
      }
      const config: { id: string; label: string; visible: boolean; order: number }[] = JSON.parse(raw);

      // FIXED_BOTTOM_IDS가 아닌 항목만 대상
      const configMap = new Map(config.map((c) => [c.id, c]));
      const reordered = NAV_ITEMS
        .filter((item) => !FIXED_BOTTOM_IDS.includes(item.id))
        .map((item) => {
          const cfg = configMap.get(item.id);
          return {
            ...item,
            label: cfg?.label ?? item.label,
            order: cfg?.order ?? 999,
            visible: cfg ? cfg.visible : true,
          };
        })
        .filter((item) => item.visible)
        .sort((a, b) => a.order - b.order);

      setNavItems(reordered);
    } catch {
      // localStorage 파싱 실패 시 기본값 유지
    }
  }

  // 초기 마운트 시 적용
  useEffect(() => {
    applyMenuConfig();
  }, []);

  // AdminSection에서 메뉴 저장 시 즉시 반영
  useEffect(() => {
    window.addEventListener("macro_menu_updated", applyMenuConfig);
    return () => window.removeEventListener("macro_menu_updated", applyMenuConfig);
  }, []);

  return (
    <aside
      className="flex flex-col items-center py-4 gap-1 z-10"
      style={{
        width: "76px",
        minHeight: "100vh",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      {/* 로고 */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: "rgba(59,130,246,0.15)",
          border: "1px solid rgba(59,130,246,0.3)",
        }}
      >
        <Globe size={18} color="#3b82f6" />
      </div>

      {/* 구분선 */}
      <div
        className="w-8 mb-3"
        style={{ height: "1px", background: "var(--border)" }}
      />

      {/* 네비게이션 아이템 */}
      <nav className="flex flex-col gap-1 flex-1 w-full px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`sidebar-item w-full${activeTab === item.id ? " active" : ""}`}
            title={item.label}
          >
            {item.icon}
            <span className="sidebar-label" style={{ fontSize: "9px", whiteSpace: "nowrap" }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* 하단 액션 */}
      <div className="flex flex-col gap-1 w-full px-2">
        {/* 새로고침 */}
        <button
          onClick={onRefresh}
          className="sidebar-item w-full"
          title="데이터 갱신"
        >
          <RefreshCw size={18} />
          <span className="sidebar-label" style={{ fontSize: "9px", whiteSpace: "nowrap" }}>갱신</span>
        </button>

        {/* 구분선 */}
        <div style={{ height: "1px", background: "var(--border)", margin: "2px 4px" }} />

        {/* 설정 */}
        <button
          onClick={() => onTabChange("settings")}
          className={`sidebar-item w-full${activeTab === "settings" ? " active" : ""}`}
          title="설정"
        >
          <Settings size={18} />
          <span className="sidebar-label" style={{ fontSize: "9px", whiteSpace: "nowrap" }}>설정</span>
        </button>

        {/* 관리자 */}
        <button
          onClick={() => onTabChange("admin")}
          className={`sidebar-item w-full${activeTab === "admin" ? " active" : ""}`}
          title="관리자"
          style={{ color: activeTab === "admin" ? "#ef4444" : undefined }}
        >
          <ShieldCheck size={18} color={activeTab === "admin" ? "#ef4444" : undefined} />
          <span className="sidebar-label" style={{ fontSize: "9px", whiteSpace: "nowrap" }}>관리자</span>
        </button>
      </div>
    </aside>
  );
}
