"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar, { type NavTab } from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import CommentSection from "@/components/dashboard/CommentSection";
import KeyDataSection from "@/components/dashboard/KeyDataSection";
import BasicDataSection from "@/components/dashboard/BasicDataSection";
import SearchPanel from "@/components/search/SearchPanel";
import ReportSection from "@/components/dashboard/ReportSection";
import ChartCompareSection from "@/components/dashboard/ChartCompareSection";
import SettingsSection from "@/components/dashboard/SettingsSection";
import AdminSection from "@/components/dashboard/AdminSection";
import DateNavigator from "@/components/dashboard/DateNavigator";
import { loadSettings, applySettings } from "@/lib/settings";
import { lastBusinessDay } from "@/lib/holidays";
import type { EconomicIndicator } from "@/lib/types";

// ── 탭별 헤더 정보 ────────────────────────
const TAB_META: Record<NavTab, { title: string; subtitle: string }> = {
  comment: {
    title: "리서치",
    subtitle: "국내·국외 증권사/IB 당일 발간 리포트 및 경제지표 일정",
  },
  keydata: {
    title: "주요 데이터",
    subtitle: "핵심 경제지표 카테고리별 모니터링",
  },
  basicdata: {
    title: "기본 데이터",
    subtitle: "GDP·물가·고용·금리·환율 등 전체 경제지표 테이블",
  },
  report: {
    title: "보고용",
    subtitle: "Market Daily — 국내·해외 전 지표 일람표 (인쇄 지원)",
  },
  chart: {
    title: "차트 비교",
    subtitle: "시계열 다중 시리즈 비교 · 지수화 · 기간별 통계",
  },
  search: {
    title: "검색",
    subtitle: "네이버·Google·Yahoo Finance·FRED 등 원천 데이터 검색",
  },
  settings: {
    title: "설정",
    subtitle: "테마·글꼴·공유·자동화·알림 설정",
  },
  admin: {
    title: "관리자",
    subtitle: "데이터 검증 · 수기 조정 · 메뉴 구성 · 지표 추가·삭제",
  },
};

// DateNavigator를 표시하는 탭
const DATE_NAV_TABS: NavTab[] = ["keydata", "basicdata", "report"];

// ── 데이터 fetch 응답 타입 ─────────────────
interface MarketDataResponse {
  date: string;
  fromCache: boolean;
  krxClosed: boolean;
  nyseClosed: boolean;
  indicators: EconomicIndicator[];
  validation: { indicatorId: string; pass: boolean; issues: string[] }[];
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>("comment");
  const [date, setDate] = useState<string>(() => lastBusinessDay("foreign"));
  const [indicators, setIndicators] = useState<EconomicIndicator[] | undefined>(undefined);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [krxClosed, setKrxClosed] = useState(false);
  const [nyseClosed, setNyseClosed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── 앱 초기화: 저장된 설정 적용 ──────────
  useEffect(() => {
    const s = loadSettings();
    applySettings(s);
    if (s.defaultTab) setActiveTab(s.defaultTab as NavTab);
  }, []);

  // ── Alt+숫자 단축키 ───────────────────────
  useEffect(() => {
    const HOTKEYS: Record<string, NavTab> = {
      "1": "comment", "2": "keydata", "3": "basicdata",
      "4": "report",  "5": "chart",  "6": "search",
    };
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey && HOTKEYS[e.key]) {
        e.preventDefault();
        setActiveTab(HOTKEYS[e.key]);
      }
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        setActiveTab("settings");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── 데이터 fetch ──────────────────────────
  const fetchData = useCallback(async (targetDate: string, forceRefresh = false) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoadingData(true);
    setDataError(null);
    try {
      const params = new URLSearchParams({ date: targetDate });
      if (forceRefresh) params.set("refresh", "1");
      const res = await fetch("/api/market-data?" + params.toString(), {
        signal: abortRef.current.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "HTTP " + res.status);
      }
      const data: MarketDataResponse = await res.json();
      setIndicators(data.indicators);
      setKrxClosed(data.krxClosed);
      setNyseClosed(data.nyseClosed);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setDataError(e instanceof Error ? e.message : "데이터 로드 실패");
      setIndicators(undefined);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // ── 날짜 변경 시 re-fetch ─────────────────
  useEffect(() => {
    if (DATE_NAV_TABS.includes(activeTab)) {
      fetchData(date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, activeTab]);

  function handleDateChange(newDate: string) {
    setDate(newDate);
  }

  function handleRefresh() {
    fetchData(date, true);
  }

  const meta = TAB_META[activeTab];
  const showDateNav = DATE_NAV_TABS.includes(activeTab);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onRefresh={handleRefresh} />

      <div style={{ marginLeft: "76px", flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", maxWidth: "100vw", overflow: "hidden" }}>
        <Header title={meta.title} subtitle={meta.subtitle} />

        {showDateNav && (
          <div style={{ padding: "12px 24px 0" }}>
            <DateNavigator
              date={date}
              loading={loadingData}
              onDateChange={handleDateChange}
              onRefresh={handleRefresh}
            />
            {(krxClosed || nyseClosed) && !loadingData && (
              <div style={{ marginTop: "8px", padding: "8px 14px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "12px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {krxClosed && <span>🇰🇷 KRX 휴장일 — 국내 지표 데이터 없음</span>}
                {nyseClosed && <span>🇺🇸 NYSE 휴장일 — 미국/해외 지표 데이터 없음</span>}
              </div>
            )}
            {dataError && (
              <div style={{ marginTop: "8px", padding: "8px 14px", borderRadius: "8px", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", color: "#ca8a04", fontSize: "12px" }}>
                ⚠ API 연동 불가 ({dataError}) — 더미 데이터로 표시됩니다. API 키 설정 확인 필요.
              </div>
            )}
          </div>
        )}

        <main style={{ flex: 1, padding: "16px 24px 20px", overflowY: "auto", overflowX: "hidden" }}>
          {activeTab === "comment"   && <CommentSection date={date} />}
          {activeTab === "keydata"   && <KeyDataSection indicators={loadingData ? undefined : indicators} />}
          {activeTab === "basicdata" && <BasicDataSection indicators={loadingData ? undefined : indicators} />}
          {activeTab === "report"    && <ReportSection indicators={loadingData ? undefined : indicators} date={date} />}
          {activeTab === "chart"     && <ChartCompareSection />}
          {activeTab === "search"    && <SearchPanel />}
          {activeTab === "settings"  && <SettingsSection indicators={indicators} date={date} />}
          {activeTab === "admin"     && <AdminSection />}
        </main>

        <footer style={{ borderTop: "1px solid var(--border)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            해외매크로 대시보드 v0.2.0{indicators ? " — 실시간 데이터" : " — UI Preview (더미데이터)"}
          </span>
          <div className="flex items-center gap-4">
            {["한국은행", "FRED", "KRX", "Yahoo Finance", "통계청"].map((s) => (
              <span key={s} style={{ color: "var(--text-muted)", fontSize: "10px", opacity: 0.6 }}>{s}</span>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
