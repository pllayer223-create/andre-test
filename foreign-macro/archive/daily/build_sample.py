"""새 sample.html 빌드 스크립트 - JSON 파일에서 직접 데이터 로드"""
import json, pathlib

BASE     = pathlib.Path(__file__).parent
PROJ     = BASE.parent.parent  # foreign-macro/foreign-macro
DAILY    = PROJ / "data" / "daily"
HIST_P   = PROJ / "data" / "historical_daily.json"

FILES = ["summary","indicators","schedule","domestic_rates","domestic_markets",
         "investor_flow","overseas_rates","overseas_markets","commodities",
         "commentary","credit_spread"]

# 1. 날짜별 데이터 로드 (JSON 파일 직접)
all_data = {}
for date_dir in sorted(DAILY.iterdir()):
    dt = date_dir.name
    if not dt.isdigit(): continue
    d = {"report_date": dt}
    for f in FILES:
        p = date_dir / f"{f}.json"
        if p.exists():
            d[f] = json.loads(p.read_text(encoding="utf-8"))
    if len(d) > 1:
        all_data[dt] = d

# 2. 역사적 시계열 로드
hist = json.loads(HIST_P.read_text(encoding="utf-8")) if HIST_P.exists() else {}

# 3. JS 데이터 블록 생성
all_js  = json.dumps(all_data, ensure_ascii=False)
hist_js = json.dumps(hist,     ensure_ascii=False)
DATA_BLOCK = f"const ALL_DATA = {all_js};\n\nconst HIST = {hist_js};\n\nconst SORTED_DATES = Object.keys(ALL_DATA).sort();"

print(f"  날짜: {list(all_data.keys())}")
print(f"  데이터 블록 길이: {len(DATA_BLOCK):,} chars")

HEAD = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Market Daily — 재무실 자금운용본부</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<style>
:root{
  --blue:#003087;--blue2:#1a56c4;--blue-lt:#dbeafe;
  --pos:#0a6c2a;--neg:#c00000;--gray:#6b7280;
  --border:#e5e7eb;--bg:#f3f4f6;--card:#ffffff;
  --nav:52px;--r:8px;
  --imp-high:#fef9c3;--imp-mid:#f0f9ff;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:"Malgun Gothic","맑은 고딕","Apple SD Gothic Neo",sans-serif;
     font-size:12px;line-height:1.55;background:var(--bg);color:#111827;padding-top:var(--nav)}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:300;height:var(--nav);
    background:var(--blue);display:flex;align-items:center;padding:0 14px;gap:6px;
    box-shadow:0 2px 8px rgba(0,0,0,.4)}
.nav-brand{font-weight:800;font-size:14px;color:#fff;white-space:nowrap;
           padding-right:10px;border-right:1px solid rgba(255,255,255,.3)}
.nav-brand small{color:#ffd700;font-size:10px;margin-left:5px;font-weight:400}
nav select{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);
           border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;font-family:inherit}
nav select option{background:#003087}
.btn-arrow{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);
           border-radius:5px;padding:3px 9px;font-size:13px;cursor:pointer;font-family:inherit;transition:background .15s}
.btn-arrow:hover{background:rgba(255,255,255,.25)}
.nav-date-count{font-size:10px;color:rgba(255,255,255,.6);white-space:nowrap}
.nav-actions{margin-left:auto;display:flex;gap:6px}
.btn-nav-sm{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);
            border-radius:5px;padding:3px 9px;font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap;transition:background .15s}
.btn-nav-sm:hover{background:rgba(255,255,255,.25)}

/* QUERY BAR */
.query-bar{background:#1a3a6e;padding:6px 14px;display:flex;gap:6px;align-items:center}
.query-mode{display:flex;border-radius:6px;overflow:hidden;border:1px solid rgba(255,255,255,.25);flex-shrink:0}
.query-mode button{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);border:none;
                   padding:5px 10px;font-size:10px;cursor:pointer;font-family:inherit;transition:all .15s}
.query-mode button.active{background:#2563eb;color:#fff;font-weight:700}
.query-input{flex:1;padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.3);
             background:rgba(255,255,255,.1);color:#fff;font-size:12px;font-family:inherit;outline:none}
.query-input::placeholder{color:rgba(255,255,255,.45)}
.query-input:focus{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.55)}
.btn-query{background:#2563eb;color:#fff;border:none;border-radius:6px;
           padding:6px 14px;font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap}
.query-hint{font-size:10px;color:rgba(255,255,255,.4);white-space:nowrap}

/* REPORT HEADER */
.rpt-header{background:#fff;border-bottom:3px solid var(--blue);
            padding:8px 16px;display:flex;justify-content:space-between;align-items:center}
