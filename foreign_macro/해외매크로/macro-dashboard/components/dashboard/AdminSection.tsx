"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ShieldCheck, CheckCircle2, AlertTriangle, XCircle,
  Edit3, Save, RotateCcw, Plus, Trash2, Search,
  LayoutGrid, Database, Eye, EyeOff, ChevronDown,
} from "lucide-react";
import {
  domesticIndicators, foreignIndicators,
  CATEGORY_ORDER,
} from "@/lib/dummy-data";
import type { EconomicIndicator } from "@/lib/types";

// ── 탭 타입 ───────────────────────────────────
type AdminTab = "validate" | "edit" | "menu" | "manage";

// ── 검증 로직 ─────────────────────────────────
interface ValidationResult {
  id: string;
  nameKo: string;
  issues: string[];
  level: "ok" | "warn" | "error";
}

function runValidation(list: EconomicIndicator[]): ValidationResult[] {
  const today = new Date().toISOString().slice(0, 10);
  return list.map((ind) => {
    const issues: string[] = [];
    if (ind.currentValue < 0)
      issues.push("currentValue 음수");
    if (Math.abs(ind.changePct) > 50)
      issues.push(`등락률 이상값 (${ind.changePct.toFixed(1)}%)`);
    if (!ind.timeSeries || ind.timeSeries.length === 0)
      issues.push("시계열 데이터 없음");
    else if (ind.timeSeries.length < 10)
      issues.push(`시계열 데이터 부족 (${ind.timeSeries.length}개)`);
    if (!ind.updatedAt)
      issues.push("갱신일 없음");
    else {
      const daysOld = Math.floor(
        (new Date(today).getTime() - new Date(ind.updatedAt).getTime()) / 86400000
      );
      const limit = ind.frequency === "daily" ? 5 : ind.frequency === "monthly" ? 45 : 100;
      if (daysOld > limit) issues.push(`갱신 지연 (${daysOld}일 전)`);
    }
    if (ind.currentValue === ind.previousValue && ind.currentValue !== 0)
      issues.push("현재값 = 이전값 (미갱신 의심)");

    const level: "ok" | "warn" | "error" =
      issues.some((s) => s.includes("없음") || s.includes("음수")) ? "error" :
      issues.length > 0 ? "warn" : "ok";

    return { id: ind.id, nameKo: ind.nameKo, issues, level };
  });
}

const LEVEL_COLOR = { ok: "#22c55e", warn: "#fbbf24", error: "#ef4444" } as const;
const LEVEL_ICON = {
  ok:    <CheckCircle2 size={13} color="#22c55e" />,
  warn:  <AlertTriangle size={13} color="#fbbf24" />,
  error: <XCircle size={13} color="#ef4444" />,
};

// ── 공통 컴포넌트 ─────────────────────────────
function ACard({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "12px", padding: "20px",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        color: "var(--text-primary)", fontSize: "13px", fontWeight: 700,
        marginBottom: "16px", paddingBottom: "10px",
        borderBottom: "1px solid var(--border)",
      }}>
        {icon}{title}
      </div>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════
