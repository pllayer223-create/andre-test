"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sun, Moon, Monitor, Type, AlignJustify,
  Mail, Send, RefreshCw, Bell,
  LayoutDashboard, BarChart2, Download, MessageSquare,
  CheckCircle2, Save, RotateCcw, Plus, Trash2,
  ChevronDown, Shield,
} from "lucide-react";
import {
  loadSettings, saveSettings, applySettings,
  DEFAULT_SETTINGS,
  type AppSettings, type ThemeMode, type FontFamily,
  type FontSize, type DefaultTab, type AlertRule,
} from "@/lib/settings";
import { domesticIndicators, foreignIndicators } from "@/lib/dummy-data";
import type { EconomicIndicator } from "@/lib/types";

// ── 유틸 ──────────────────────────────────────
// AlertRuleRow 드롭다운용 전체 지표 목록 (더미 기반 — 선택 가능 목록)
const DUMMY_INDICATORS = [...domesticIndicators, ...foreignIndicators];
const DUMMY_IND_MAP = Object.fromEntries(DUMMY_INDICATORS.map((i) => [i.id, i]));

// ── 작은 토글 스위치 ──────────────────────────
function Toggle({
  checked, onChange,
}: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

// ── 세그먼트 버튼 그룹 ────────────────────────
function SegmentGroup<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{
      display: "flex",
      gap: "4px",
      background: "rgba(0,0,0,0.2)",
      borderRadius: "9px",
      padding: "3px",
    }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "5px 12px",
            borderRadius: "7px",
            border: "none",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: value === o.value ? 700 : 400,
            background: value === o.value ? "rgba(59,130,246,0.25)" : "transparent",
            color: value === o.value ? "#60a5fa" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── 섹션 카드 래퍼 ────────────────────────────
function SCard({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="settings-card">
      <div className="settings-card-title">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

// ── 설정 행 ───────────────────────────────────
function SRow({
  label, desc, children,
}: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <div>
        <div className="settings-label">{label}</div>
        {desc && <div className="settings-desc">{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── 알림 규칙 한 행 ───────────────────────────
function AlertRuleRow({
  rule, onChange, onDelete,
}: {
  rule: AlertRule;
  onChange: (r: AlertRule) => void;
  onDelete: () => void;
}) {
  const ind = DUMMY_IND_MAP[rule.indicatorId];
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 0",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      flexWrap: "wrap",
    }}>
      <Toggle checked={rule.enabled} onChange={(v) => onChange({ ...rule, enabled: v })} />

      <select
        value={rule.indicatorId}
        onChange={(e) => onChange({ ...rule, indicatorId: e.target.value })}
        style={{
          flex: 1, minWidth: "120px",
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
          borderRadius: "6px", padding: "5px 8px",
          color: "var(--text-primary)", fontSize: "11px", outline: "none",
        }}
      >
        <option value="">지표 선택</option>
        {DUMMY_INDICATORS.map((i) => (
          <option key={i.id} value={i.id}>{i.nameKo} ({i.unit})</option>
        ))}
      </select>

      <select
        value={rule.condition}
        onChange={(e) => onChange({ ...rule, condition: e.target.value as "above" | "below" })}
        style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
          borderRadius: "6px", padding: "5px 8px",
          color: "var(--text-primary)", fontSize: "11px", outline: "none",
          width: "64px",
        }}
      >
        <option value="above">↑ 초과</option>
        <option value="below">↓ 하회</option>
      </select>

      <input
        type="number"
        value={rule.threshold}
        onChange={(e) => onChange({ ...rule, threshold: parseFloat(e.target.value) || 0 })}
        placeholder="기준값"
        style={{
          width: "72px",
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
          borderRadius: "6px", padding: "5px 8px",
          color: "var(--text-primary)", fontSize: "11px", outline: "none",
          textAlign: "right",
        }}
      />
      {ind && (
        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{ind.unit}</span>
      )}

      <button
        onClick={onDelete}
        style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "6px", padding: "5px 7px", cursor: "pointer", color: "#ef4444",
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────
interface SettingsSectionProps {
  indicators?: EconomicIndicator[];
  date?: string;
}

export default function SettingsSection({ indicators, date }: SettingsSectionProps) {
  // 실데이터가 있으면 사용, 없으면 더미 폴백
  const activeIndicators = indicators ?? DUMMY_INDICATORS;
  const IND_MAP = Object.fromEntries(activeIndicators.map((i) => [i.id, i]));
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  // 마운트 시 저장된 설정 로드 & 즉시 적용
  useEffect(() => {
    const loaded = loadSettings();
    setS(loaded);
    applySettings(loaded);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      applySettings(next);
      return next;
    });
    setSaved(false);
  }, []);

  function handleSave() {
    saveSettings(s);
    applySettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    if (!confirm("모든 설정을 초기값으로 되돌리시겠습니까?")) return;
    setS(DEFAULT_SETTINGS);
    applySettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ── 공유 헬퍼 ──────────────────────────────
  function buildMarketSummary(): string {
    const displayDate = date
      ? (() => {
          const [y, m, d2] = date.split("-").map(Number);
          return new Date(y, m - 1, d2).toLocaleDateString("ko-KR");
        })()
      : new Date().toLocaleDateString("ko-KR");

    const lines = [`📊 Market Daily Summary — ${displayDate}\n`];

    // 주요 지표 우선 표시, 없으면 첫 10개
    const PRIORITY_IDS = ["kospi", "usdkrw", "ktb-3y", "us-t10y", "dxy", "wti", "gold", "sp500", "nasdaq", "vix"];
    const prioritized = PRIORITY_IDS.map((id) => IND_MAP[id]).filter(Boolean);
    const extras = activeIndicators.filter((i) => !PRIORITY_IDS.includes(i.id)).slice(0, Math.max(0, 10 - prioritized.length));
    const toShow = [...prioritized, ...extras];

    toShow.forEach((ind) => {
      if (!ind) return;
      const sign = ind.changePct >= 0 ? "▲" : "▼";
      lines.push(`${ind.nameKo}: ${ind.currentValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} ${ind.unit}  ${sign}${Math.abs(ind.changePct).toFixed(2)}%`);
    });

    const src = indicators ? "실시간 데이터" : "더미 데이터 (API 미연결)";
    lines.push(`\n출처: ${src}`);
    return lines.join("\n");
  }

  function handleSendEmail() {
    const body = encodeURIComponent(buildMarketSummary());
    const displayDate = date ?? new Date().toLocaleDateString("ko-KR");
    const subject = encodeURIComponent(`Market Daily — ${displayDate}`);
    const to = encodeURIComponent(s.emailAddress);
    window.open(`mailto:${to}?subject=${subject}&body=${body}`);
    setShareStatus("이메일 앱을 열었습니다.");
    setTimeout(() => setShareStatus(null), 3000);
  }

  function handleSendTelegram() {
    if (!s.telegramBotToken || !s.telegramChatId) {
      setShareStatus("텔레그램 Bot Token과 Chat ID를 먼저 입력하세요.");
      setTimeout(() => setShareStatus(null), 3500);
      return;
    }
    const text = encodeURIComponent(buildMarketSummary());
    const url = `https://api.telegram.org/bot${s.telegramBotToken}/sendMessage?chat_id=${s.telegramChatId}&text=${text}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setShareStatus(d.ok ? "텔레그램 전송 완료!" : `전송 실패: ${d.description}`);
      })
      .catch(() => setShareStatus("전송 중 오류가 발생했습니다."))
      .finally(() => setTimeout(() => setShareStatus(null), 4000));
  }

  function handleCopyClipboard() {
    navigator.clipboard.writeText(buildMarketSummary()).then(() => {
      setShareStatus("클립보드에 복사되었습니다.");
      setTimeout(() => setShareStatus(null), 2500);
    });
  }

  function handleExportCSV() {
    const rows = [["지표명", "현재값", "단위", "전일비", "등락률(%)", "갱신일"]];
    activeIndicators.forEach((ind) => {
      rows.push([
        ind.nameKo, String(ind.currentValue), ind.unit,
        String(ind.changeAbs), String(ind.changePct), ind.updatedAt,
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `market_data_${date ?? new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShareStatus("CSV 파일이 다운로드됩니다.");
    setTimeout(() => setShareStatus(null), 2500);
  }

  function handleFeedbackSubmit() {
    if (!feedback.trim()) return;
    // 실제 발송 대신 이메일 앱으로 전달
    const subject = encodeURIComponent("[해외매크로 대시보드] 사용자 의견");
    const body = encodeURIComponent(feedback);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setFeedbackSent(true);
    setFeedback("");
    setTimeout(() => setFeedbackSent(false), 3500);
  }

  // ── 알림 규칙 관리 ─────────────────────────
  function addAlertRule() {
    const newRule: AlertRule = {
      id: Date.now().toString(),
      indicatorId: "",
      condition: "above",
      threshold: 0,
      enabled: true,
    };
    update({ alertRules: [...s.alertRules, newRule] });
  }

  function updateAlertRule(index: number, rule: AlertRule) {
    const rules = [...s.alertRules];
    rules[index] = rule;
    update({ alertRules: rules });
  }

  function deleteAlertRule(index: number) {
    update({ alertRules: s.alertRules.filter((_, i) => i !== index) });
  }

  // ── 렌더 ───────────────────────────────────
  return (
    <div style={{ maxWidth: "800px" }}>

      {/* ── 헤더 ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "20px", flexWrap: "wrap", gap: "10px",
      }}>
        <div>
          <h2 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700 }}>
            설정
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "2px" }}>
            변경사항은 저장 버튼을 눌러야 영구 적용됩니다 (미저장 시 새로고침 후 초기화)
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleReset}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "7px 14px", borderRadius: "8px", cursor: "pointer",
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
              color: "var(--text-muted)", fontSize: "12px",
            }}
          >
            <RotateCcw size={13} /> 초기화
          </button>
          <button
            onClick={handleSave}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "7px 16px", borderRadius: "8px", cursor: "pointer",
              background: saved ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
              border: `1px solid ${saved ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)"}`,
              color: saved ? "#22c55e" : "#60a5fa", fontSize: "12px", fontWeight: 700,
            }}
          >
            {saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
            {saved ? "저장됨" : "저장"}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          1. 외관 (Appearance)
      ══════════════════════════════════════ */}
      <SCard icon={<Sun size={15} color="#fbbf24" />} title="외관 (Appearance)">

        <SRow label="밝기 / 테마" desc="다크·딤·라이트 모드">
          <SegmentGroup<ThemeMode>
            value={s.theme}
            onChange={(v) => update({ theme: v })}
            options={[
              { value: "dark",  label: "다크",  icon: <Moon size={11} /> },
              { value: "dim",   label: "딤",    icon: <Monitor size={11} /> },
              { value: "light", label: "라이트", icon: <Sun size={11} /> },
            ]}
          />
        </SRow>

        <SRow label="글꼴" desc="전체 UI에 적용">
          <SegmentGroup<FontFamily>
            value={s.font}
            onChange={(v) => update({ font: v })}
            options={[
              { value: "pretendard", label: "Pretendard" },
              { value: "noto",       label: "Noto Sans KR" },
              { value: "system",     label: "시스템" },
              { value: "mono",       label: "D2Coding" },
            ]}
          />
        </SRow>

        <SRow label="글자 크기" desc="기준 font-size (html)">
          <SegmentGroup<FontSize>
            value={s.fontSize}
            onChange={(v) => update({ fontSize: v })}
            options={[
              { value: "sm", label: "소 (12px)" },
              { value: "md", label: "중 (14px)" },
              { value: "lg", label: "대 (16px)" },
            ]}
          />
        </SRow>

      </SCard>

      {/* ══════════════════════════════════════
          2. 대시보드 기본값
      ══════════════════════════════════════ */}
      <SCard icon={<LayoutDashboard size={15} color="#60a5fa" />} title="대시보드 기본값">

        <SRow label="시작 탭" desc="앱 로딩 시 기본으로 보여줄 탭">
          <SegmentGroup<DefaultTab>
            value={s.defaultTab}
            onChange={(v) => update({ defaultTab: v })}
            options={[
              { value: "comment",   label: "리서치" },
              { value: "keydata",   label: "주요데이터" },
              { value: "basicdata", label: "기본데이터" },
              { value: "report",    label: "보고용" },
              { value: "chart",     label: "차트" },
            ]}
          />
        </SRow>

        <SRow label="차트 기본 기간" desc="차트 탭 초기 표시 기간">
          <select
            value={s.chartDefaultRange}
            onChange={(e) => update({ chartDefaultRange: Number(e.target.value) })}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              borderRadius: "7px", padding: "6px 28px 6px 10px",
              color: "var(--text-primary)", fontSize: "12px", outline: "none",
              cursor: "pointer", appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
              backgroundSize: "10px",
            }}
          >
            {[1, 3, 6, 12, 36].map((m) => (
              <option key={m} value={m}>{m < 12 ? `${m}개월` : `${m / 12}년`}</option>
            ))}
          </select>
        </SRow>

        <SRow label="차트 기본 모드" desc="절대값 vs 지수화(100)">
          <SegmentGroup<"absolute" | "normalize">
            value={s.chartDefaultMode}
            onChange={(v) => update({ chartDefaultMode: v })}
            options={[
              { value: "absolute",  label: "절대값", icon: <BarChart2 size={11} /> },
              { value: "normalize", label: "지수화 (100)" },
            ]}
          />
        </SRow>

      </SCard>

      {/* ══════════════════════════════════════
          3. 공유 · 알림 채널
      ══════════════════════════════════════ */}
      <SCard icon={<Send size={15} color="#34d399" />} title="공유 · 전송 채널">

        {/* 상태 메시지 */}
        {shareStatus && (
          <div style={{
            marginBottom: "12px", padding: "9px 14px",
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: "8px", color: "#22c55e", fontSize: "12px",
            display: "flex", alignItems: "center", gap: "7px",
          }}>
            <CheckCircle2 size={13} />
            {shareStatus}
          </div>
        )}

        {/* 이메일 */}
        <div style={{ paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Mail size={14} color="#60a5fa" />
            <span style={{ color: "var(--text-primary)", fontSize: "12px", fontWeight: 600 }}>이메일</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="email"
              className="settings-input"
              placeholder="수신 이메일 주소"
              value={s.emailAddress}
              onChange={(e) => update({ emailAddress: e.target.value })}
            />
            <button
              onClick={handleSendEmail}
              style={{
                padding: "6px 14px", borderRadius: "7px", cursor: "pointer",
                background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
                color: "#60a5fa", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap",
              }}
            >
              보내기
            </button>
          </div>
        </div>

        {/* 텔레그램 */}
        <div style={{ paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Send size={14} color="#38bdf8" />
            <span style={{ color: "var(--text-primary)", fontSize: "12px", fontWeight: 600 }}>텔레그램</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <input
              className="settings-input"
              placeholder="Bot Token (예: 123456789:AAF…)"
              value={s.telegramBotToken}
              onChange={(e) => update({ telegramBotToken: e.target.value })}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                className="settings-input"
                placeholder="Chat ID (예: -100123456789)"
                value={s.telegramChatId}
                onChange={(e) => update({ telegramChatId: e.target.value })}
              />
              <button
                onClick={handleSendTelegram}
                style={{
                  padding: "6px 14px", borderRadius: "7px", cursor: "pointer",
                  background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)",
                  color: "#38bdf8", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap",
                }}
              >
                전송
              </button>
            </div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "6px" }}>
            BotFather에서 봇 생성 후 Token 발급. Chat ID는 @userinfobot으로 확인.
          </p>
        </div>

        {/* 클립보드 복사 */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <AlignJustify size={14} color="#94a3b8" />
            <span style={{ color: "var(--text-primary)", fontSize: "12px", fontWeight: 600 }}>클립보드 복사</span>
          </div>
          <button
            onClick={handleCopyClipboard}
            style={{
              padding: "6px 14px", borderRadius: "7px", cursor: "pointer",
              background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)",
              color: "#94a3b8", fontSize: "12px", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <AlignJustify size={12} />
            시장 요약 복사
          </button>
        </div>

      </SCard>

      {/* ══════════════════════════════════════
          4. 자동화
      ══════════════════════════════════════ */}
      <SCard icon={<RefreshCw size={15} color="#c084fc" />} title="자동화 (Automation)">

        <SRow label="자동 새로고침" desc="지정 간격마다 페이지 데이터를 다시 불러옴">
          <SegmentGroup<string>
            value={String(s.autoRefreshMin)}
            onChange={(v) => update({ autoRefreshMin: Number(v) })}
            options={[
              { value: "0",  label: "끄기" },
              { value: "5",  label: "5분" },
              { value: "10", label: "10분" },
              { value: "30", label: "30분" },
              { value: "60", label: "1시간" },
            ]}
          />
        </SRow>

        <SRow label="일일 리포트 발송" desc="매일 지정 시각에 Market Daily를 전송 채널로 발송">
          <Toggle checked={s.reportEnabled} onChange={(v) => update({ reportEnabled: v })} />
        </SRow>

        {s.reportEnabled && (
          <>
            <SRow label="발송 시각">
              <input
                type="time"
                value={s.reportTime}
                onChange={(e) => update({ reportTime: e.target.value })}
                className="settings-input"
                style={{ width: "100px" }}
              />
            </SRow>
            <SRow label="발송 채널">
              <div style={{ display: "flex", gap: "10px" }}>
                {(["email", "telegram"] as const).map((ch) => (
                  <label key={ch} style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    cursor: "pointer", color: "var(--text-secondary)", fontSize: "12px",
                  }}>
                    <input
                      type="checkbox"
                      checked={s.reportChannels.includes(ch)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...s.reportChannels, ch]
                          : s.reportChannels.filter((c) => c !== ch);
                        update({ reportChannels: next });
                      }}
                      style={{ accentColor: "var(--accent-blue)" }}
                    />
                    {ch === "email" ? "이메일" : "텔레그램"}
                  </label>
                ))}
              </div>
            </SRow>
          </>
        )}

        <div style={{ padding: "8px 0" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "10px" }}>
            * 일일 발송 기능은 브라우저가 열려 있을 때만 동작합니다.
              안정적인 발송을 위해선 서버 측 스케줄러 연동(추후 지원)이 권장됩니다.
          </p>
        </div>

      </SCard>

      {/* ══════════════════════════════════════
          5. 알림 임계값
      ══════════════════════════════════════ */}
      <SCard icon={<Bell size={15} color="#fbbf24" />} title="알림 임계값 (Alert Rules)">

        <p style={{ color: "var(--text-muted)", fontSize: "11px", marginBottom: "10px" }}>
          지표가 설정한 기준값을 초과/하회하면 브라우저 알림을 표시합니다.
          (브라우저 알림 권한 필요)
        </p>

        {s.alertRules.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "11px", textAlign: "center", padding: "12px 0" }}>
            등록된 알림 규칙이 없습니다.
          </p>
        )}

        {s.alertRules.map((rule, i) => (
          <AlertRuleRow
            key={rule.id}
            rule={rule}
            onChange={(r) => updateAlertRule(i, r)}
            onDelete={() => deleteAlertRule(i)}
          />
        ))}

        <button
          onClick={addAlertRule}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "7px 14px", borderRadius: "7px", cursor: "pointer",
            background: "rgba(59,130,246,0.1)", border: "1px dashed rgba(59,130,246,0.3)",
            color: "#60a5fa", fontSize: "11px", marginTop: "10px",
          }}
        >
          <Plus size={12} />
          알림 규칙 추가
        </button>

      </SCard>

      {/* ══════════════════════════════════════
          6. 데이터 내보내기
      ══════════════════════════════════════ */}
      <SCard icon={<Download size={15} color="#4ade80" />} title="데이터 내보내기 (Export)">

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 18px", borderRadius: "8px", cursor: "pointer",
              background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)",
              color: "#4ade80", fontSize: "12px", fontWeight: 600,
            }}
          >
            <Download size={13} />
            전체 지표 CSV 다운로드
          </button>

          <button
            onClick={handleCopyClipboard}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 18px", borderRadius: "8px", cursor: "pointer",
              background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)",
              color: "#94a3b8", fontSize: "12px", fontWeight: 600,
            }}
          >
            <AlignJustify size={13} />
            시장 요약 텍스트 복사
          </button>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "10px" }}>
          CSV는 BOM(UTF-8) 포함이므로 Excel에서 바로 열 수 있습니다.
          시계열 CSV 내보내기는 추후 지원 예정입니다.
        </p>

      </SCard>

      {/* ══════════════════════════════════════
          7. 단축키 도움말
      ══════════════════════════════════════ */}
      <SCard icon={<Type size={15} color="#f472b6" />} title="단축키 도움말">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "6px",
        }}>
          {[
            ["Alt + 1", "코멘트 탭"],
            ["Alt + 2", "주요데이터 탭"],
            ["Alt + 3", "기본데이터 탭"],
            ["Alt + 4", "보고용 탭"],
            ["Alt + 5", "차트 탭"],
            ["Alt + 6", "검색 탭"],
            ["Ctrl + P", "인쇄 (보고용 탭)"],
            ["Ctrl + ,", "설정 탭"],
          ].map(([key, desc]) => (
            <div key={key} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(255,255,255,0.03)", borderRadius: "6px",
              padding: "7px 10px", gap: "8px",
            }}>
              <kbd style={{
                fontFamily: "monospace", fontSize: "10px",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "4px", padding: "2px 7px", color: "var(--text-primary)",
                whiteSpace: "nowrap",
              }}>{key}</kbd>
              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{desc}</span>
            </div>
          ))}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "10px" }}>
          * 단축키는 대시보드 페이지에서만 동작합니다. (구현은 page.tsx에서 keydown 이벤트 연결 필요)
        </p>
      </SCard>

      {/* ══════════════════════════════════════
          8. 의견 보내기
      ══════════════════════════════════════ */}
      <SCard icon={<MessageSquare size={15} color="#f87171" />} title="의견 보내기 (Feedback)">

        {feedbackSent ? (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            color: "#22c55e", fontSize: "13px", padding: "12px 0",
          }}>
            <CheckCircle2 size={16} />
            의견을 보내주셔서 감사합니다. 이메일 앱이 열렸습니다.
          </div>
        ) : (
          <>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="개선 요청, 버그 신고, 새 기능 제안 등 자유롭게 작성해 주세요."
              rows={4}
              className="settings-input"
              style={{ resize: "vertical", marginBottom: "10px", lineHeight: 1.6 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleFeedbackSubmit}
                disabled={!feedback.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "8px 18px", borderRadius: "8px", cursor: feedback.trim() ? "pointer" : "not-allowed",
                  background: feedback.trim() ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${feedback.trim() ? "rgba(248,113,113,0.3)" : "var(--border)"}`,
                  color: feedback.trim() ? "#f87171" : "var(--text-muted)",
                  fontSize: "12px", fontWeight: 600, opacity: feedback.trim() ? 1 : 0.5,
                }}
              >
                <Send size={12} />
                의견 보내기
              </button>
            </div>
          </>
        )}

      </SCard>

      {/* 하단 버전 정보 */}
      <div style={{
        textAlign: "center", padding: "16px 0 8px",
        color: "var(--text-muted)", fontSize: "10px",
      }}>
        해외매크로 대시보드 v0.1.0 — 더미데이터 Preview
      </div>

    </div>
  );
}
