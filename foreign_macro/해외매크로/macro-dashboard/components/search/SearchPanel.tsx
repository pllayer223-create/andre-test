"use client";

import { useState } from "react";
import { Search, ExternalLink, Globe, TrendingUp } from "lucide-react";

// ── 검색 엔진 설정 ────────────────────────────
const SEARCH_ENGINES = [
  {
    id: "naver",
    name: "네이버 금융",
    color: "#03C75A",
    bgColor: "rgba(3,199,90,0.1)",
    borderColor: "rgba(3,199,90,0.2)",
    buildUrl: (q: string) => `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(q + " 금융")}`,
    icon: "N",
  },
  {
    id: "google",
    name: "Google",
    color: "#4285F4",
    bgColor: "rgba(66,133,244,0.1)",
    borderColor: "rgba(66,133,244,0.2)",
    buildUrl: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q + " 경제지표")}`,
    icon: "G",
  },
  {
    id: "yahoo",
    name: "Yahoo Finance",
    color: "#6001D2",
    bgColor: "rgba(96,1,210,0.1)",
    borderColor: "rgba(96,1,210,0.2)",
    buildUrl: (q: string) => `https://finance.yahoo.com/search?p=${encodeURIComponent(q)}`,
    icon: "Y",
  },
  {
    id: "fred",
    name: "FRED",
    color: "#e14b2a",
    bgColor: "rgba(225,75,42,0.1)",
    borderColor: "rgba(225,75,42,0.2)",
    buildUrl: (q: string) => `https://fred.stlouisfed.org/search?st=${encodeURIComponent(q)}`,
    icon: "F",
  },
  {
    id: "investing",
    name: "Investing.com",
    color: "#ff8c00",
    bgColor: "rgba(255,140,0,0.1)",
    borderColor: "rgba(255,140,0,0.2)",
    buildUrl: (q: string) => `https://www.investing.com/search/?q=${encodeURIComponent(q)}`,
    icon: "I",
  },
  {
    id: "bok",
    name: "한국은행",
    color: "#0066cc",
    bgColor: "rgba(0,102,204,0.1)",
    borderColor: "rgba(0,102,204,0.2)",
    buildUrl: (q: string) => `https://www.bok.or.kr/portal/singl/publicStat/publicStatMain.do?searchQuery=${encodeURIComponent(q)}`,
    icon: "B",
  },
];

// ── 빠른 검색 키워드 ──────────────────────────
const QUICK_KEYWORDS = [
  "Fed 금리",
  "미국 CPI",
  "한국 기준금리",
  "KOSPI",
  "원달러 환율",
  "WTI 유가",
  "미국채 10년",
  "중국 GDP",
  "VIX",
  "달러 인덱스",
  "PCE 물가",
  "비농업 고용",
  "한국 수출",
  "가계부채",
  "양적완화",
];

// ── 주요 데이터 소스 링크 ─────────────────────
const DATA_SOURCES = [
  { name: "FRED (미 연준)", url: "https://fred.stlouisfed.org", desc: "미국 거시경제 지표 원천" },
  { name: "한국은행 경제통계", url: "https://ecos.bok.or.kr", desc: "한국 공식 경제 데이터" },
  { name: "KRX 정보데이터시스템", url: "https://data.krx.co.kr", desc: "국내 주식·채권 시장 데이터" },
  { name: "통계청 KOSIS", url: "https://kosis.kr", desc: "한국 통계 포털" },
  { name: "Investing.com", url: "https://www.investing.com", desc: "글로벌 금융 시장 데이터" },
  { name: "Yahoo Finance", url: "https://finance.yahoo.com", desc: "미국 주식·ETF·선물 데이터" },
  { name: "Naver 증권", url: "https://finance.naver.com", desc: "국내 증권·리서치 정보" },
  { name: "Trading Economics", url: "https://tradingeconomics.com", desc: "국가별 거시지표 비교" },
];

export default function SearchPanel() {
  const [query, setQuery] = useState("");
  const [selectedEngines, setSelectedEngines] = useState<string[]>(["naver", "google", "yahoo"]);

  const toggleEngine = (id: string) => {
    setSelectedEngines((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const activeEngines = SEARCH_ENGINES.filter((e) => selectedEngines.includes(e.id));
    activeEngines.forEach((engine) => {
      window.open(engine.buildUrl(query), "_blank", "noopener,noreferrer");
    });
  };

  const handleQuickSearch = (keyword: string) => {
    setQuery(keyword);
    const activeEngines = SEARCH_ENGINES.filter((e) => selectedEngines.includes(e.id));
    activeEngines.forEach((engine) => {
      window.open(engine.buildUrl(keyword), "_blank", "noopener,noreferrer");
    });
  };

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: "860px" }}>
      {/* 검색창 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Search size={14} color="#60a5fa" />
          <span className="font-semibold" style={{ color: "var(--text-primary)", fontSize: "14px" }}>
            경제지표 검색
          </span>
        </div>

        <form onSubmit={handleSearch} className="relative mb-3">
          <Search
            size={16}
            color="#64748b"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="경제 지표, 이벤트, 데이터를 검색하세요..."
            className="search-input"
          />
        </form>

        {/* 검색 엔진 선택 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SEARCH_ENGINES.map((engine) => (
            <button
              key={engine.id}
              onClick={() => toggleEngine(engine.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: selectedEngines.includes(engine.id) ? engine.bgColor : "rgba(255,255,255,0.04)",
                border: `1px solid ${selectedEngines.includes(engine.id) ? engine.borderColor : "var(--border)"}`,
                color: selectedEngines.includes(engine.id) ? engine.color : "var(--text-muted)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <span
                className="w-4 h-4 rounded flex items-center justify-center text-white font-bold"
                style={{
                  background: selectedEngines.includes(engine.id) ? engine.color : "#374151",
                  fontSize: "9px",
                }}
              >
                {engine.icon}
              </span>
              {engine.name}
            </button>
          ))}
        </div>

        {/* 검색 버튼 */}
        <button
          onClick={handleSearch}
          className="px-6 py-2.5 rounded-xl font-semibold transition-all"
          style={{
            background: "rgba(59,130,246,0.2)",
            border: "1px solid rgba(59,130,246,0.35)",
            color: "#60a5fa",
            fontSize: "13px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.2)";
          }}
        >
          선택한 {selectedEngines.length}개 엔진에서 검색
        </button>
      </div>

      {/* 빠른 검색 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} color="#22c55e" />
          <span className="font-semibold" style={{ color: "var(--text-primary)", fontSize: "14px" }}>
            빠른 검색
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => handleQuickSearch(kw)}
              className="px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.1)";
                (e.currentTarget as HTMLButtonElement).style.color = "#60a5fa";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(59,130,246,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              }}
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* 주요 데이터 소스 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={14} color="#a78bfa" />
          <span className="font-semibold" style={{ color: "var(--text-primary)", fontSize: "14px" }}>
            주요 데이터 소스
          </span>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {DATA_SOURCES.map((src) => (
            <a
              key={src.name}
              href={src.url}
              target="_blank"
              rel="noreferrer"
              className="card p-3 flex items-start gap-3 group"
              style={{ textDecoration: "none" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(59,130,246,0.1)" }}
              >
                <Globe size={14} color="#60a5fa" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-medium group-hover:text-blue-400 transition-colors"
                  style={{ color: "var(--text-primary)", fontSize: "12px" }}
                >
                  {src.name}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  {src.desc}
                </p>
              </div>
              <ExternalLink
                size={12}
                color="#64748b"
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ marginTop: "2px" }}
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