// 패널 1: 데이터 검증
// ══════════════════════════════════════════════
function ValidatePanel({ indicators }: { indicators: EconomicIndicator[] }) {
  const [filter, setFilter] = useState<"all" | "warn" | "error">("all");

  // indicators 변경 시마다 재검증
  const results = useMemo(() => runValidation(indicators), [indicators]);

  const counts = useMemo(() => ({
    ok:    results.filter((r) => r.level === "ok").length,
    warn:  results.filter((r) => r.level === "warn").length,
    error: results.filter((r) => r.level === "error").length,
  }), [results]);

  const shown = filter === "all" ? results
    : results.filter((r) => r.level === filter);

  return (
    <>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        {(["ok", "warn", "error"] as const).map((lv) => (
          <button key={lv}
            onClick={() => setFilter(lv === "ok" ? "all" : lv)}
            style={{
              flex: 1, minWidth: "100px", padding: "12px", borderRadius: "10px",
              cursor: "pointer", textAlign: "center", transition: "all 0.15s",
              background: filter === (lv === "ok" ? "all" : lv)
                ? `${LEVEL_COLOR[lv]}1a` : "rgba(255,255,255,0.03)",
              border: `1px solid ${filter === (lv === "ok" ? "all" : lv)
                ? LEVEL_COLOR[lv] + "55" : "var(--border)"}`,
            }}
          >
            <div style={{ color: LEVEL_COLOR[lv], fontSize: "22px", fontWeight: 800 }}>{counts[lv]}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "2px" }}>
              {lv === "ok" ? "정상" : lv === "warn" ? "경고" : "오류"}
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "440px", overflowY: "auto" }}>
        {shown.map((r) => (
          <div key={r.id} style={{
            display: "flex", alignItems: "flex-start", gap: "10px",
            padding: "9px 12px", borderRadius: "8px",
            background: r.level === "ok" ? "rgba(34,197,94,0.05)"
              : r.level === "warn" ? "rgba(251,191,36,0.05)" : "rgba(239,68,68,0.07)",
            border: `1px solid ${LEVEL_COLOR[r.level]}22`,
          }}>
            <span style={{ marginTop: "1px", flexShrink: 0 }}>{LEVEL_ICON[r.level]}</span>
            <div style={{ flex: 1 }}>
              <span style={{ color: "var(--text-primary)", fontSize: "12px", fontWeight: 600 }}>{r.nameKo}</span>
              <span style={{ color: "var(--text-muted)", fontSize: "10px", marginLeft: "6px" }}>{r.id}</span>
              {r.issues.length > 0 && (
                <div style={{ marginTop: "3px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {r.issues.map((issue, i) => (
                    <span key={i} style={{
                      fontSize: "10px", padding: "1px 7px", borderRadius: "4px",
                      background: `${LEVEL_COLOR[r.level]}22`, color: LEVEL_COLOR[r.level],
                      border: `1px solid ${LEVEL_COLOR[r.level]}33`,
                    }}>{issue}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "12px", textAlign: "center", padding: "20px" }}>
            해당 조건의 항목이 없습니다.
          </p>
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// 패널 2: 수기 조정
// ══════════════════════════════════════════════
function EditPanel({
  indicators, onUpdate,
}: {
  indicators: EconomicIndicator[];
  onUpdate: (list: EconomicIndicator[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<EconomicIndicator>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  const filtered = indicators.filter((i) =>
    !query || i.nameKo.includes(query) || i.name.toLowerCase().includes(query.toLowerCase()) || i.id.includes(query)
  );

  function startEdit(ind: EconomicIndicator) {
    setEditId(ind.id);
    setDraft({ ...ind });
  }
  function cancelEdit() { setEditId(null); setDraft({}); }

  function commitEdit() {
    const next = indicators.map((i) =>
      i.id === editId ? { ...i, ...draft, updatedAt: new Date().toISOString().slice(0, 10) } as EconomicIndicator : i
    );
    onUpdate(next);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("macro_indicators_override", JSON.stringify(next));
      }
    } catch {}
    setSavedId(editId);
    setTimeout(() => setSavedId(null), 2000);
    cancelEdit();
  }

  const cellStyle = (isEditing: boolean): React.CSSProperties => ({
    background: "rgba(255,255,255,0.08)",
    border: isEditing ? "1px solid var(--accent-blue)" : "1px solid transparent",
    borderRadius: "4px", padding: "3px 6px",
    color: "var(--text-primary)", fontSize: "11px", outline: "none",
  });

  return (
    <>
      <div style={{ position: "relative", marginBottom: "12px" }}>
        <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="지표명 또는 ID 검색…"
          style={{
            width: "100%", paddingLeft: "30px",
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            borderRadius: "8px", padding: "7px 10px 7px 30px",
            color: "var(--text-primary)", fontSize: "12px", outline: "none",
          }}
        />
      </div>

      <div style={{ maxHeight: "500px", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--bg-card)" }}>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["지표명", "현재값", "전일비", "등락률(%)", "갱신일", ""].map((h, i) => (
                <th key={i} style={{
                  padding: "7px 10px", color: "#93c5fd", fontWeight: 700, fontSize: "10px",
                  textAlign: i === 0 ? "left" : i === 5 ? "center" : "right", whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ind) => {
              const isEditing = editId === ind.id;
              return (
                <tr key={ind.id} style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: isEditing ? "rgba(59,130,246,0.07)" : "transparent",
                }}>
                  <td style={{ padding: "6px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      {isEditing ? (
                        <input value={draft.nameKo ?? ""} style={{ ...cellStyle(true), width: "110px" }}
                          onChange={(e) => setDraft((d) => ({ ...d, nameKo: e.target.value }))} />
                      ) : (
                        <span style={{ color: "#93c5fd", fontWeight: 600 }}>{ind.nameKo}</span>
                      )}
                      {savedId === ind.id && <CheckCircle2 size={11} color="#22c55e" />}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "9px" }}>{ind.id}</div>
                  </td>

                  {isEditing ? (
                    <>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>
                        <input type="number" style={{ ...cellStyle(true), width: "80px", textAlign: "right" }}
                          value={draft.currentValue ?? 0}
                          onChange={(e) => setDraft((d) => ({ ...d, currentValue: parseFloat(e.target.value) || 0 }))} />
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>
                        <input type="number" style={{ ...cellStyle(true), width: "70px", textAlign: "right" }}
                          value={draft.changeAbs ?? 0}
                          onChange={(e) => setDraft((d) => ({ ...d, changeAbs: parseFloat(e.target.value) || 0 }))} />
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>
                        <input type="number" style={{ ...cellStyle(true), width: "60px", textAlign: "right" }}
                          value={draft.changePct ?? 0}
                          onChange={(e) => setDraft((d) => ({ ...d, changePct: parseFloat(e.target.value) || 0 }))} />
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>
                        <input type="date" style={{ ...cellStyle(true) }}
                          value={draft.updatedAt ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, updatedAt: e.target.value }))} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--text-primary)", fontWeight: 700 }}>
                        {ind.currentValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>{ind.unit}</span>
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: ind.changeAbs >= 0 ? "#22c55e" : "#ef4444" }}>
                        {ind.changeAbs >= 0 ? "+" : ""}{ind.changeAbs.toFixed(2)}
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: ind.changePct >= 0 ? "#22c55e" : "#ef4444" }}>
                        {ind.changePct >= 0 ? "+" : ""}{ind.changePct.toFixed(2)}%
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--text-muted)", fontSize: "10px" }}>
                        {ind.updatedAt}
                      </td>
                    </>
                  )}

                  <td style={{ padding: "6px 8px", textAlign: "center", whiteSpace: "nowrap" }}>
                    {isEditing ? (
                      <span style={{ display: "inline-flex", gap: "5px" }}>
                        <button onClick={commitEdit} style={{
                          padding: "4px 9px", borderRadius: "5px", cursor: "pointer",
                          background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                          color: "#22c55e", display: "flex", alignItems: "center",
                        }}><Save size={11} /></button>
                        <button onClick={cancelEdit} style={{
                          padding: "4px 9px", borderRadius: "5px", cursor: "pointer",
                          background: "rgba(100,116,139,0.1)", border: "1px solid var(--border)",
                          color: "var(--text-muted)", display: "flex", alignItems: "center",
                        }}><RotateCcw size={11} /></button>
                      </span>
                    ) : (
                      <button onClick={() => startEdit(ind)} style={{
                        padding: "4px 9px", borderRadius: "5px", cursor: "pointer",
                        background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                        color: "#60a5fa", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px",
                      }}>
                        <Edit3 size={10} /> 수정
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "8px" }}>
        수정 시 갱신일이 오늘로 자동 업데이트됩니다. 세션 내에서만 유지됩니다.
      </p>
    </>
  );
}

