// ─────────────────────────────────────────────────────────────
// 앱 설정 타입 · 기본값 · localStorage 유틸
// ─────────────────────────────────────────────────────────────

export type ThemeMode   = "dark" | "dim" | "light";
export type FontFamily  = "pretendard" | "noto" | "system" | "mono";
export type FontSize    = "sm" | "md" | "lg";
export type DefaultTab  = "comment" | "keydata" | "basicdata" | "report" | "chart";

export interface AlertRule {
  id: string;
  indicatorId: string;
  condition: "above" | "below";
  threshold: number;
  enabled: boolean;
}

export interface AppSettings {
  // 외관
  theme:      ThemeMode;
  font:       FontFamily;
  fontSize:   FontSize;

  // 공유 채널
  emailAddress:      string;
  kakaoApiKey:       string;
  telegramBotToken:  string;
  telegramChatId:    string;

  // 자동화
  autoRefreshMin:   number;   // 0 = 비활성화, 5 / 10 / 30 / 60
  reportTime:       string;   // "08:00"
  reportEnabled:    boolean;
  reportChannels:   ("email" | "telegram")[];

  // 대시보드 기본값
  defaultTab:          DefaultTab;
  chartDefaultRange:   number;   // months
  chartDefaultMode:    "absolute" | "normalize";

  // 알림 임계값
  alertRules: AlertRule[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme:            "dark",
  font:             "pretendard",
  fontSize:         "md",

  emailAddress:     "",
  kakaoApiKey:      "",
  telegramBotToken: "",
  telegramChatId:   "",

  autoRefreshMin:   0,
  reportTime:       "08:00",
  reportEnabled:    false,
  reportChannels:   [],

  defaultTab:        "comment",
  chartDefaultRange: 36,
  chartDefaultMode:  "absolute",

  alertRules: [],
};

const STORAGE_KEY = "macro_dashboard_settings";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ── CSS 변수 / body 스타일 즉시 적용 ──────────────────────────
const THEME_VARS: Record<ThemeMode, Record<string, string>> = {
  dark: {
    "--bg-primary":    "#0a0e17",
    "--bg-secondary":  "#111827",
    "--bg-card":       "#1a2236",
    "--bg-card-hover": "#1e2a42",
    "--border":        "#2d3a52",
    "--border-light":  "#374151",
    "--text-primary":  "#f1f5f9",
    "--text-secondary":"#94a3b8",
    "--text-muted":    "#64748b",
    "--scrollbar-thumb":"#2d3a52",
    "--scrollbar-track":"#111827",
  },
  dim: {
    "--bg-primary":    "#141c2e",
    "--bg-secondary":  "#1a2540",
    "--bg-card":       "#1e2d4a",
    "--bg-card-hover": "#243258",
    "--border":        "#2e3f5c",
    "--border-light":  "#3a4f6e",
    "--text-primary":  "#dde6f5",
    "--text-secondary":"#8da4c4",
    "--text-muted":    "#5c7a9a",
    "--scrollbar-thumb":"#2e3f5c",
    "--scrollbar-track":"#1a2540",
  },
  light: {
    "--bg-primary":    "#f0f4f8",
    "--bg-secondary":  "#ffffff",
    "--bg-card":       "#ffffff",
    "--bg-card-hover": "#f8fafc",
    "--border":        "#e2e8f0",
    "--border-light":  "#cbd5e1",
    "--text-primary":  "#0f172a",
    "--text-secondary":"#475569",
    "--text-muted":    "#94a3b8",
    "--scrollbar-thumb":"#cbd5e1",
    "--scrollbar-track":"#f1f5f9",
  },
};

const FONT_FAMILY: Record<FontFamily, string> = {
  pretendard: "'Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  noto:       "'Noto Sans KR','Malgun Gothic',sans-serif",
  system:     "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif",
  mono:       "'D2Coding','Fira Code','Consolas',monospace",
};

const FONT_SIZE_PX: Record<FontSize, string> = {
  sm: "12px",
  md: "14px",
  lg: "16px",
};

export function applySettings(s: AppSettings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // 테마 CSS 변수
  Object.entries(THEME_VARS[s.theme]).forEach(([k, v]) =>
    root.style.setProperty(k, v)
  );

  // 폰트·글자크기
  document.body.style.fontFamily = FONT_FAMILY[s.font];
  root.style.fontSize = FONT_SIZE_PX[s.fontSize];
}