.rh-logo{font-size:22px;font-weight:900;color:#fff;letter-spacing:-1px;
         width:36px;height:36px;border-radius:6px;background:#003087;
         display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rh-title{font-size:17px;font-weight:700;letter-spacing:1px;color:#111}
.rh-dept{font-size:10px;color:var(--gray)}
.rh-date{font-size:14px;font-weight:700;color:var(--blue)}

/* SUMMARY CARD */
.summary-card{margin:10px 14px;background:linear-gradient(135deg,#1e3a8a 0%,#1a56c4 100%);
              border-radius:10px;padding:12px 18px;color:#fff;border-left:5px solid #ffd700;display:none}
.summary-card.show{display:block}
.summary-hdr{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.summary-hdr-icon{font-size:16px}
.summary-hdr-txt{font-size:11px;font-weight:700;color:#ffd700;letter-spacing:.5px}
.summary-bullets{display:flex;flex-direction:column;gap:6px}
.summary-bullet{background:rgba(255,255,255,.1);border-radius:6px;padding:7px 10px;
                font-size:11px;line-height:1.7;border-left:3px solid rgba(255,215,0,.7);
                word-break:keep-all;white-space:normal}
.summary-bullet-tag{font-size:9px;font-weight:700;color:#ffd700;margin-bottom:2px;letter-spacing:.4px}
.summary-single{font-size:12px;line-height:1.7;padding:4px 0}

/* KPI */
.kpi-row{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px}
.kpi{flex:1;min-width:100px;background:var(--card);border:1px solid var(--border);
     border-radius:var(--r);padding:8px 10px;text-align:center;cursor:pointer;transition:box-shadow .15s}
.kpi:hover{box-shadow:0 2px 8px rgba(0,0,0,.12);border-color:var(--blue2)}
.kpi-lbl{font-size:10px;color:var(--gray);margin-bottom:2px}
.kpi-val{font-size:15px;font-weight:700;color:var(--blue)}
.kpi-chg{font-size:10px;margin-top:2px}

/* LAYOUT */
main{max-width:1180px;margin:0 auto;padding:8px 14px 80px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.one-col{margin-bottom:10px}
@media(max-width:720px){.two-col{grid-template-columns:1fr}}

/* SECTION CARD */
.sec{background:var(--card);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
.sec-head{background:var(--blue);color:#fff;font-weight:700;font-size:11px;
          padding:5px 10px;letter-spacing:.4px;display:flex;justify-content:space-between;align-items:center}
.sec-head a{color:rgba(255,255,255,.7);font-size:10px;font-weight:400;text-decoration:none}
.sec-head a:hover{color:#fff}

/* TABLE */
table{width:100%;border-collapse:collapse;font-size:11px}
thead th{background:#e8edf5;color:#1e3a6e;font-weight:700;padding:5px 8px;
         text-align:center;white-space:nowrap;border-bottom:1px solid var(--border)}
thead th:first-child{text-align:left}
tbody tr{border-bottom:1px solid #f0f0f0;cursor:pointer;transition:background .1s}
tbody tr:last-child{border-bottom:none}
tbody tr:nth-child(even){background:#fafbfc}
tbody tr:hover{background:#eff6ff!important}
tbody tr.imp-high{background:var(--imp-high)!important}
tbody tr.imp-mid{background:var(--imp-mid)!important}
tbody td{padding:4px 8px;text-align:center;vertical-align:middle}
tbody td:first-child{text-align:left;font-weight:500;color:#1e3a6e}
.pos{color:var(--pos);font-weight:700}
.neg{color:var(--neg);font-weight:700}
.eval-up{color:var(--pos);font-weight:700}
.eval-dn{color:var(--neg);font-weight:700}
.eval-eq{color:#6b7280}
.notice{font-size:10px;color:var(--gray);font-style:italic;padding:3px 8px 5px}

/* SCHEDULE */
.sch-row{display:grid;grid-template-columns:46px 50px 36px 1fr 70px 34px;
         gap:6px;align-items:center;padding:5px 10px;border-bottom:1px solid #f0f0f0;font-size:11px}
.sch-row:last-child{border-bottom:none}
.sch-row.imp-high{background:var(--imp-high);border-left:3px solid #eab308}
.sch-row.imp-mid{background:var(--imp-mid);border-left:3px solid var(--blue2)}
.sch-date{font-weight:700;color:var(--blue);font-size:10px}
.sch-time{color:var(--gray);font-size:10px}
.sch-country{background:#e5e7eb;border-radius:3px;padding:1px 4px;font-size:9px;text-align:center}
.sch-imp{font-size:11px;text-align:right}

/* CHARTS */
.chart-wrap{position:relative;padding:10px 12px 6px}
.chart-canvas{height:190px}
.chart-canvas-lg{height:260px}

/* RATE COMPARE TAG SELECT */
.rate-select-wrap{padding:10px 12px 6px}
.rate-select-label{font-size:10px;color:var(--gray);margin-bottom:6px}
.rate-tag-actions{display:flex;gap:6px;margin-bottom:6px}
.btn-tag-act{background:#f3f4f6;border:1px solid var(--border);border-radius:5px;
             padding:3px 9px;font-size:10px;cursor:pointer;font-family:inherit}
.btn-tag-act:hover{background:#e5e7eb}
.rate-tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}
.rate-tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;
          background:#f8fafc;border:1.5px solid var(--border);border-radius:20px;
          padding:3px 10px;transition:all .15s;user-select:none;white-space:nowrap}
.rate-tag.on{color:#fff;border-color:transparent;font-weight:600}
.rtag-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.btn-update{background:var(--blue2);color:#fff;border:none;border-radius:6px;
            padding:5px 14px;font-size:11px;cursor:pointer;font-family:inherit;margin-top:4px}
.btn-update:hover{background:var(--blue)}

/* QUERY RESULT */
.query-result{background:var(--card);border:1px solid var(--border);border-radius:var(--r);
              padding:12px;margin-bottom:10px;display:none}
.query-result.active{display:block}
.qr-title{font-weight:700;color:var(--blue);margin-bottom:8px;font-size:12px;
          display:flex;justify-content:space-between;align-items:center}
.qr-close{cursor:pointer;color:var(--gray);font-size:14px;padding:0 4px}
.qr-empty{color:var(--gray);font-style:italic;font-size:11px;padding:6px}

/* COMMENTARY */
.cm-issue{padding:10px 12px;border-bottom:1px solid #f0f0f0}
.cm-issue:last-child{border-bottom:none}
.cm-issue-hdr{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.cm-tag{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap}
.cm-tag.domestic{background:#dbeafe;color:#1e40af}
.cm-tag.overseas{background:#dcfce7;color:#166534}
.cm-tag.neutral{background:#f3f4f6;color:#374151}
.cm-source{font-size:10px;color:var(--gray);margin-left:auto;
           background:#f9fafb;border:1px solid var(--border);border-radius:3px;padding:1px 6px}
.cm-text{font-size:11.5px;line-height:1.7;color:#1f2937}

/* VALIDATION PANEL */
.val-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:200;
             background:rgba(0,0,0,.45);overflow-y:auto}
.val-overlay.open{display:flex;align-items:flex-start;justify-content:center;padding:20px 14px}
.val-box{background:#fff;border-radius:10px;max-width:800px;width:100%;
         box-shadow:0 8px 32px rgba(0,0,0,.25);overflow:hidden}
.val-head{background:var(--blue);color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px}
.val-head h2{font-size:14px;font-weight:700;flex:1}
.val-head button{background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:5px;
                 padding:4px 10px;cursor:pointer;font-family:inherit}
.val-body{padding:16px}
.val-sec-title{font-size:11px;font-weight:700;color:var(--blue);margin-bottom:8px;
               padding-bottom:4px;border-bottom:1px solid var(--border);margin-top:14px}
.val-sec-title:first-child{margin-top:0}
.val-row{display:flex;align-items:flex-start;gap:10px;padding:5px 0;
         border-bottom:1px solid #f8f8f8;font-size:11px}
.val-icon{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          font-size:10px;flex-shrink:0;margin-top:1px}
.vi-ok{background:#dcfce7;color:#166534}
.vi-warn{background:#fef9c3;color:#92400e}
.vi-err{background:#fee2e2;color:#991b1b}
.val-lbl{font-weight:600;color:#374151;min-width:180px}
.val-detail{color:var(--gray);font-size:10px}
.val-summary{display:flex;gap:12px;padding:10px 16px;background:#f9fafb;border-top:1px solid var(--border)}
.val-sum-item{display:flex;align-items:center;gap:5px;font-size:11px}

/* CHART MODAL */
.chart-modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;
             z-index:400;background:rgba(0,0,0,.55);align-items:center;justify-content:center}
.chart-modal.open{display:flex}
.cm-box{background:#fff;border-radius:10px;max-width:700px;width:calc(100% - 28px);
        box-shadow:0 8px 40px rgba(0,0,0,.3);overflow:hidden}
.cm-box-head{background:var(--blue);color:#fff;padding:10px 16px;display:flex;align-items:center;gap:8px}
.cm-box-head h3{font-size:13px;font-weight:700;flex:1}
.cm-box-head button{background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:5px;
                    padding:3px 10px;cursor:pointer;font-family:inherit}
.cm-box-body{padding:14px}
.cm-modal-canvas{height:280px}
.cm-meta{display:flex;gap:16px;padding:10px 0 4px;font-size:10px;color:var(--gray);flex-wrap:wrap}
.cm-meta strong{color:#111;font-size:12px}

/* CLAUDE AI FAB + PANEL */
.ai-fab{position:fixed;bottom:24px;right:24px;z-index:350;
        width:52px;height:52px;border-radius:50%;
        background:linear-gradient(135deg,#6366f1,#8b5cf6);
        color:#fff;border:none;font-size:22px;cursor:pointer;
        box-shadow:0 4px 16px rgba(99,102,241,.5);
        transition:transform .15s;display:flex;align-items:center;justify-content:center}
.ai-fab:hover{transform:scale(1.1)}
.ai-panel{display:none;position:fixed;bottom:84px;right:24px;z-index:350;
          width:380px;max-width:calc(100vw - 28px);height:530px;max-height:calc(100vh - 120px);
          background:#fff;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.25);
          overflow:hidden;flex-direction:column}
.ai-panel.open{display:flex}
.ai-ph{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
       padding:12px 14px;display:flex;align-items:center;gap:8px}
.ai-ph h3{font-size:13px;font-weight:700;flex:1}
.ai-ph button{background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:5px;
              padding:3px 8px;cursor:pointer;font-family:inherit}
.ai-key-row{background:#f0f7ff;border-bottom:1px solid #bfdbfe;padding:8px 12px;
            display:flex;gap:6px;align-items:center;font-size:10px;color:#1e40af}
.ai-key-input{flex:1;padding:4px 8px;border-radius:4px;border:1px solid #bfdbfe;
              font-size:10px;font-family:inherit;outline:none}
.ai-key-save{background:#2563eb;color:#fff;border:none;border-radius:4px;
             padding:4px 10px;font-size:10px;cursor:pointer;font-family:inherit}
.ai-msgs{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.ai-msg{max-width:90%;padding:8px 11px;border-radius:10px;font-size:11px;line-height:1.65}
.ai-msg.user{align-self:flex-end;background:#2563eb;color:#fff;border-bottom-right-radius:3px}
.ai-msg.assistant{align-self:flex-start;background:#f3f4f6;color:#111;border-bottom-left-radius:3px;white-space:pre-wrap}
.ai-msg.thinking{color:var(--gray);font-style:italic;background:#fafbfc;font-size:10px}
.ai-ctx{border-top:1px solid var(--border);padding:5px 12px;font-size:10px;color:var(--gray);display:flex;gap:4px}
.ai-input-row{border-top:1px solid var(--border);padding:10px 12px;display:flex;gap:6px}
.ai-textarea{flex:1;padding:7px 10px;border-radius:6px;border:1px solid var(--border);
             font-family:inherit;font-size:11px;resize:none;outline:none;height:60px;line-height:1.5}
.ai-textarea:focus{border-color:var(--blue2)}
.ai-send{background:#6366f1;color:#fff;border:none;border-radius:6px;
         padding:0 14px;font-size:11px;cursor:pointer;font-family:inherit;align-self:flex-end;height:32px}

/* FOOTER */
footer{border-top:1px solid var(--border);padding:12px;text-align:center;
       font-size:10px;color:var(--gray);font-style:italic;margin-top:20px}

/* PRINT */
@media print{
  nav,.query-bar,.nav-actions,.rate-select-wrap,.query-result,
  .ai-fab,.ai-panel,.val-overlay,.chart-modal{display:none!important}
  body{padding-top:0;font-size:10px}
  .two-col{grid-template-columns:1fr 1fr!important}
  .chart-canvas,.chart-canvas-lg{height:160px}
}
</style>
</head>
<body>"""

BODY = """
<nav>
  <span class="nav-brand">Market Daily<small>재무실</small></span>
  <button class="btn-arrow" onclick="navDate(-1)">◄</button>
  <select id="date-sel"></select>
  <button class="btn-arrow" onclick="navDate(+1)">►</button>
  <span class="nav-date-count" id="date-count"></span>
  <div class="nav-actions">
    <button class="btn-nav-sm" onclick="openValidation()">✓ 검증</button>
    <button class="btn-nav-sm" onclick="window.print()">인쇄</button>
  </div>
</nav>

<div class="query-bar">
  <div class="query-mode" id="qmode">
    <button class="active" onclick="setMode('data',this)">데이터검색</button>
    <button onclick="setMode('web',this)">웹검색</button>
    <button onclick="setMode('claude',this)">🤖 Claude</button>
  </div>
  <input id="q-input" class="query-input" type="text"
         placeholder="검색어 입력 (예: 국고칄 3Y, 미국 CPI, 비트코인 ...)" />
  <button class="btn-query" onclick="runQuery()">검색 / 질문</button>
  <span class="query-hint" id="q-hint">전체 날짜 범위 검색 | Enter 지원</span>
</div>

<div style="max-width:1180px;margin:0 auto;padding:0 14px">
  <div id="query-result" class="query-result">
    <div class="qr-title">
      <span id="qr-title-txt"></span>
      <span class="qr-close" onclick="closeQR()">✕</span>
    </div>
    <div id="qr-body"></div>
  </div>
</div>

<div class="rpt-header">
  <div style="display:flex;align-items:center;gap:12px">
    <div class="rh-logo">B</div>
    <div>
      <div class="rh-title">MARKET DAILY</div>
      <div class="rh-dept">재무실 자금운용본부</div>
    </div>
  </div>
  <div style="text-align:right">
    <div id="rh-date" class="rh-date"></div>
    <div style="font-size:10px;color:var(--gray)">데이터 기준: <span id="rh-data-date"></span></div>
  </div>
</div>

<div id="summary-card" class="summary-card">
  <div class="summary-hdr">
    <span class="summary-hdr-icon">💡</span>
    <span class="summary-hdr-txt">핵심 요약</span>
  </div>
  <div id="summary-content"></div>
</div>

<div class="kpi-row" id="kpi-row"></div>

<main>
<div class="two-col">
  <div style="display:flex;flex-direction:column;gap:10px">
    <div class="sec">
      <div class="sec-head">국내 금리
        <a href="https://data.krx.co.kr" target="_blank" rel="noopener">↗ KRX</a>
      </div>
      <div id="dom-rates-body"></div>
    </div>
    <div class="sec">
      <div class="sec-head">국내 주식 및 환율</div>
      <div id="dom-mkt-body"></div>
    </div>
    <div class="sec">
      <div class="sec-head">투자자별 동향 (<span id="flow-unit">억원</span>)</div>
      <div id="flow-body"></div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px">
    <div class="sec">
      <div class="sec-head">해외 금리
        <a href="https://fred.stlouisfed.org" target="_blank" rel="noopener">↗ FRED</a>
      </div>
      <div id="os-rates-body"></div>
    </div>
    <div class="sec">
      <div class="sec-head">해외 주식 · 환율 · 암호화폐</div>
      <div id="os-mkt-body"></div>
    </div>
    <div class="sec">
      <div class="sec-head">상품</div>
      <div id="comm-body"></div>
    </div>
  </div>
</div>

<div class="two-col">
  <div class="sec">
    <div class="sec-head">경제지표</div>
    <div id="indicators-body"></div>
  </div>
  <div class="sec">
    <div class="sec-head">주요 일정</div>
    <div id="schedule-body"></div>
  </div>
</div>

<div class="one-col">
  <div class="sec">
    <div class="sec-head">코멘터리 — 국내·해외 이슈</div>
    <div id="commentary-body"></div>
  </div>
</div>

<div class="one-col">
  <div class="sec">
    <div class="sec-head">금리 시계열 비교 (월별)</div>
    <div class="rate-select-wrap">
      <div class="rate-select-label">시리즈 선택 (클릭 토글 / 최대 8개)</div>
      <div class="rate-tag-actions">
        <button class="btn-tag-act" onclick="rateTagAll(false)">전체 해제</button>
        <button class="btn-tag-act" onclick="rateTagDefaults()">기본값</button>
        <button class="btn-tag-act" onclick="rateTagAll(true)">전체 선택</button>
      </div>
      <div class="rate-tags" id="rate-tags"></div>
      <button class="btn-update" onclick="renderRateChart()">차트 업데이트</button>
    </div>
    <div class="chart-wrap">
      <canvas id="rate-compare-chart" class="chart-canvas-lg"></canvas>
    </div>
  </div>
</div>
</main>

<footer>Market Daily · 재무실 자금운용본부 · 데이터 출처: KRX, FRED, yfinance · 본 자료는 내부 참고용</footer>

<!-- 검증 패널 -->
<div class="val-overlay" id="val-overlay">
  <div class="val-box">
    <div class="val-head">
      <h2>✓ 데이터 검증 리포트</h2>
      <button onclick="closeValidation()">닫기</button>
    </div>
    <div class="val-body" id="val-body"></div>
    <div class="val-summary" id="val-summary"></div>
  </div>
</div>

<!-- 차트 팝업 모달 -->
<div class="chart-modal" id="chart-modal" onclick="if(event.target===this)closeChartModal()">
  <div class="cm-box">
    <div class="cm-box-head">
      <h3 id="cm-title">시계열 차트</h3>
      <button onclick="closeChartModal()">✕ 닫기</button>
    </div>
    <div class="cm-box-body">
      <canvas id="cm-canvas" class="cm-modal-canvas"></canvas>
      <div class="cm-meta" id="cm-meta"></div>
    </div>
  </div>
</div>

<!-- Claude AI 패널 -->
<button class="ai-fab" onclick="toggleAI()" title="Claude AI에게 질문">🤖</button>
<div class="ai-panel" id="ai-panel">
  <div class="ai-ph">
    <h3>🤖 Claude AI 애널리스트</h3>
    <button onclick="toggleAI()">✕</button>
  </div>
  <div class="ai-key-row" id="ai-key-row">
    <span>API Key:</span>
    <input type="password" id="ai-key-input" class="ai-key-input" placeholder="sk-ant-..." />
    <button class="ai-key-save" onclick="saveKey()">저장</button>
  </div>
  <div class="ai-msgs" id="ai-msgs">
    <div class="ai-msg assistant">안녕하세요! Market Daily 데이터 기반 AI 애널리스트입니다.

━━ API Key 설정 방법 ━━
① console.anthropic.com 접속 (로그인 필요)
② 좌측 메뉴 → API Keys → Create Key
③ sk-ant-... 형식의 키 복사
④ 위 입력란에 붙여넣기 → 저장 클릭
⑤ 저장 후 아래 입력창에서 바로 질문 가능

━━ 질문 예시 ━━
• "오늘 국내금리 동향을 요약해줘"
• "KOSPI 하락 원인은?"
• "WTI 가격 변동 원인을 설명해줘"
• "미국 CPI 발표가 채권시장에 미치는 영향은?"</div>
  </div>
  <div class="ai-ctx"><span>📊</span><span id="ai-ctx-txt">준비 중...</span></div>
  <div class="ai-input-row">
    <textarea id="ai-ta" class="ai-textarea" placeholder="질문 입력... (Shift+Enter: 줄바꾸슴)"></textarea>
    <button class="ai-send" onclick="sendAI()">전송</button>
  </div>
</div>
"""

JS = """<script>
/* ========= DATA ========= */
"""

JS_TAIL = """

/* ========= STATE ========= */
let activeDate = SORTED_DATES[SORTED_DATES.length - 1];
let popupChart = null;
let rateChart  = null;
let qMode      = 'data';
let aiHistory  = [];

const RC = [
  '#1a56c4','#c00000','#0a6c2a','#d97706','#7c3aed',
  '#0891b2','#be185d','#065f46','#92400e','#374151',
  '#6366f1','#ec4899','#14b8a6','#f59e0b','#84cc16'
];
const RKEYS = Object.keys(HIST).filter(k => {
  if (k==='labels'||k==='_note') return false;
  const v = HIST[k];
  return typeof v==='object' && (v.unit==='%'||v.unit==='%p');
});
const RDEFS = ['\\uad6d\\uace03y','\\ud68c\\uc0ac3y_aa','\\uc740\\ud3782y','\\uae30\\ud0c02y_aa'];

/* ========= UTIL ========= */
function esc(t){ if(t==null)return ''; return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function vcls(s){ const t=String(s||''); return t.startsWith('\\u25b2')||t.startsWith('+') ? 'pos' : t.startsWith('\\u25bc')||t.startsWith('-') ? 'neg' : ''; }
function evalCls(s){ if(!s)return ''; if(s.includes('\\uc0c1\\ud68c'))return 'eval-up'; if(s.includes('\\ud558\\ud68c'))return 'eval-dn'; return 'eval-eq'; }
function fmtFlow(v){ if(v==null)return '\\u2014'; const c=v>0?'pos':v<0?'neg':''; return '<span class="'+c+'">'+(v>0?'+':'')+v.toLocaleString()+'</span>'; }

/* ========= DATE NAV ========= */
function switchDate(dt){ activeDate=dt; const s=document.getElementById('date-sel'); if(s)s.value=dt; renderAll(); }
function navDate(d){ const i=SORTED_DATES.indexOf(activeDate); const n=i+d; if(n>=0&&n<SORTED_DATES.length)switchDate(SORTED_DATES[n]); }

/* ========= QUERY MODE ========= */
function setMode(m,btn){
  qMode=m;
  document.querySelectorAll('#qmode button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const h={'data':'\\uc804\\uccb4 \\ub0a0\\uc9dc \\ubc94\\uc704 \\uac80\\uc0c9 | Enter \\uc9c0\\uc6d0','web':'Naver/Google \\uc6f9 \\uac80\\uc0c9\\uc73c\\ub85c \\uc5f0\\uacb0','claude':'Claude AI\\uc5d0\\uac8c \\ub370\\uc774\\ud130 \\uae30\\ubc18 \\uc9c8\\ubb38'};
  document.getElementById('q-hint').textContent = h[m]||'';
}

function runQuery(){
  const q=(document.getElementById('q-input')?.value||'').trim();
  if(!q)return;
  if(qMode==='web'){doWebSearch(q);return;}
  if(qMode==='claude'){document.getElementById('ai-ta').value=q;if(!document.getElementById('ai-panel').classList.contains('open'))toggleAI();sendAI();return;}
  doDataSearch(q);
}

function doWebSearch(q){
  const enc=encodeURIComponent(q+' \\uae08\\uc735\\uc2dc\\uc7a5');
  document.getElementById('qr-title-txt').textContent='\\uc6f9 \\uac80\\uc0c9: "'+esc(q)+'"';
  document.getElementById('qr-body').innerHTML=
    '<div style="display:flex;gap:10px;padding:6px 0">'+
    '<a href="https://search.naver.com/search.naver?query='+enc+'" target="_blank" rel="noopener" style="background:#03c75a;color:#fff;border-radius:6px;padding:7px 16px;font-size:12px;text-decoration:none;font-weight:700">\\ud83d\\udd0d \\ub124\\uc774\\ubc84 \\uac80\\uc0c9</a>'+
    '<a href="https://www.google.com/search?q='+enc+'" target="_blank" rel="noopener" style="background:#4285F4;color:#fff;border-radius:6px;padding:7px 16px;font-size:12px;text-decoration:none;font-weight:700">\\ud83d\\udd0d Google \\uac80\\uc0c9</a>'+
    '</div><div style="font-size:11px;color:var(--gray);margin-top:6px">\\uc0c8 \\ud0ed\\uc5d0\\uc11c \\uc5f4\\ub9bd\\ub2c8\\ub2e4.</div>';
  document.getElementById('query-result').classList.add('active');
}

function doDataSearch(q){
  const ql=q.toLowerCase().replace(/\\s/g,'');
  const rows=[];
  SORTED_DATES.forEach(dt=>{
    const d=ALL_DATA[dt];
    const chk=(arr,cat,vfn)=>(arr||[]).forEach(x=>{
      if(x.name.toLowerCase().replace(/\\s/g,'').includes(ql)||ql.includes(x.name.toLowerCase().replace(/\\s/g,''))){
        rows.push({dt,cat,name:x.name,val:vfn(x),chg:x.prev_day_str||'\\u2014',ytd:x.ytd_str||'\\u2014'});
      }
    });
    chk(d.domestic_rates?.items,'\\uad6d\\ub0b4\\uae08\\ub9ac',x=>x.value?.toFixed(3)+'%');
    chk(d.domestic_markets?.items,'\\uad6d\\ub0b4\\uc8fc\\uc2dd\\ud658\\uc728',x=>x.value?.toLocaleString());
    chk(d.overseas_rates?.items,'\\ud574\\uc678\\uae08\\ub9ac',x=>x.value?.toFixed(3)+'%');
    chk([...(d.overseas_markets?.stocks||[]),...(d.overseas_markets?.fx||[]),...(d.overseas_markets?.crypto||[])],'\\ud574\\uc678\\uc2dc\\uc7a5',x=>x.value?.toLocaleString());
    chk(d.commodities?.items,'\\uc0c1\\ud488',x=>x.value?.toLocaleString());
    (d.indicators?.items||[]).forEach(x=>{
      if(x.name.toLowerCase().includes(q.toLowerCase()))
        rows.push({dt,cat:'\\uacbd\\uc81c\\uc9c0\\ud45c',name:x.name,val:'\\uc2e4\\uc81c:'+x.actual,chg:'\\uc608\\uc0c1:'+x.forecast,ytd:x.eval||'\\u2014'});
    });
  });
  document.getElementById('qr-title-txt').textContent='\\ub370\\uc774\\ud130 \\uac80\\uc0c9: "'+esc(q)+'" \\u2014 '+rows.length+'\\uac74';
  document.getElementById('query-result').classList.add('active');
  if(!rows.length){document.getElementById('qr-body').innerHTML='<div class="qr-empty">\\uac80\\uc0c9 \\uacb0\\uacfc \\uc5c6\\uc74c</div>';return;}
  document.getElementById('qr-body').innerHTML='<table><thead><tr><th>\\ub0a0\\uc9dc</th><th>\\uad6c\\ubd84</th><th>\\ud56d\\ubaa9</th><th>\\uac12</th><th>\\uc804\\uc77c\\ub300\\ube44</th><th>YTD/\\uae30\\ud0c0</th></tr></thead><tbody>'+
    rows.map(r=>'<tr onclick="openChart(\\''+esc(r.name)+'\\',\\''+esc(r.cat)+'\\',null)" style="cursor:pointer">'+
      '<td>'+r.dt.replace(/(\\d{4})(\\d{2})(\\d{2})/,'$1-$2-$3')+'</td>'+
      '<td><span style="background:#e8edf5;border-radius:3px;padding:1px 5px;font-size:10px">'+esc(r.cat)+'</span></td>'+
      '<td>'+esc(r.name)+'</td><td class="'+vcls(r.val)+'">'+esc(r.val)+'</td>'+
      '<td class="'+vcls(r.chg)+'">'+esc(r.chg)+'</td><td class="'+vcls(r.ytd)+'">'+esc(r.ytd)+'</td>'+
    '</tr>').join('')+'</tbody></table>';
}

function closeQR(){document.getElementById('query-result').classList.remove('active');}

/* ========= RENDER ALL ========= */
function renderAll(){
  const d=ALL_DATA[activeDate];
  if(!d)return;
  const i=SORTED_DATES.indexOf(activeDate);
  document.getElementById('date-count').textContent=(i+1)+' / '+SORTED_DATES.length;
  renderHeader(d);
  renderSummary(d.summary);
  renderKpi(d);
  renderDomRates(d.domestic_rates);
  renderDomMkt(d.domestic_markets);
  renderFlow(d.investor_flow);
  renderOsRates(d.overseas_rates);
  renderOsMkt(d.overseas_markets);
  renderComm(d.commodities);
  renderIndicators(d.indicators);
  renderSchedule(d.schedule);
  renderCommentary(d.commentary);
}

function renderHeader(d){
  const wd=['(\\uc77c)','(\\uc6d4)','(\\ud654)','(\\uc218)','(\\ubaa9)','(\\uae08)','(\\ud1a0)'];
  const ro=new Date(activeDate.replace(/(\\d{4})(\\d{2})(\\d{2})/,'$1-$2-$3'));
  document.getElementById('rh-date').textContent=activeDate.replace(/(\\d{4})(\\d{2})(\\d{2})/,'$1-$2-$3')+' '+wd[ro.getDay()];
  const dd=d.domestic_rates?.data_date||d.domestic_markets?.data_date||'';
  const dd2=new Date(dd);
  document.getElementById('rh-data-date').textContent=dd.replace(/(\\d{4})-(\\d{2})-(\\d{2})/,'$1.$2.$3')+(dd?' '+wd[dd2.getDay()]:'');
}

/* ======== SUMMARY (improved) ======== */
function renderSummary(s){
  const card=document.getElementById('summary-card');
  const cont=document.getElementById('summary-content');
  if(!s?.text){card.classList.remove('show');return;}
  card.classList.add('show');
  const raw=s.text;
  const parts=raw.split(/[,\\uff0c]/).map(x=>x.trim()).filter(Boolean);
  if(parts.length>1){
    const tagMap={'\\uae08\\ub9ac':'RATE','\\uc8fc\\uc2dd':'EQUITY','\\ud658\\uc728':'FX','\\uc6d0\\uc790\\uc7ac':'COMMODITY','\\uae00\\ub85c\\ubc8c':'GLOBAL','\\uad6d\\ub0b4':'DOMESTIC','\\uc2dc\\uc7a5':'MARKET'};
    cont.innerHTML='<div class="summary-bullets">'+parts.slice(0,4).map(p=>{
      const tag=Object.keys(tagMap).find(t=>p.includes(t))||'\\uc2dc\\uc7a5';
      return '<div class="summary-bullet"><div class="summary-bullet-tag">'+tagMap[tag]+'</div>'+esc(p)+'</div>';
    }).join('')+'</div>';
  } else {
    cont.innerHTML='<div class="summary-single">'+esc(raw)+'</div>';
  }
}

/* ======== KPI ======== */
function renderKpi(d){
  const el=document.getElementById('kpi-row');
  if(!el)return;
  const mkt=d.domestic_markets?.items||[];
  const os=d.overseas_rates?.items||[];
  const com=d.commodities?.items||[];
  const osm=d.overseas_markets?.stocks||[];
  const get=(arr,n)=>arr.find(x=>x.name===n)||{};
  const items=[
    {l:'KOSPI',v:get(mkt,'KOSPI').value?.toLocaleString()||'\\u2014',c:get(mkt,'KOSPI').prev_day_str||'',name:'KOSPI',cat:'\\uad6d\\ub0b4\\uc8fc\\uc2dd\\ud658\\uc728'},
    {l:'USD/KRW',v:get(mkt,'USDKRW').value?.toLocaleString()||'\\u2014',c:get(mkt,'USDKRW').prev_day_str||'',name:'USDKRW',cat:'\\uad6d\\ub0b4\\uc8fc\\uc2dd\\ud658\\uc728'},
    {l:'\\ubbf8\\uad6d 10Y',v:(get(os,'\\ubbf8\\uad6d 10Y').value||'\\u2014')+(get(os,'\\ubbf8\\uad6d 10Y').value?'%':''),c:get(os,'\\ubbf8\\uad6d 10Y').prev_day_str||'',name:'\\ubbf8\\uad6d 10Y',cat:'\\ud574\\uc678\\uae08\\ub9ac'},
    {l:'WTI',v:'$'+(get(com,'WTI').value||'\\u2014'),c:get(com,'WTI').prev_day_str||'',name:'WTI',cat:'\\uc0c1\\ud488'},
    {l:'S&P 500',v:get(osm,'S&P 500').value?.toLocaleString()||'\\u2014',c:get(osm,'S&P 500').prev_day_str||'',name:'S&P 500',cat:'\\ud574\\uc678\\uc8fc\\uc2dd'},
  ];
  el.innerHTML=items.map(k=>'<div class="kpi" onclick="openChart(\\''+esc(k.name)+'\\',\\''+esc(k.cat)+'\\',null)"><div class="kpi-lbl">'+k.l+'</div><div class="kpi-val">'+esc(String(k.v))+'</div><div class="kpi-chg '+vcls(k.c)+'">'+esc(k.c)+'</div></div>').join('');
}

/* ======== TABLE BUILDER ======== */
function mkTbl(headers,rows,clickFn){
  const ths=headers.map(h=>'<th>'+esc(h)+'</th>').join('');
  const trs=rows.map(r=>{
    const tds=r.cells.map((v,i)=>{const t=esc(String(v??'\\u2014'));const c=i>0?vcls(t):'';return '<td class="'+c+'">'+t+'</td>';}).join('');
    const oc=clickFn?'onclick="'+clickFn+'(\\''+esc(r.name)+'\\',\\''+esc(r.cat||'')+'\\',null)" title="\\ud074\\ub9ad\\ud558\\uba74 \\ucc28\\ud2b8"':'';
    return '<tr '+oc+'>'+tds+'</tr>';
  }).join('');
  return '<table><thead><tr>'+ths+'</tr></thead><tbody>'+trs+'</tbody></table>';
}

function renderDomRates(dr){
  const el=document.getElementById('dom-rates-body');
  if(!el||!dr?.items)return;
  const dd=(dr.data_date||'').replace(/\\d{4}-(\\d{2}-\\d{2})/,'$1');
  el.innerHTML=mkTbl(['\\uad6d\\ubd84',dd,'\\uc804\\uc77c\\ub300\\ube44','\\uc804\\ub144\\ub9d0\\ub300\\ube44'],
    dr.items.map(x=>({name:x.name,cat:'\\uad6d\\ub0b4\\uae08\\ub9ac',cells:[x.name,x.value?.toFixed(3)||'\\u2014',x.prev_day_str||'\\u2014',x.ytd_str||'\\u2014']})),'openChart');
}
function renderDomMkt(dm){
  const el=document.getElementById('dom-mkt-body');
  if(!el||!dm?.items)return;
  const dd=(dm.data_date||'').replace(/\\d{4}-(\\d{2}-\\d{2})/,'$1');
  el.innerHTML=mkTbl(['\\uad6d\\ubd84',dd,'\\uc804\\uc77c\\ub300\\ube44','\\uc804\\ub144\\ub9d0\\ub300\\ube44'],
    dm.items.map(x=>({name:x.name,cat:'\\uad6d\\ub0b4\\uc8fc\\uc2dd\\ud658\\uc728',cells:[x.name,x.value?.toLocaleString()||'\\u2014',x.prev_day_str||'\\u2014',x.ytd_str||'\\u2014']})),'openChart');
}
function renderOsRates(or_){
  const el=document.getElementById('os-rates-body');
  if(!el||!or_?.items)return;
  const dd=(or_.data_date||'').replace(/\\d{4}-(\\d{2}-\\d{2})/,'$1');
  el.innerHTML=mkTbl(['\\uad6d\\ubd84',dd,'\\uc804\\uc77c\\ub300\\ube44','\\uc804\\ub144\\ub9d0\\ub300\\ube44'],
    or_.items.map(x=>({name:x.name,cat:'\\ud574\\uc678\\uae08\\ub9ac',cells:[x.name,x.value?.toFixed(3)||'\\u2014',x.prev_day_str||'\\u2014',x.ytd_str||'\\u2014']})),'openChart');
}
function renderOsMkt(om){
  const el=document.getElementById('os-mkt-body');
  if(!el||!om)return;
  const rows=[
    ...(om.stocks||[]).map(x=>({name:x.name,cat:'\\ud574\\uc678\\uc8fc\\uc2dd',cells:[x.name,x.value?.toLocaleString()||'\\u2014',x.prev_day_str||'\\u2014',x.ytd_str||'\\u2014']})),
    ...(om.fx||[]).map(x=>({name:x.name,cat:'\\ud574\\uc678\\ud658\\uc728',cells:[x.name,x.value?.toLocaleString()||'\\u2014',x.prev_day_str||'\\u2014',x.ytd_str||'\\u2014']})),
    ...(om.crypto||[]).map(x=>({name:x.name,cat:'\\uc554\\ud638\\ud654\\ud3d0',cells:[x.name,x.value?.toLocaleString()||'\\u2014',x.prev_day_str||'\\u2014',x.ytd_str||'\\u2014']})),
  ];
  const dd=(om.data_date||'').replace(/\\d{4}-(\\d{2}-\\d{2})/,'$1');
  el.innerHTML=mkTbl(['\\uad6d\\ubd84',dd,'\\uc804\\uc77c\\ub300\\ube44','\\uc804\\ub144\\ub9d0\\ub300\\ube44'],rows,'openChart');
}
function renderComm(cm){
  const el=document.getElementById('comm-body');
  if(!el||!cm?.items)return;
  const dd=(cm.data_date||'').replace(/\\d{4}-(\\d{2}-\\d{2})/,'$1');
  el.innerHTML=mkTbl(['\\uad6d\\ubd84',dd,'\\uc804\\uc77c\\ub300\\ube44','\\uc804\\ub144\\ub9d0\\ub300\\ube44'],
    cm.items.map(x=>({name:x.name,cat:'\\uc0c1\\ud488',cells:[x.name,x.value?.toLocaleString()||'\\u2014',x.prev_day_str||'\\u2014',x.ytd_str||'\\u2014']})),'openChart');
}

function renderFlow(fl){
  const el=document.getElementById('flow-body');
  if(!el||!fl?.items)return;
  el.innerHTML='<table><thead><tr><th style="text-align:left">\\uc2dc\\uc7a5</th><th style="color:#1a56c4">\\uc678\\uad6d\\uc778</th><th style="color:#7c3aed">\\uae30\\uad00</th><th style="color:#d97706">\\uac1c\\uc778</th></tr></thead><tbody>'+
    fl.items.map(x=>'<tr><td style="text-align:left;font-weight:500;color:#1e3a6e">'+esc(x.market)+'</td><td>'+fmtFlow(x.foreign)+'</td><td>'+fmtFlow(x.institution)+'</td><td>'+fmtFlow(x.individual)+'</td></tr>').join('')+
    '</tbody></table>';
  const u=document.getElementById('flow-unit');
  if(u) u.textContent=fl.unit||'\\uc5b5\\uc6d0';
}

function renderIndicators(ind){
  const el=document.getElementById('indicators-body');
  if(!el)return;
  if(!ind?.items?.length){el.innerHTML='<p class="notice">\\ub370\\uc774\\ud130 \\uc5c6\\uc74c</p>';return;}
  el.innerHTML='<table><thead><tr><th style="text-align:left">\\uc9c0\\ud45c\\uba85</th><th>\\ubc1c\\ud45c\\uc77c</th><th>\\uc2e4\\uc81c\\uce58</th><th>\\uc608\\uc0c1\\uce58</th><th>\\uc804\\uc6d4\\uce58</th><th>\\ud3c9\\uac00</th></tr></thead><tbody>'+
    ind.items.map(x=>'<tr><td style="text-align:left;font-weight:500;color:#1e3a6e">'+esc(x.name)+'</td><td>'+esc(x.date)+'</td><td class="'+evalCls(x.eval==='\\uc0c1\\ud68c'?'+':x.eval==='\\ud558\\ud68c'?'-':'')+'">'+esc(x.actual)+'</td><td>'+esc(x.forecast)+'</td><td>'+esc(x.previous)+'</td><td class="'+evalCls(x.eval)+'">'+esc(x.eval)+'</td></tr>').join('')+
    '</tbody></table><p class="notice">'+esc(ind.note||'')+'</p>';
}

function renderSchedule(sch){
  const el=document.getElementById('schedule-body');
  if(!el)return;
  if(!sch?.items?.length){el.innerHTML='<p class="notice">\\uc77c\\uc815 \\uc5c6\\uc74c</p>';return;}
  el.innerHTML=sch.items.map(x=>{
    const imp=x.importance?.includes('\\u2605\\u2605\\u2605')?'imp-high':x.importance?.includes('\\u2605\\u2605')?'imp-mid':'';
    return '<div class="sch-row '+imp+'"><span class="sch-date">'+esc(x.date)+'</span><span class="sch-time">'+esc(x.time)+'</span><span class="sch-country">'+esc(x.country)+'</span><span>'+esc(x.event)+'</span><span style="font-size:10px;color:var(--gray);text-align:right">\\uc608\\uc0c1: '+esc(x.forecast)+'</span><span class="sch-imp">'+esc(x.importance)+'</span></div>';
  }).join('')+'<p class="notice">'+esc(sch.note||'')+'</p>';
}

/* ======== COMMENTARY (\\uad6d\\ub0b4/\\ud574\\uc678 \\uc774\\uc288 + \\ucd9c\\ucc98) ======== */
function renderCommentary(ct){
  const el=document.getElementById('commentary-body');
  if(!el||!ct?.items)return;
  el.innerHTML=ct.items.map(x=>{
    const tc=x.tag==='\\uad6d\\ub0b4'?'domestic':x.tag==='\\ud574\\uc678'?'overseas':'neutral';
    const src=x.source?'<span class="cm-source">\\ucd9c\\ucc98: '+esc(x.source)+'</span>':'';
    return '<div class="cm-issue"><div class="cm-issue-hdr"><span class="cm-tag '+tc+'">'+esc(x.tag)+'</span>'+src+'</div><div class="cm-text">'+esc(x.text)+'</div></div>';
  }).join('');
}

/* ======== RATE CHART (\\ud0dc\\uadf8 \\ud1a0\\uae00) ======== */
function buildRateTags(){
  const w=document.getElementById('rate-tags');
  if(!w)return;
  w.innerHTML='';
  RKEYS.forEach((k,i)=>{
    const col=RC[i%RC.length];
    const on=RDEFS.includes(k);
    const t=document.createElement('span');
    t.className='rate-tag'+(on?' on':'');
    t.dataset.key=k;
    if(on)t.style.background=col;
    t.innerHTML='<span class="rtag-dot" style="background:'+col+'"></span>'+esc(HIST[k]?.label||k);
    t.onclick=()=>{
      const sel=document.querySelectorAll('#rate-tags .rate-tag.on').length;
      if(!t.classList.contains('on')&&sel>=8){alert('\\ucd5c\\ub300 8\\uac1c\\uae4c\\uc9c0 \\uc120\\ud0dd \\uac00\\ub2a5\\ud569\\ub2c8\\ub2e4.');return;}
      t.classList.toggle('on');
      t.style.background=t.classList.contains('on')?col:'';
    };
    w.appendChild(t);
  });
}
function rateTagAll(v){document.querySelectorAll('#rate-tags .rate-tag').forEach((t,i)=>{if(v&&i<8){t.classList.add('on');t.style.background=RC[i%RC.length];}else{t.classList.remove('on');t.style.background='';}});}
function rateTagDefaults(){document.querySelectorAll('#rate-tags .rate-tag').forEach((t,i)=>{const on=RDEFS.includes(t.dataset.key);t.classList.toggle('on',on);t.style.background=on?RC[i%RC.length]:'';})}

function renderRateChart(){
  const ctx=document.getElementById('rate-compare-chart');
  if(!ctx)return;
  if(rateChart)rateChart.destroy();
  const sel=[...document.querySelectorAll('#rate-tags .rate-tag.on')].map(t=>t.dataset.key);
  if(!sel.length)return;
  rateChart=new Chart(ctx,{
    type:'line',
    data:{labels:HIST.labels,datasets:sel.map((k,i)=>({
      label:HIST[k]?.label+' ('+HIST[k]?.unit+')',data:HIST[k]?.values,
      borderColor:RC[RKEYS.indexOf(k)%RC.length],backgroundColor:'transparent',
      borderWidth:2,pointRadius:1,pointHoverRadius:5,tension:0.3,
    }))},
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{labels:{font:{family:"'Malgun Gothic',sans-serif",size:11},color:'#333'}},
        tooltip:{callbacks:{label:c=>' '+c.dataset.label.split('(')[0].trim()+': '+c.parsed.y?.toFixed(3)+'%'}}
      },
      scales:{
        x:{ticks:{font:{size:9},maxTicksLimit:12},grid:{color:'#f0f0f0'}},
        y:{ticks:{font:{size:10},callback:v=>v.toFixed(2)+'%'},grid:{color:'#f0f0f0'}}
      }
    }
  });
}

/* ======== CHART POPUP ======== */
function openChart(name,cat,_ev){
  let hk=null;
  for(const [k,v] of Object.entries(HIST)){
    if(k==='labels'||k==='_note')continue;
    if(v?.label===name||k===name){hk=k;break;}
  }
  const dlabels=[],dvals=[];
  SORTED_DATES.forEach(dt=>{
    const d=ALL_DATA[dt];
    let v=null;
    const fi=(arr)=>(arr||[]).find(x=>x.name===name);
    if(cat==='\\uad6d\\ub0b4\\uae08\\ub9ac') v=fi(d.domestic_rates?.items)?.value;
    else if(cat==='\\uad6d\\ub0b4\\uc8fc\\uc2dd\\ud658\\uc728') v=fi(d.domestic_markets?.items)?.value;
    else if(cat==='\\ud574\\uc678\\uae08\\ub9ac') v=fi(d.overseas_rates?.items)?.value;
    else if(['\\ud574\\uc678\\uc8fc\\uc2dd','\\ud574\\uc678\\ud658\\uc728','\\uc554\\ud638\\ud654\\ud3d0','\\ud574\\uc678\\uc2dc\\uc7a5'].includes(cat))
      v=fi([...(d.overseas_markets?.stocks||[]),...(d.overseas_markets?.fx||[]),...(d.overseas_markets?.crypto||[])])?.value;
    else if(cat==='\\uc0c1\\ud488') v=fi(d.commodities?.items)?.value;
    if(v!=null){dlabels.push(dt.replace(/(\\d{4})(\\d{2})(\\d{2})/,'$1-$2-$3'));dvals.push(v);}
  });
  const hasH=hk&&HIST[hk]?.values?.length>0;
  const labels=hasH?HIST.labels.concat(dlabels):dlabels;
  const vals=hasH?HIST[hk].values.concat(dvals):dvals;
  const unit=hk?HIST[hk]?.unit:'';

  document.getElementById('cm-title').textContent=name+' ('+cat+')';
  document.getElementById('chart-modal').classList.add('open');
  if(popupChart){popupChart.destroy();popupChart=null;}
  const ctx2=document.getElementById('cm-canvas');

  if(!labels.length){document.getElementById('cm-meta').innerHTML='<span>\\uc2dc\\uacc4\\uc5f4 \\ub370\\uc774\\ud130 \\uc5c6\\uc74c</span>';return;}

  const last=vals[vals.length-1];
  const maxV=Math.max(...vals.filter(v=>v!=null));
  const minV=Math.min(...vals.filter(v=>v!=null));
  document.getElementById('cm-meta').innerHTML=
    '<span>\\ud604\\uc7ac: <strong>'+last?.toFixed(3)+' '+unit+'</strong></span>'+
    '<span>\\ucd5c\\uace0: <strong>'+maxV?.toFixed(3)+' '+unit+'</strong></span>'+
    '<span>\\ucd5c\\uc800: <strong>'+minV?.toFixed(3)+' '+unit+'</strong></span>'+
    '<span>\\ub370\\uc774\\ud130: <strong>'+labels.length+'\\uac1c \\ud3ec\\uc778\\ud2b8</strong></span>';

  requestAnimationFrame(()=>{
    popupChart=new Chart(ctx2,{
      type:'line',
      data:{labels,datasets:[{label:name,data:vals,borderColor:'#1a56c4',
        backgroundColor:'rgba(26,86,196,.08)',fill:true,borderWidth:2,pointRadius:2,pointHoverRadius:6,tension:0.2}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+name+': '+c.parsed.y?.toFixed(3)+' '+unit}}},
        scales:{
          x:{ticks:{font:{size:9},maxTicksLimit:12},grid:{color:'#f0f0f0'}},
          y:{ticks:{font:{size:10},callback:v=>v.toFixed(2)+' '+unit},grid:{color:'#f0f0f0'}}
        }
      }
    });
  });
}

function closeChartModal(){
  document.getElementById('chart-modal').classList.remove('open');
  if(popupChart){popupChart.destroy();popupChart=null;}
}

/* ======== VALIDATION ======== */
function openValidation(){document.getElementById('val-overlay').classList.add('open');runValidation();}
function closeValidation(){document.getElementById('val-overlay').classList.remove('open');}

function runValidation(){
  let ok=0,warn=0,err=0;
  const issues=[];
  SORTED_DATES.forEach(dt=>{
    const d=ALL_DATA[dt];
    const lbl=dt.replace(/(\\d{4})(\\d{2})(\\d{2})/,'$1-$2-$3');
    ['domestic_rates','domestic_markets','overseas_rates','overseas_markets','commodities','investor_flow'].forEach(k=>{
      if(!d[k]){issues.push({t:'err',lbl:'['+k+'] \\ub204\\ub77d',detail:lbl});err++;}else ok++;
    });
    (d.domestic_rates?.items||[]).forEach(x=>{
      if(x.value==null){issues.push({t:'err',lbl:'\\uad6d\\ub0b4\\uae08\\ub9ac '+x.name+': null',detail:lbl});err++;}
      else if(x.value<0.5||x.value>10){issues.push({t:'warn',lbl:'\\uad6d\\ub0b4\\uae08\\ub9ac '+x.name+': '+x.value?.toFixed(3)+'%',detail:lbl+' \\ubc94\\uc704 \\uc774\\ud0c8'});warn++;}
      else ok++;
    });
    (d.overseas_rates?.items||[]).forEach(x=>{
      if(x.value==null){issues.push({t:'err',lbl:'\\ud574\\uc678\\uae08\\ub9ac '+x.name+': null',detail:lbl});err++;}
      else if(x.value<0||x.value>15){issues.push({t:'warn',lbl:'\\ud574\\uc678\\uae08\\ub9ac '+x.name+': '+x.value?.toFixed(3)+'%',detail:lbl+' \\ubc94\\uc704 \\uc774\\ud0c8'});warn++;}
      else ok++;
    });
    const kospi=(d.domestic_markets?.items||[]).find(x=>x.name==='KOSPI');
    if(kospi){if(kospi.value<1000||kospi.value>5000){issues.push({t:'warn',lbl:'KOSPI: '+kospi.value?.toLocaleString(),detail:lbl+' (1,000~5,000 \\ubc94\\uc704 \\uc774\\ud0c8)'});warn++;}else ok++;}
    (d.indicators?.items||[]).forEach(x=>{
      if(x.actual&&x.forecast)ok++;
      else if(x.actual||x.forecast){issues.push({t:'warn',lbl:'\\uacbd\\uc81c\\uc9c0\\ud45c '+x.name+': \\ubd80\\ubd84 \\ub370\\uc774\\ud130',detail:lbl});warn++;}
    });
  });
  RKEYS.forEach(k=>{
    const vs=HIST[k]?.values||[];
    if(vs.length!==HIST.labels?.length){issues.push({t:'err',lbl:'HIST '+k+': \\uae38\\uc774 \\ubd88\\uc77c\\uce58',detail:vs.length+' vs '+HIST.labels?.length});err++;}
    else{const nl=vs.filter(v=>v==null).length;if(nl>0){issues.push({t:'warn',lbl:'HIST '+k+': null '+nl+'\\uac1c',detail:'\\uacb0\\uce21\\uce58'});warn++;}else ok++;}
  });

  const iconMap={ok:'\\u2713',warn:'!',err:'\\u2717'};
  const clsMap={ok:'vi-ok',warn:'vi-warn',err:'vi-err'};
  const shown=issues.slice(0,60);
  document.getElementById('val-body').innerHTML=
    '<div class="val-sec-title">\\ud83d\\uddd3 \\uc77c\\ubcc4 \\ub370\\uc774\\ud130 \\uac80\\uc99d ('+SORTED_DATES.length+'\\uac1c \\ub0a0\\uc9dc)</div>'+
    (shown.length?shown.map(c=>'<div class="val-row"><div class="val-icon '+clsMap[c.t]+'">'+iconMap[c.t]+'</div><div class="val-lbl">'+esc(c.lbl)+'</div><div class="val-detail">'+esc(c.detail)+'</div></div>').join('')
      :'<div class="val-row"><div class="val-icon vi-ok">\\u2713</div><div class="val-lbl">\\ubaa8\\ub4e0 \\uac80\\uc99d \\ud1b5\\uacfc</div></div>')+
    '<div class="val-sec-title" style="margin-top:14px">\\ud83d\\udcca \\uac80\\uc99d \\uaddc\\uce59</div>'+
    '<div style="font-size:11px;color:var(--gray);line-height:1.9;padding:4px 0">\\u2022 \\ud544\\uc218 \\ud30c\\uc77c 6\\uc885 \\uc874\\uc7ac \\uc5ec\\ubd80<br>\\u2022 \\uad6d\\ub0b4\\uae08\\ub9ac 0.5~10%, \\ud574\\uc678\\uae08\\ub9ac 0~15%<br>\\u2022 KOSPI 1,000~5,000 \\uc720\\ud6a8\\uc131<br>\\u2022 \\uacbd\\uc81c\\uc9c0\\ud45c \\uc2e4\\uc81c\\uce58/\\uc608\\uc0c1\\uce58 \\uc30d \\uc644\\uc804\\uc131<br>\\u2022 \\uc5ed\\uc0ac \\uc2dc\\uacc4\\uc5f4 \\uae38\\uc774 \\uc77c\\uce58 \\ubc0f \\uacb0\\uce21\\uce58</div>';

  document.getElementById('val-summary').innerHTML=
    '<div class="val-sum-item"><span style="color:#166534;font-weight:700">\\u2713 \\ud1b5\\uacfc:</span><span>'+ok+'\\uac74</span></div>'+
    '<div class="val-sum-item"><span style="color:#92400e;font-weight:700">! \\uacbd\\uace0:</span><span>'+warn+'\\uac74</span></div>'+
    '<div class="val-sum-item"><span style="color:#991b1b;font-weight:700">\\u2717 \\uc624\\ub958:</span><span>'+err+'\\uac74</span></div>'+
    '<div class="val-sum-item" style="margin-left:auto;color:var(--gray)">\\ucd1d '+(ok+warn+err)+'\\uac74 \\uac80\\uc99d</div>';
}

/* ======== CLAUDE AI PANEL ======== */
function toggleAI(){
  const p=document.getElementById('ai-panel');
  p.classList.toggle('open');
  if(p.classList.contains('open')){
    const d=ALL_DATA[activeDate];
    document.getElementById('ai-ctx-txt').textContent=activeDate.replace(/(\\d{4})(\\d{2})(\\d{2})/,'$1-$2-$3')+' \\ub370\\uc774\\ud130 (\\uae08\\ub9ac '+(d?.domestic_rates?.items?.length||0)+'\\uc885, \\uc9c0\\ud45c '+(d?.indicators?.items?.length||0)+'\\uac74)';
  }
}

function saveKey(){
  const k=document.getElementById('ai-key-input').value.trim();
  if(!k)return;
  localStorage.setItem('ant_key',k);
  document.getElementById('ai-key-row').innerHTML='<span style="color:#166534">\\u2713 API Key \\uc800\\uc7a5\\ub428</span><button onclick="resetKey()" style="margin-left:auto;background:none;border:none;color:#6b7280;cursor:pointer;font-size:10px">\\ubcc0\\uacbd</button>';
}
function resetKey(){
  localStorage.removeItem('ant_key');
  document.getElementById('ai-key-row').innerHTML='<span>API Key:</span><input type="password" id="ai-key-input" class="ai-key-input" placeholder="sk-ant-..." /><button class="ai-key-save" onclick="saveKey()">\\uc800\\uc7a5</button>';
}

function buildCtx(){
  const d=ALL_DATA[activeDate];
  if(!d)return '\\ub370\\uc774\\ud130 \\uc5c6\\uc74c';
  const lines=['=== Market Daily ('+activeDate+') ==='];
  lines.push('\\n[\\ud575\\uc2ec\\uc694\\uc57d] '+(d.summary?.text||'\\uc5c6\\uc74c'));
  lines.push('\\n[\\uad6d\\ub0b4\\uae08\\ub9ac]');
  (d.domestic_rates?.items||[]).forEach(x=>lines.push('  '+x.name+': '+x.value?.toFixed(3)+'% ('+x.prev_day_str+', YTD '+x.ytd_str+')'));
  lines.push('\\n[\\uad6d\\ub0b4\\uc8fc\\uc2dd/\\ud658\\uc728]');
  (d.domestic_markets?.items||[]).forEach(x=>lines.push('  '+x.name+': '+x.value?.toLocaleString()+' ('+x.prev_day_str+')'));
  lines.push('\\n[\\ud574\\uc678\\uae08\\ub9ac]');
  (d.overseas_rates?.items||[]).forEach(x=>lines.push('  '+x.name+': '+x.value?.toFixed(3)+'% ('+x.prev_day_str+')'));
  lines.push('\\n[\\ud574\\uc678\\uc8fc\\uc2dd/\\ud658\\uc728/\\uc554\\ud638]');
  [...(d.overseas_markets?.stocks||[]),...(d.overseas_markets?.fx||[]),...(d.overseas_markets?.crypto||[])].forEach(x=>lines.push('  '+x.name+': '+x.value?.toLocaleString()+' ('+x.prev_day_str+')'));
  lines.push('\\n[\\uc0c1\\ud488]');
  (d.commodities?.items||[]).forEach(x=>lines.push('  '+x.name+': '+x.value?.toLocaleString()+' ('+x.prev_day_str+')'));
  lines.push('\\n[\\uacbd\\uc81c\\uc9c0\\ud45c]');
  (d.indicators?.items||[]).forEach(x=>lines.push('  '+x.name+': \\uc2e4\\uc81c '+x.actual+', \\uc608\\uc0c1 '+x.forecast+' ('+x.eval+')'));
  lines.push('\\n[\\ud22c\\uc790\\uc790\\ub3d9\\ud5a5]');
  (d.investor_flow?.items||[]).forEach(x=>lines.push('  '+x.market+': \\uc678\\uad6d\\uc778 '+x.foreign?.toLocaleString()+'\\uc5b5, \\uae30\\uad00 '+x.institution?.toLocaleString()+'\\uc5b5, \\uac1c\\uc778 '+x.individual?.toLocaleString()+'\\uc5b5'));
  return lines.join('\\n');
}

async function sendAI(){
  const apiKey=localStorage.getItem('ant_key');
  if(!apiKey){alert('API Key\\ub97c \\uba3c\\uc800 \\uc800\\uc7a5\\ud574\\uc8fc\\uc138\\uc694.');return;}
  const ta=document.getElementById('ai-ta');
  const msg=ta.value.trim();
  if(!msg)return;
  ta.value='';
  appendMsg('user',msg);
  aiHistory.push({role:'user',content:msg});
  const th=appendMsg('thinking','\\ubd84\\uc11d \\uc911...');
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1024,
        system:'\\ub2f9\\uc2e0\\uc740 \\uae08\\uc735\\uc2dc\\uc7a5 \\uc804\\ubb38 \\uc560\\ub110\\ub9ac\\uc2a4\\ud2b8\\uc785\\ub2c8\\ub2e4. \\uc544\\ub798 Market Daily \\ub370\\uc774\\ud130\\ub97c \\uae30\\ubc18\\uc73c\\ub85c \\ud55c\\uad6d\\uc5b4\\ub85c \\uac04\\uacb0\\ud558\\uace0 \\uc815\\ud655\\ud558\\uac8c \\ub2f5\\ubcc0\\ud574\\uc8fc\\uc138\\uc694. \\ub370\\uc774\\ud130 \\uc218\\uce58\\ub97c \\uad6c\\uccb4\\uc801\\uc73c\\ub85c \\uc778\\uc6a9\\ud558\\uace0, 3~5\\ubb38\\uc7a5\\uc73c\\ub85c \\ub2f5\\ubcc0\\ud558\\uc138\\uc694.\\n\\n'+buildCtx(),
        messages:aiHistory.slice(-6)})
    });
    th.remove();
    if(!r.ok){const e=await r.json().catch(()=>({}));appendMsg('assistant','\\uc624\\ub958: '+(e.error?.message||r.statusText));aiHistory.pop();return;}
    const data=await r.json();
    const ans=data.content?.[0]?.text||'\\uc751\\ub2f5 \\uc5c6\\uc74c';
    appendMsg('assistant',ans);
    aiHistory.push({role:'assistant',content:ans});
  }catch(e){
    th.remove();
    appendMsg('assistant','\\uc5f0\\uacb0 \\uc624\\ub958: '+e.message+'\\n\\n(CORS \\uc815\\ucc45\\uc73c\\ub85c \\ube0c\\ub77c\\uc6b0\\uc800 \\uc9c1\\uc811 \\ud638\\ucd9c\\uc774 \\ucc28\\ub2e8\\ub420 \\uc218 \\uc788\\uc2b5\\ub2c8\\ub2e4. \\ub85c\\uceec \\uc2e4\\ud589 \\uc2dc\\uc5d0\\ub294 query_data.py\\ub97c \\uc774\\uc6a9\\ud574\\uc8fc\\uc138\\uc694.)');
    aiHistory.pop();
  }
}

function appendMsg(role,text){
  const m=document.getElementById('ai-msgs');
  const d=document.createElement('div');
  d.className='ai-msg '+role;
  d.textContent=text;
  m.appendChild(d);
  m.scrollTop=m.scrollHeight;
  return d;
}

/* ======== INIT ======== */
document.addEventListener('DOMContentLoaded',()=>{
  const sel=document.getElementById('date-sel');
  if(sel){
    SORTED_DATES.slice().reverse().forEach(d=>{
      const o=document.createElement('option');
      o.value=d;
      o.textContent=d.replace(/(\\d{4})(\\d{2})(\\d{2})/,'$1-$2-$3');
      if(d===activeDate)o.selected=true;
      sel.appendChild(o);
    });
    sel.addEventListener('change',ev=>switchDate(ev.target.value));
  }
  const qi=document.getElementById('q-input');
  if(qi)qi.addEventListener('keydown',ev=>{if(ev.key==='Enter')runQuery();});
  const ta=document.getElementById('ai-ta');
  if(ta)ta.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();sendAI();}});
  const saved=localStorage.getItem('ant_key');
  if(saved){document.getElementById('ai-key-row').innerHTML='<span style="color:#166534">\\u2713 API Key \\uc800\\uc7a5\\ub428</span><button onclick="resetKey()" style="margin-left:auto;background:none;border:none;color:#6b7280;cursor:pointer;font-size:10px">\\ubcc0\\uacbd</button>';}
  buildRateTags();
  renderRateChart();
  renderAll();
});
</script>
</body>
</html>"""

html = HEAD + BODY + JS + DATA_BLOCK + "\n" + JS_TAIL

with open(BASE / 'sample.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"OK: {len(html):,} chars")