// ══════════════════════════════════════════════
// 패널 3: 메뉴 구성
// ══════════════════════════════════════════════
type MenuItem = { id: string; label: string; visible: boolean; order: number };

const INITIAL_MENU: MenuItem[] = [
  { id: "comment",   label: "리서치",    visible: true, order: 0 },
  { id: "keydata",   label: "주요데이터", visible: true, order: 1 },
  { id: "basicdata", label: "기본데이터", visible: true, order: 2 },
  { id: "report",    label: "보고용",    visible: true, order: 3 },
  { id: "chart",     label: "차트",      visible: true, order: 4 },
  { id: "search",    label: "검색",      visible: true, order: 5 },
  { id: "settings",  label: "설정",      visible: true, order: 6 },
  { id: "admin",     label: "관리자",    visible: true, order: 7 },
];

function MenuPanel() {
  const [items, setItems] = useState<MenuItem[]>(() => {
    if (typeof window === "undefined") return INITIAL_MENU;
    try {
      const saved = localStorage.getItem("macro_menu_config");
      return saved ? JSON.parse(saved) : INITIAL_MENU;
    } catch { return INITIAL_MENU; }
  });
  const [savedMsg, setSavedMsg] = useState(false);

  function toggleVisible(id: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, visible: !i.visible } : i));
    setSavedMsg(false);
  }
  function move(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const to = idx + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next.map((item, i) => ({ ...item, order: i }));
    });
    setSavedMsg(false);
  }
  function saveMenu() {
    localStorage.setItem("macro_menu_config", JSON.stringify(items));
    window.dispatchEvent(new Event("macro_menu_updated"));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  }

  return (
    <>
      <p style={{ color: "var(--text-muted)", fontSize: "11px", marginBottom: "12px" }}>
        탭의 표시/숨김과 순서를 변경합니다.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "9px 14px", borderRadius: "9px", transition: "all 0.15s",
            background: item.visible ? "rgba(59,130,246,0.05)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${item.visible ? "rgba(59,130,246,0.15)" : "var(--border)"}`,
            opacity: item.visible ? 1 : 0.5,
          }}>
            <span style={{ color: "var(--text-muted)", fontSize: "12px", cursor: "default" }}>⠿</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <button onClick={() => move(item.id, -1)} disabled={idx === 0}
                style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer",
                  color: idx === 0 ? "var(--border)" : "var(--text-muted)", padding: "1px 3px" }}>
                <ChevronDown size={10} style={{ transform: "rotate(180deg)" }} />
              </button>
              <button onClick={() => move(item.id, 1)} disabled={idx === items.length - 1}
                style={{ background: "none", border: "none", cursor: idx === items.length - 1 ? "default" : "pointer",
                  color: idx === items.length - 1 ? "var(--border)" : "var(--text-muted)", padding: "1px 3px" }}>
                <ChevronDown size={10} />
              </button>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: "10px", width: "16px", textAlign: "center" }}>{idx + 1}</span>
            <span style={{ flex: 1, color: "var(--text-primary)", fontSize: "12px", fontWeight: 600 }}>{item.label}</span>
            <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{item.id}</span>
            <button onClick={() => toggleVisible(item.id)} style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "11px",
              background: item.visible ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.1)",
              border: `1px solid ${item.visible ? "rgba(34,197,94,0.25)" : "var(--border)"}`,
              color: item.visible ? "#22c55e" : "var(--text-muted)",
            }}>
              {item.visible ? <Eye size={11} /> : <EyeOff size={11} />}
              {item.visible ? "표시" : "숨김"}
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
        <button onClick={saveMenu} style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "8px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "12px",
          background: savedMsg ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
          border: `1px solid ${savedMsg ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)"}`,
          color: savedMsg ? "#22c55e" : "#60a5fa",
        }}>
          {savedMsg ? <CheckCircle2 size={13} /> : <Save size={13} />}
          {savedMsg ? "저장됨" : "메뉴 설정 저장"}
        </button>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// 패널 4: 지표 추가·삭제
// ══════════════════════════════════════════════
type SimpleForm = {
  nameKo: string;
  currentValue: number;
  unit: string;
  category: string;
  region: "domestic" | "foreign";
  frequency: EconomicIndicator["frequency"];
};

const BLANK_FORM: SimpleForm = {
  nameKo: "",
  currentValue: 0,
  unit: "%",
  category: "금리",
  region: "domestic",
  frequency: "daily",
};

function ManagePanel({
  indicators, onUpdate,
}: {
  indicators: EconomicIndicator[];
  onUpdate: (list: EconomicIndicator[]) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<SimpleForm>({ ...BLANK_FORM });
  const [query, setQuery] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const filtered = indicators.filter((i) =>
    !query || i.nameKo.includes(query) || i.id.includes(query)
  );

  function saveOverride(next: EconomicIndicator[]) {
    onUpdate(next);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("macro_indicators_override", JSON.stringify(next));
      }
    } catch {}
  }

  function handleAdd() {
    if (!form.nameKo.trim()) {
      setErrMsg("한글명은 필수입니다."); setTimeout(() => setErrMsg(null), 3000); return;
    }
    const generatedId = "custom-" + Date.now();
    const newInd: EconomicIndicator = {
      id: generatedId,
      name: form.nameKo,
      nameKo: form.nameKo,
      category: form.category,
      currentValue: form.currentValue,
      previousValue: form.currentValue,
      unit: form.unit,
      source: "",
      sourceUrl: "",
      region: form.region,
      trend: "neutral",
      changeAbs: 0,
      changePct: 0,
      updatedAt: new Date().toISOString().slice(0, 10),
      frequency: form.frequency,
      timeSeries: [],
    };
    saveOverride([...indicators, newInd]);
    setShowAdd(false);
    setForm({ ...BLANK_FORM });
    setSavedId(generatedId);
    setTimeout(() => setSavedId(null), 2000);
  }

  function handleDelete(id: string) {
    const name = indicators.find((i) => i.id === id)?.nameKo ?? id;
    if (!confirm(`"${name}" 지표를 삭제하시겠습니까?`)) return;
    saveOverride(indicators.filter((i) => i.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    const idx = indicators.findIndex((i) => i.id === id);
    const to = idx + dir;
    if (to < 0 || to >= indicators.length) return;
    const next = [...indicators];
    [next[idx], next[to]] = [next[to], next[idx]];
    saveOverride(next);
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
    borderRadius: "6px", padding: "6px 9px",
    color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "100%",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  return (
    <>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색…"
            style={{ ...inputStyle, paddingLeft: "28px" }} />
        </div>
        <button onClick={() => { setShowAdd((v) => !v); setErrMsg(null); }} style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "6px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap",
          background: showAdd ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.12)",
          border: `1px solid ${showAdd ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.25)"}`,
          color: showAdd ? "#ef4444" : "#60a5fa",
        }}>
          {showAdd ? <><RotateCcw size={12} /> 취소</> : <><Plus size={12} /> 지표 추가</>}
        </button>
      </div>

      {errMsg && (
        <div style={{
          marginBottom: "10px", padding: "8px 12px",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: "7px", color: "#ef4444", fontSize: "12px",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <XCircle size={13} /> {errMsg}
        </div>
      )}

      {showAdd && (
        <div style={{
          background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: "10px", padding: "16px", marginBottom: "14px",
        }}>
          <p style={{ color: "#60a5fa", fontSize: "12px", fontWeight: 700, marginBottom: "12px" }}>새 지표 추가</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px", marginBottom: "12px" }}>
            {/* 한글명 (필수) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <label style={{ color: "var(--text-muted)", fontSize: "10px" }}>한글명 * (필수)</label>
              <input type="text" style={inputStyle}
                value={form.nameKo}
                onChange={(e) => setForm((f) => ({ ...f, nameKo: e.target.value }))} />
            </div>
            {/* 현재값 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <label style={{ color: "var(--text-muted)", fontSize: "10px" }}>현재값</label>
              <input type="number" style={inputStyle}
                value={form.currentValue}
                onChange={(e) => setForm((f) => ({ ...f, currentValue: parseFloat(e.target.value) || 0 }))} />
            </div>
            {/* 단위 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <label style={{ color: "var(--text-muted)", fontSize: "10px" }}>단위</label>
              <input type="text" style={inputStyle}
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
            </div>
            {/* 카테고리 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <label style={{ color: "var(--text-muted)", fontSize: "10px" }}>카테고리</label>
              <select value={form.category} style={selectStyle}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* 지역 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <label style={{ color: "var(--text-muted)", fontSize: "10px" }}>지역</label>
              <select value={form.region} style={selectStyle}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value as "domestic" | "foreign" }))}>
                <option value="domestic">국내</option>
                <option value="foreign">해외</option>
              </select>
            </div>
            {/* 주기 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <label style={{ color: "var(--text-muted)", fontSize: "10px" }}>주기</label>
              <select value={form.frequency} style={selectStyle}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as EconomicIndicator["frequency"] }))}>
                <option value="daily">일별</option>
                <option value="monthly">월별</option>
                <option value="quarterly">분기</option>
                <option value="annual">연간</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleAdd} style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "8px 18px", borderRadius: "8px", cursor: "pointer",
              background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
              color: "#22c55e", fontSize: "12px", fontWeight: 700,
            }}><Plus size={12} /> 추가</button>
          </div>
        </div>
      )}

      <div style={{ maxHeight: "440px", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)" }}>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["순서", "지표명", "카테고리", "지역", "현재값", ""].map((h, i) => (
                <th key={i} style={{
                  padding: "6px 10px", color: "#93c5fd", fontWeight: 700, fontSize: "10px",
                  textAlign: i === 0 ? "center" : i === 1 ? "left" : "center",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ind, idx) => {
              const globalIdx = indicators.findIndex((i) => i.id === ind.id);
              return (
                <tr key={ind.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(59,130,246,0.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                >
                  {/* 순서 변경 버튼 */}
                  <td style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                      <button
                        onClick={() => move(ind.id, -1)}
                        disabled={globalIdx === 0}
                        title="위로"
                        style={{
                          background: "none", border: "none", cursor: globalIdx === 0 ? "default" : "pointer",
                          color: globalIdx === 0 ? "var(--border)" : "var(--text-muted)",
                          padding: "1px 4px", fontSize: "10px", lineHeight: 1,
                        }}
                      >▲</button>
                      <button
                        onClick={() => move(ind.id, 1)}
                        disabled={globalIdx === indicators.length - 1}
                        title="아래로"
                        style={{
                          background: "none", border: "none", cursor: globalIdx === indicators.length - 1 ? "default" : "pointer",
                          color: globalIdx === indicators.length - 1 ? "var(--border)" : "var(--text-muted)",
                          padding: "1px 4px", fontSize: "10px", lineHeight: 1,
                        }}
                      >▼</button>
                    </div>
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <span style={{ color: "#93c5fd", fontWeight: 600 }}>{ind.nameKo}</span>
                    {savedId === ind.id && <CheckCircle2 size={11} color="#22c55e" style={{ marginLeft: "5px", verticalAlign: "middle" }} />}
                    <div style={{ color: "var(--text-muted)", fontSize: "9px" }}>{ind.id}</div>
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "center" }}>
                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                      {ind.category}
                    </span>
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: "10px" }}>
                    {ind.region === "domestic" ? "국내" : "해외"}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "center", color: "var(--text-primary)", fontWeight: 700 }}>
                    {ind.currentValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} {ind.unit}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                    <button onClick={() => handleDelete(ind.id)} style={{
                      padding: "4px 8px", borderRadius: "5px", cursor: "pointer",
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                      color: "#ef4444", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10px",
                    }}>
                      <Trash2 size={10} /> 삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "8px" }}>
        전체 {indicators.length}개 · 국내 {indicators.filter((i) => i.region === "domestic").length}개 · 해외 {indicators.filter((i) => i.region === "foreign").length}개
      </p>
    </>
  );
}

// ══════════════════════════════════════════════
// 메인 컴포넌트 — indicators 상태를 여기서 관리
// ══════════════════════════════════════════════
const TABS: { id: AdminTab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "validate", label: "데이터 검증",    icon: <ShieldCheck size={15} />, desc: "이상값·미갱신·오류 자동 감지" },
  { id: "edit",     label: "수기 조정",      icon: <Edit3 size={15} />,       desc: "현재값·전일비·등락률 직접 수정" },
  { id: "menu",     label: "메뉴 구성",      icon: <LayoutGrid size={15} />,  desc: "탭 표시·숨김·순서 변경" },
  { id: "manage",   label: "지표 추가·삭제", icon: <Database size={15} />,    desc: "신규 등록 및 기존 지표 삭제" },
];

export default function AdminSection() {
  const [activeTab, setActiveTab] = useState<AdminTab>("validate");

  // ✅ 공유 상태: 모든 서브 패널이 동일한 indicators를 보고 수정
  const [indicators, setIndicators] = useState<EconomicIndicator[]>(() => {
    const base = [...domesticIndicators.map(i => ({ ...i })), ...foreignIndicators.map(i => ({ ...i }))];
    try {
      const saved = typeof window !== "undefined" && localStorage.getItem("macro_indicators_override");
      if (saved) {
        const overrides: EconomicIndicator[] = JSON.parse(saved);
        const overrideMap = new Map(overrides.map(o => [o.id, o]));
        // override에 있는 순서 유지 + base에만 있는 항목 뒤에 추가
        const overrideIds = new Set(overrides.map(o => o.id));
        const baseOnly = base.filter(i => !overrideIds.has(i.id));
        return [...overrides, ...baseOnly];
      }
    } catch {}
    return base;
  });

  const handleUpdate = useCallback((next: EconomicIndicator[]) => {
    setIndicators(next);
  }, []);  // localStorage 저장은 각 패널의 commitEdit/saveOverride에서 처리

  return (
    <div style={{ maxWidth: "960px" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <div style={{
          width: "34px", height: "34px", borderRadius: "9px",
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ShieldCheck size={16} color="#ef4444" />
        </div>
        <div>
          <h2 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700 }}>관리자</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>데이터 검증 · 수기 조정 · 메뉴 구성 · 지표 관리</p>
        </div>
        <span style={{
          marginLeft: "auto", fontSize: "9px", padding: "3px 9px", borderRadius: "5px",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
          color: "#ef4444", fontWeight: 700, letterSpacing: "0.5px",
        }}>ADMIN</span>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            display: "flex", flexDirection: "column",
            padding: "10px 16px", borderRadius: "10px", cursor: "pointer", textAlign: "left",
            minWidth: "140px", transition: "all 0.15s",
            border: `1px solid ${activeTab === t.id ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
            background: activeTab === t.id ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
            color: activeTab === t.id ? "#60a5fa" : "var(--text-muted)",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "12px", marginBottom: "3px" }}>
              {t.icon}{t.label}
            </span>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{t.desc}</span>
          </button>
        ))}
      </div>

      {/* 패널 */}
      <ACard icon={TABS.find((t) => t.id === activeTab)!.icon} title={TABS.find((t) => t.id === activeTab)!.label}>
        {activeTab === "validate" && <ValidatePanel indicators={indicators} />}
        {activeTab === "edit"     && <EditPanel indicators={indicators} onUpdate={handleUpdate} />}
        {activeTab === "menu"     && <MenuPanel />}
        {activeTab === "manage"   && <ManagePanel indicators={indicators} onUpdate={handleUpdate} />}
      </ACard>
    </div>
  );
}
