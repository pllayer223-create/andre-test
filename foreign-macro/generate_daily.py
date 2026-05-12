"""
Market Daily HTML 대시보드 생성기 (개선판)

포함 섹션:
  핵심요약 / KPI / 국내금리 / 국내주식환율 / 투자자동향 / 해외금리 /
  해외주식환율암호화폐 / 상품 / 경제지표 / 주요일정 /
  크레딧스프레드 / 코멘터리 / 금리비교차트 / 데이터검색

사용법:
  python generate_daily.py                   # 최신
  python generate_daily.py 20260512          # 날짜 지정
  python generate_daily.py --all             # 전체 재생성

출력:
  archive/daily/index.html
  archive/daily/YYYY/market_daily_YYYYMMDD.html
"""

import json, sys
from pathlib import Path
from html import escape as e

BASE      = Path(__file__).parent
DAILY_DIR = BASE / "data" / "daily"
HIST_PATH = BASE / "data" / "historical_daily.json"
OUT_ROOT  = BASE / "archive" / "daily"

# ── 파일 로더 ─────────────────────────────────────────────────────────
FILES = ["summary","indicators","schedule","domestic_rates","domestic_markets",
         "investor_flow","overseas_rates","overseas_markets","commodities",
         "commentary","credit_spread"]

def load_daily(report_dt: str) -> dict:
    d   = DAILY_DIR / report_dt
    out = {"report_date": report_dt}
    for f in FILES:
        fp = d / f"{f}.json"
        out[f] = json.loads(fp.read_text(encoding="utf-8")) if fp.exists() else {}
    return out

def load_all_daily() -> dict:
    all_data = {}
    for folder in sorted(DAILY_DIR.iterdir()):
        if folder.is_dir() and len(folder.name) == 8 and folder.name.isdigit():
            all_data[folder.name] = load_daily(folder.name)
    return all_data

def load_hist() -> dict:
    return json.loads(HIST_PATH.read_text(encoding="utf-8")) if HIST_PATH.exists() else {}


# ── CSS ──────────────────────────────────────────────────────────────
CSS = """
:root{
  --blue:#003087;--blue2:#1a56c4;--blue-lt:#dbeafe;
  --pos:#0a6c2a;--neg:#c00000;--gray:#6b7280;
  --border:#e5e7eb;--bg:#f3f4f6;--card:#ffffff;
  --nav:50px;--r:8px;
  --imp-high:#fef9c3;--imp-mid:#f0f9ff;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:"Malgun Gothic","맑은 고딕","Apple SD Gothic Neo",sans-serif;
     font-size:12px;line-height:1.55;background:var(--bg);color:#111827;padding-top:var(--nav)}

/* ── NAV ── */
nav{position:fixed;top:0;left:0;right:0;z-index:300;height:var(--nav);
    background:var(--blue);display:flex;align-items:center;padding:0 14px;gap:8px;
    box-shadow:0 2px 8px rgba(0,0,0,.4)}
.nav-brand{font-weight:800;font-size:14px;color:#fff;white-space:nowrap;
           padding-right:12px;border-right:1px solid rgba(255,255,255,.3)}
.nav-brand small{color:#ffd700;font-size:10px;margin-left:5px;font-weight:400}
nav select,.btn-nav{background:rgba(255,255,255,.15);color:#fff;
                     border:1px solid rgba(255,255,255,.3);border-radius:5px;
                     padding:3px 8px;font-size:11px;cursor:pointer;font-family:inherit}
nav select option{background:#003087}
.btn-arrow{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);
           border-radius:5px;padding:3px 9px;font-size:13px;cursor:pointer;line-height:1;
           font-family:inherit;transition:background .15s}
.btn-arrow:hover{background:rgba(255,255,255,.25)}
.nav-date-count{font-size:10px;color:rgba(255,255,255,.6);white-space:nowrap}
.btn-print{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);
           border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:inherit;
           margin-left:auto}

/* ── SEARCH BAR ── */
.search-wrap{background:#1a3a6e;padding:6px 14px;display:flex;gap:8px;align-items:center}
.search-input{flex:1;padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.3);
              background:rgba(255,255,255,.1);color:#fff;font-size:12px;font-family:inherit;
              outline:none}
.search-input::placeholder{color:rgba(255,255,255,.5)}
.search-input:focus{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.6)}
.btn-search{background:#2563eb;color:#fff;border:none;border-radius:6px;
            padding:6px 14px;font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap}
.search-hint{font-size:10px;color:rgba(255,255,255,.5)}

/* ── REPORT HEADER ── */
.rpt-header{background:#fff;border-bottom:3px solid var(--blue);
            padding:8px 16px;display:flex;justify-content:space-between;align-items:center}
.rh-logo{font-size:20px;font-weight:900;color:var(--blue);letter-spacing:-1px}
.rh-title{font-size:17px;font-weight:700;letter-spacing:1px;color:#111}
.rh-dept{font-size:10px;color:var(--gray)}
.rh-date{font-size:14px;font-weight:700;color:var(--blue)}

/* ── SUMMARY PILL ── */
.summary-pill{background:linear-gradient(90deg,#1e3a8a,#1a56c4);
              color:#fff;padding:10px 18px;margin:8px 14px;
              border-radius:8px;font-size:12px;font-weight:600;line-height:1.7;
              border-left:4px solid #ffd700}

/* ── KPI ── */
.kpi-row{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px}
.kpi{flex:1;min-width:100px;background:var(--card);border:1px solid var(--border);
     border-radius:var(--r);padding:8px 10px;text-align:center}
.kpi-lbl{font-size:10px;color:var(--gray);margin-bottom:2px}
.kpi-val{font-size:15px;font-weight:700;color:var(--blue)}
.kpi-chg{font-size:10px;margin-top:2px}

/* ── MAIN LAYOUT ── */
main{max-width:1140px;margin:0 auto;padding:8px 14px 60px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.one-col{margin-bottom:10px}
@media(max-width:720px){.two-col{grid-template-columns:1fr}}

/* ── SECTION CARD ── */
.sec{background:var(--card);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
.sec-head{background:var(--blue);color:#fff;font-weight:700;font-size:11px;
          padding:5px 10px;letter-spacing:.4px;display:flex;justify-content:space-between;align-items:center}
.sec-head a{color:rgba(255,255,255,.7);font-size:10px;font-weight:400;text-decoration:none}
.sec-head a:hover{color:#fff}

/* ── TABLE ── */
table{width:100%;border-collapse:collapse;font-size:11px}
thead th{background:#e8edf5;color:#1e3a6e;font-weight:700;padding:5px 8px;
         text-align:center;white-space:nowrap;border-bottom:1px solid var(--border)}
thead th:first-child{text-align:left}
tbody tr{border-bottom:1px solid #f0f0f0}
tbody tr:last-child{border-bottom:none}
tbody tr:nth-child(even){background:#fafbfc}
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

/* ── FLOW TABLE ── */
th.f-hdr{color:#1a56c4}.th.i-hdr{color:#7c3aed}.th.r-hdr{color:#d97706}

/* ── SCHEDULE ── */
.sch-row{display:grid;grid-template-columns:46px 50px 36px 1fr 70px 34px;
         gap:6px;align-items:center;padding:5px 10px;border-bottom:1px solid #f0f0f0;font-size:11px}
.sch-row:last-child{border-bottom:none}
.sch-row.imp-high{background:var(--imp-high);border-left:3px solid #eab308}
.sch-row.imp-mid{background:var(--imp-mid);border-left:3px solid var(--blue2)}
.sch-date{font-weight:700;color:var(--blue);font-size:10px}
.sch-time{color:var(--gray);font-size:10px}
.sch-country{background:#e5e7eb;border-radius:3px;padding:1px 4px;font-size:9px;text-align:center}
.sch-imp{font-size:11px;text-align:right}
@media(max-width:600px){.sch-row{grid-template-columns:44px 1fr 30px}}

/* ── CHARTS ── */
.chart-wrap{position:relative;padding:10px 12px 6px}
.chart-canvas{height:190px}
.chart-canvas-lg{height:260px}

/* ── COMPARE CHART ── */
.rate-checks{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 6px}
.rate-checks label{display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;
                    background:#f8fafc;border:1px solid var(--border);border-radius:5px;
                    padding:3px 8px;transition:all .15s;user-select:none}
.rate-checks label.checked{background:var(--blue-lt);border-color:var(--blue2);color:var(--blue)}
.rate-checks label:hover{border-color:var(--blue2)}
.legend-dot{width:10px;height:10px;border-radius:2px;display:inline-block;flex-shrink:0}
.btn-update{background:var(--blue2);color:#fff;border:none;border-radius:6px;
            padding:5px 14px;font-size:11px;cursor:pointer;font-family:inherit;margin:0 12px 8px}
.btn-update:hover{background:var(--blue)}

/* ── SEARCH RESULT ── */
.search-result{background:var(--card);border:1px solid var(--border);border-radius:var(--r);
               padding:12px;margin-bottom:10px;display:none}
.search-result.active{display:block}
.sr-title{font-weight:700;color:var(--blue);margin-bottom:8px;font-size:12px}
.sr-empty{color:var(--gray);font-style:italic;font-size:11px;padding:6px}

/* ── COMMENTARY ── */
.cm-row{display:flex;gap:8px;padding:6px 10px;border-bottom:1px solid #f0f0f0;
        font-size:11px;line-height:1.65}
.cm-row:last-child{border-bottom:none}
.cm-tag{background:var(--blue2);color:#fff;font-size:10px;font-weight:700;
        padding:1px 6px;border-radius:3px;white-space:nowrap;align-self:flex-start;margin-top:2px;flex-shrink:0}

/* ── FOOTER ── */
footer{border-top:1px solid var(--border);padding:12px;text-align:center;
       font-size:10px;color:var(--gray);font-style:italic;margin-top:20px}

/* ── PRINT ── */
@media print{
  nav,.search-wrap,.btn-print,.btn-update,.rate-checks,.search-result{display:none!important}
  body{padding-top:0;font-size:10px}
  .two-col{grid-template-columns:1fr 1fr!important}
  .chart-canvas,.chart-canvas-lg{height:160px}
}
"""

# ── JavaScript ────────────────────────────────────────────────────────
def make_js(all_data_json: str, hist_json: str) -> str:
    return r"""
const ALL_DATA = """ + all_data_json + r""";
const HIST     = """ + hist_json + r""";

const SORTED_DATES = Object.keys(ALL_DATA).sort();
let activeDate = SORTED_DATES[SORTED_DATES.length - 1];
let creditChart = null;
let compareChart = null;

const RATE_CHART_COLORS = [
  '#1a56c4','#c00000','#0a6c2a','#d97706','#7c3aed',
  '#0891b2','#be185d','#065f46','#92400e','#374151',
  '#6366f1','#ec4899','#14b8a6','#f59e0b','#84cc16'
];

/* ── 날짜 탐색 ── */
function switchReport(dt) {
  activeDate = dt;
  const sel = document.getElementById('date-sel');
  if (sel) sel.value = dt;
  renderAll();
}

function navDate(delta) {
  const idx = SORTED_DATES.indexOf(activeDate);
  const newIdx = idx + delta;
  if (newIdx >= 0 && newIdx < SORTED_DATES.length) switchReport(SORTED_DATES[newIdx]);
}

/* ── 유틸 ── */
function esc(t) {
  if (t == null) return '';
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function vcls(s) {
  const t = String(s || '');
  return t.startsWith('▲') || t.startsWith('+') ? 'pos' :
         t.startsWith('▼') || t.startsWith('-') ? 'neg' : '';
}
function evalCls(s) {
  if (!s) return '';
  if (s.includes('상회')) return 'eval-up';
  if (s.includes('하회')) return 'eval-dn';
  return 'eval-eq';
}
function fmtFlow(v) {
  if (v == null) return '—';
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  return `<span class="${cls}">${(v > 0 ? '+' : '') + v.toLocaleString()}</span>`;
}
function tbl(headers, rows, impFn) {
  const ths = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const trs = rows.map(r => {
    const imp = impFn ? impFn(r) : '';
    const tds = r.map((v, i) => {
      const t = esc(String(v ?? '—'));
      const cls = i > 0 ? vcls(t) : '';
      return `<td class="${cls}">${t}</td>`;
    }).join('');
    return `<tr class="${imp}">${tds}</tr>`;
  }).join('');
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

/* ── 전체 렌더링 ── */
function renderAll() {
  const d = ALL_DATA[activeDate];
  if (!d) return;

  /* 날짜 카운터 */
  const idx = SORTED_DATES.indexOf(activeDate);
  document.getElementById('date-count').textContent =
    `${idx + 1} / ${SORTED_DATES.length}`;

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
  renderCreditChart(d.credit_spread);
}

function renderHeader(d) {
  const dd = d.domestic_rates?.data_date || d.domestic_markets?.data_date || '';
  const weekday = ['(일)','(월)','(화)','(수)','(목)','(금)','(토)'];
  const rptObj  = new Date(activeDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  document.getElementById('rh-date').textContent =
    activeDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + ' ' + weekday[rptObj.getDay()];
  const dtObj2 = new Date(dd);
  document.getElementById('rh-data-date').textContent =
    dd.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1.$2.$3') + ' ' + weekday[dtObj2.getDay()];
}

function renderSummary(s) {
  const el = document.getElementById('summary-text');
  if (!el) return;
  el.textContent = s?.text || '—';
  document.getElementById('summary-pill').style.display = s?.text ? 'block' : 'none';
}

function renderKpi(d) {
  const el = document.getElementById('kpi-row');
  if (!el) return;
  const mkt = d.domestic_markets?.items || [];
  const os  = d.overseas_rates?.items  || [];
  const com = d.commodities?.items     || [];
  const osm = d.overseas_markets?.stocks || [];
  const get = (arr, name) => arr.find(x => x.name === name) || {};
  const items = [
    { l: 'KOSPI',   v: get(mkt,'KOSPI').value?.toLocaleString()    || '—', c: get(mkt,'KOSPI').prev_day_str || '' },
    { l: 'USD/KRW', v: get(mkt,'USDKRW').value?.toLocaleString()   || '—', c: get(mkt,'USDKRW').prev_day_str || '' },
    { l: '미국 10Y',v: (get(os,'미국 10Y').value || '—') + (get(os,'미국 10Y').value ? '%' : ''), c: get(os,'미국 10Y').prev_day_str || '' },
    { l: 'WTI',     v: '$' + (get(com,'WTI').value || '—'),               c: get(com,'WTI').prev_day_str || '' },
    { l: 'S&P 500', v: get(osm,'S&P 500').value?.toLocaleString()  || '—', c: get(osm,'S&P 500').prev_day_str || '' },
  ];
  el.innerHTML = items.map(k => `<div class="kpi">
    <div class="kpi-lbl">${k.l}</div>
    <div class="kpi-val">${esc(String(k.v))}</div>
    <div class="kpi-chg ${vcls(k.c)}">${esc(k.c)}</div>
  </div>`).join('');
}

function renderDomRates(dr) {
  const el = document.getElementById('dom-rates-body');
  if (!el || !dr?.items) return;
  const dd = (dr.data_date || '').replace(/\d{4}-(\d{2}-\d{2})/, '$1');
  el.innerHTML = tbl([`구분`, dd, '전일대비', '전년말대비'],
    dr.items.map(x => [x.name, x.value?.toFixed(3) || '—', x.prev_day_str || '—', x.ytd_str || '—']));
}

function renderDomMkt(dm) {
  const el = document.getElementById('dom-mkt-body');
  if (!el || !dm?.items) return;
  const dd = (dm.data_date || '').replace(/\d{4}-(\d{2}-\d{2})/, '$1');
  el.innerHTML = tbl([`구분`, dd, '전일대비', '전년말대비'],
    dm.items.map(x => [x.name, x.value?.toLocaleString() || '—', x.prev_day_str || '—', x.ytd_str || '—']));
}

function renderFlow(fl) {
  const el = document.getElementById('flow-body');
  if (!el || !fl?.items) return;
  el.innerHTML = `<table><thead><tr>
    <th style="text-align:left">시장</th>
    <th style="color:#1a56c4">외국인</th>
    <th style="color:#7c3aed">기관</th>
    <th style="color:#d97706">개인</th>
  </tr></thead><tbody>
    ${fl.items.map(x => `<tr>
      <td style="text-align:left;font-weight:500;color:#1e3a6e">${esc(x.market)}</td>
      <td>${fmtFlow(x.foreign)}</td>
      <td>${fmtFlow(x.institution)}</td>
      <td>${fmtFlow(x.individual)}</td>
    </tr>`).join('')}
  </tbody></table>`;
  const unitEl = document.getElementById('flow-unit');
  if (unitEl) unitEl.textContent = '단위: ' + (fl.unit || '억원');
}

function renderOsRates(or_) {
  const el = document.getElementById('os-rates-body');
  if (!el || !or_?.items) return;
  const dd = (or_.data_date || '').replace(/\d{4}-(\d{2}-\d{2})/, '$1');
  el.innerHTML = tbl([`구분`, dd, '전일대비', '전년말대비'],
    or_.items.map(x => [x.name, x.value?.toFixed(3) || '—', x.prev_day_str || '—', x.ytd_str || '—']));
}

function renderOsMkt(om) {
  const el = document.getElementById('os-mkt-body');
  if (!el || !om) return;
  const dd = (om.data_date || '').replace(/\d{4}-(\d{2}-\d{2})/, '$1');
  const rows = [
    ...(om.stocks || []).map(x => [x.name, x.value?.toLocaleString() || '—', x.prev_day_str || '—', x.ytd_str || '—']),
    ...(om.fx     || []).map(x => [x.name, x.value?.toLocaleString() || '—', x.prev_day_str || '—', x.ytd_str || '—']),
    ...(om.crypto || []).map(x => [x.name, x.value?.toLocaleString() || '—', x.prev_day_str || '—', x.ytd_str || '—']),
  ];
  el.innerHTML = tbl([`구분`, dd, '전일대비', '전년말대비'], rows);
}

function renderComm(cm) {
  const el = document.getElementById('comm-body');
  if (!el || !cm?.items) return;
  const dd = (cm.data_date || '').replace(/\d{4}-(\d{2}-\d{2})/, '$1');
  el.innerHTML = tbl([`구분`, dd, '전일대비', '전년말대비'],
    cm.items.map(x => [x.name, x.value?.toLocaleString() || '—', x.prev_day_str || '—', x.ytd_str || '—']));
}

function renderIndicators(ind) {
  const el = document.getElementById('indicators-body');
  if (!el) return;
  if (!ind?.items?.length) { el.innerHTML = '<p class="notice">데이터 없음</p>'; return; }
  el.innerHTML = `<table><thead><tr>
    <th style="text-align:left">지표명</th><th>발표일</th><th>실제치</th>
    <th>예상치</th><th>전월치</th><th>평가</th>
  </tr></thead><tbody>
    ${ind.items.map(x => `<tr>
      <td style="text-align:left;font-weight:500;color:#1e3a6e">${esc(x.name)}</td>
      <td>${esc(x.date)}</td>
      <td class="${vcls(x.eval === '상회' ? '+' : x.eval === '하회' ? '-' : '')}">${esc(x.actual)}</td>
      <td>${esc(x.forecast)}</td>
      <td>${esc(x.previous)}</td>
      <td class="${evalCls(x.eval)}">${esc(x.eval)}</td>
    </tr>`).join('')}
  </tbody></table>
  <p class="notice">${esc(ind.note || '')}</p>`;
}

function renderSchedule(sch) {
  const el = document.getElementById('schedule-body');
  if (!el) return;
  if (!sch?.items?.length) { el.innerHTML = '<p class="notice">일정 없음</p>'; return; }
  el.innerHTML = sch.items.map(x => {
    const imp = x.importance?.includes('★★★') ? 'imp-high' :
                x.importance?.includes('★★')  ? 'imp-mid' : '';
    return `<div class="sch-row ${imp}">
      <span class="sch-date">${esc(x.date)}</span>
      <span class="sch-time">${esc(x.time)}</span>
      <span class="sch-country">${esc(x.country)}</span>
      <span>${esc(x.event)}</span>
      <span style="font-size:10px;color:var(--gray);text-align:right">예상: ${esc(x.forecast)}</span>
      <span class="sch-imp">${esc(x.importance)}</span>
    </div>`;
  }).join('') + `<p class="notice">${esc(sch.note || '')}</p>`;
}

function renderCommentary(ct) {
  const el = document.getElementById('commentary-body');
  if (!el || !ct?.items) return;
  el.innerHTML = ct.items.map(x =>
    `<div class="cm-row"><span class="cm-tag">${esc(x.tag)}</span><span>${esc(x.text)}</span></div>`
  ).join('');
}

function renderCreditChart(cs) {
  const ctx = document.getElementById('credit-chart');
  if (!ctx || !cs) return;
  if (creditChart) creditChart.destroy();
  creditChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: cs.labels || [],
      datasets: [
        { type: 'bar',  label: '스프레드(우축)', data: cs.spread || [],
          backgroundColor: 'rgba(255,215,0,.7)', yAxisID: 'y2', order: 2 },
        { type: 'line', label: '국고 2년',        data: cs.gov_2y || [],
          borderColor: '#1a56c4', backgroundColor: 'transparent',
          borderWidth: 1.5, pointRadius: 2, yAxisID: 'y1', order: 1 },
        { type: 'line', label: '회사채 AA 2년',   data: cs.corp_aa_2y || [],
          borderColor: '#c00000', backgroundColor: 'transparent',
          borderWidth: 1.5, pointRadius: 2, yAxisID: 'y1', order: 1 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { family:"'Malgun Gothic',sans-serif", size:10 }, color:'#333' } } },
      scales: {
        x: { ticks: { font: { size: 9 }, maxTicksLimit: 8 }, grid: { color: '#f0f0f0' } },
        y1: { type:'linear', position:'left',  ticks: { font:{size:9}, callback: v => v.toFixed(2)+'%' }, grid: { color:'#f0f0f0' } },
        y2: { type:'linear', position:'right', ticks: { font:{size:9}, callback: v => v.toFixed(2) },   grid: { drawOnChartArea: false } },
      }
    }
  });
}

/* ── 금리 비교 차트 ── */
const RATE_SERIES_KEYS = Object.keys(HIST).filter(k => {
  if (k === 'labels' || k === '_note') return false;
  const v = HIST[k];
  return typeof v === 'object' && (v.unit === '%' || v.unit === '%p');
});

function buildRateChecks() {
  const wrap = document.getElementById('rate-checks');
  if (!wrap) return;
  const defaults = ['국고3y', '회사3y_aa', '은행2y', '기타2y_aa'];
  RATE_SERIES_KEYS.forEach((k, i) => {
    const color   = RATE_CHART_COLORS[i % RATE_CHART_COLORS.length];
    const checked = defaults.includes(k);
    wrap.innerHTML += `<label id="rcl_${k}" class="${checked ? 'checked' : ''}">
      <input type="checkbox" value="${k}" ${checked ? 'checked' : ''}
             onchange="this.closest('label').classList.toggle('checked',this.checked)">
      <span class="legend-dot" style="background:${color}"></span>
      ${HIST[k]?.label || k}
    </label>`;
  });
}

function renderRateChart() {
  const ctx = document.getElementById('rate-compare-chart');
  if (!ctx) return;
  if (compareChart) compareChart.destroy();

  const selected = [...document.querySelectorAll('#rate-checks input:checked')].map(cb => cb.value);
  if (!selected.length) return;

  compareChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: HIST.labels,
      datasets: selected.map((k, i) => ({
        label: HIST[k]?.label + ` (${HIST[k]?.unit})`,
        data:  HIST[k]?.values,
        borderColor: RATE_CHART_COLORS[RATE_SERIES_KEYS.indexOf(k) % RATE_CHART_COLORS.length],
        backgroundColor: 'transparent',
        borderWidth: 2, pointRadius: 1, pointHoverRadius: 5, tension: 0.3,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { font: { family:"'Malgun Gothic',sans-serif", size:11 }, color:'#333' } },
        tooltip: { callbacks: {
          label: ctx => ` ${ctx.dataset.label.split('(')[0].trim()}: ${ctx.parsed.y?.toFixed(3)}%`
        }}
      },
      scales: {
        x: { ticks: { font: { size: 9 }, maxTicksLimit: 12 }, grid: { color: '#f0f0f0' } },
        y: { ticks: { font: { size: 10 }, callback: v => v.toFixed(2) + '%' }, grid: { color: '#f0f0f0' } }
      }
    }
  });
}

/* ── 데이터 검색 / 쿼리 ── */
function runSearch() {
  const q   = (document.getElementById('search-input')?.value || '').trim();
  const res = document.getElementById('search-result');
  if (!res) return;
  if (!q) { res.classList.remove('active'); return; }

  const ql = q.toLowerCase();
  const rows = [];

  SORTED_DATES.forEach(dt => {
    const d = ALL_DATA[dt];
    const dd = d.domestic_rates?.data_date || dt;

    // 국내 금리
    (d.domestic_rates?.items || []).forEach(x => {
      if (x.name.includes(q) || ql.includes(x.name.toLowerCase().replace(/\s/g,''))) {
        rows.push([dt, '국내금리', x.name, x.value?.toFixed(3) + '%', x.prev_day_str || '—', x.ytd_str || '—']);
      }
    });
    // 국내 주식/환율
    (d.domestic_markets?.items || []).forEach(x => {
      if (x.name.toLowerCase().includes(ql) || ql.includes(x.name.toLowerCase())) {
        rows.push([dt, '국내주식환율', x.name, x.value?.toLocaleString(), x.prev_day_str || '—', x.ytd_str || '—']);
      }
    });
    // 해외 금리
    (d.overseas_rates?.items || []).forEach(x => {
      if (x.name.toLowerCase().includes(ql) || ql.replace(/\s/g,'').includes(x.name.toLowerCase().replace(/\s/g,''))) {
        rows.push([dt, '해외금리', x.name, x.value?.toFixed(3) + '%', x.prev_day_str || '—', x.ytd_str || '—']);
      }
    });
    // 해외 주식/환율/암호화폐
    [...(d.overseas_markets?.stocks||[]), ...(d.overseas_markets?.fx||[]), ...(d.overseas_markets?.crypto||[])].forEach(x => {
      if (x.name.toLowerCase().includes(ql)) {
        rows.push([dt, '해외시장', x.name, x.value?.toLocaleString(), x.prev_day_str || '—', x.ytd_str || '—']);
      }
    });
    // 상품
    (d.commodities?.items || []).forEach(x => {
      if (x.name.toLowerCase().includes(ql) || ql.includes(x.name.toLowerCase())) {
        rows.push([dt, '상품', x.name, x.value?.toLocaleString(), x.prev_day_str || '—', x.ytd_str || '—']);
      }
    });
    // 경제지표
    (d.indicators?.items || []).forEach(x => {
      if (x.name.includes(q)) {
        rows.push([dt, '경제지표', x.name, `실제: ${x.actual}`, `예상: ${x.forecast}`, x.eval || '—']);
      }
    });
  });

  res.classList.add('active');
  if (!rows.length) {
    res.innerHTML = `<div class="sr-title">검색: "${esc(q)}"</div>
      <div class="sr-empty">검색 결과가 없습니다. (국내금리·주식환율·해외금리·주식·상품·경제지표 검색 가능)</div>`;
    return;
  }

  const tableHTML = `<table><thead><tr>
    <th>날짜</th><th>구분</th><th>항목</th><th>값</th><th>전일대비</th><th>전년말/기타</th>
  </tr></thead><tbody>
    ${rows.map(r => `<tr>${r.map((v,i) => `<td class="${i>3?vcls(v):''}">${esc(String(v))}</td>`).join('')}</tr>`).join('')}
  </tbody></table>`;
  res.innerHTML = `<div class="sr-title">검색: "${esc(q)}" — ${rows.length}건</div>${tableHTML}`;
}

/* ── 초기화 ── */
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('date-sel');
  if (sel) {
    SORTED_DATES.slice().reverse().forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
      if (d === activeDate) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', ev => switchReport(ev.target.value));
  }

  const si = document.getElementById('search-input');
  if (si) si.addEventListener('keydown', ev => { if (ev.key === 'Enter') runSearch(); });

  buildRateChecks();
  renderRateChart();
  renderAll();
});
"""


# ── HTML 빌더 ─────────────────────────────────────────────────────────
def build_index_html(all_data: dict, hist: dict) -> str:
    all_js  = json.dumps(all_data, ensure_ascii=False)
    hist_js = json.dumps(hist,     ensure_ascii=False)

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Market Daily</title>
<style>{CSS}</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
</head>
<body>

<!-- 상단 내비게이션 -->
<nav>
  <span class="nav-brand">Market Daily<small>재무실 자금운용본부</small></span>
  <button class="btn-arrow" onclick="navDate(-1)" title="이전 날짜">◀</button>
  <select id="date-sel" title="날짜 선택"></select>
  <button class="btn-arrow" onclick="navDate(+1)" title="다음 날짜">▶</button>
  <span class="nav-date-count" id="date-count"></span>
  <button class="btn-print" onclick="window.print()">🖨 인쇄</button>
</nav>

<!-- 검색 바 -->
<div class="search-wrap">
  <input id="search-input" class="search-input" type="text"
         placeholder="데이터 검색/쿼리 (예: 국고채 3Y, WTI, 비트코인, CPI ...)" />
  <button class="btn-search" onclick="runSearch()">검색</button>
  <span class="search-hint">전체 날짜 범위 검색 | Enter 키 지원</span>
</div>

<!-- 검색 결과 -->
<div style="max-width:1140px;margin:0 auto;padding:0 14px">
  <div id="search-result" class="search-result"></div>
</div>

<!-- 보고서 헤더 -->
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

<!-- 핵심 요약 -->
<div id="summary-pill" class="summary-pill">
  💡 <span id="summary-text"></span>
</div>

<!-- KPI -->
<div class="kpi-row" id="kpi-row"></div>

<main>

<!-- ① 국내/해외 시장 데이터 -->
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
      <div class="sec-head">투자자별 전일 동향 (<span id="flow-unit">억원</span>)</div>
      <div id="flow-body"></div>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:10px">
    <div class="sec">
      <div class="sec-head">해외 금리
        <a href="https://investing.com" target="_blank" rel="noopener">↗ Investing</a>
      </div>
      <div id="os-rates-body"></div>
    </div>
    <div class="sec">
      <div class="sec-head">해외 주식, 환율 및 암호화폐</div>
      <div id="os-mkt-body"></div>
    </div>
    <div class="sec">
      <div class="sec-head">상품</div>
      <div id="comm-body"></div>
    </div>
  </div>
</div>

<!-- ② 경제지표 / 주요 일정 -->
<div class="two-col">
  <div class="sec">
    <div class="sec-head">최근 경제지표 발표</div>
    <div id="indicators-body"></div>
  </div>
  <div class="sec">
    <div class="sec-head">주요 일정 (예정)</div>
    <div id="schedule-body"></div>
  </div>
</div>

<!-- ③ 크레딧 스프레드 / 코멘터리 -->
<div class="two-col">
  <div class="sec">
    <div class="sec-head">크레딧 스프레드</div>
    <div class="chart-wrap"><canvas id="credit-chart" class="chart-canvas"></canvas></div>
  </div>
  <div class="sec">
    <div class="sec-head">코멘터리</div>
    <div id="commentary-body"></div>
  </div>
</div>

<!-- ④ 금리 비교 차트 (멀티 선택) -->
<div class="sec one-col">
  <div class="sec-head">금리 비교 차트 — 복수 선택 가능 (3년 월별)</div>
  <div class="rate-checks" id="rate-checks"></div>
  <button class="btn-update" onclick="renderRateChart()">차트 업데이트</button>
  <div class="chart-wrap"><canvas id="rate-compare-chart" class="chart-canvas-lg"></canvas></div>
  <p class="notice" style="padding:4px 12px 8px">
    출처: data.krx.co.kr | 2023-05 ~ 2026-05 월별 데이터
  </p>
</div>

</main>

<footer>
  본 보고서는 공개된 자료를 기반으로 정보 제공 목적으로 작성되었습니다.
  투자 권유 또는 의사결정의 근거로 활용 시 추가적인 검토가 필요합니다.
</footer>

<script>
{make_js(all_js, hist_js)}
</script>
</body>
</html>"""


def build_print_html(d: dict, report_dt: str) -> str:
    """개별 인쇄용 정적 HTML."""
    dr  = d.get("domestic_rates", {})
    dm  = d.get("domestic_markets", {})
    fl  = d.get("investor_flow", {})
    or_ = d.get("overseas_rates", {})
    om  = d.get("overseas_markets", {})
    cm  = d.get("commodities", {})
    ind = d.get("indicators", {})
    sch = d.get("schedule", {})
    ct  = d.get("commentary", {})
    sm  = d.get("summary", {})
    data_dt = dr.get("data_date", "")

    try:
        from datetime import date as dobj
        y, mo, da = map(int, data_dt.split("-"))
        wd = ["(월)","(화)","(수)","(목)","(금)","(토)","(일)"][dobj(y,mo,da).weekday()]
        data_label = f"{data_dt.replace('-','.')} {wd}"
    except Exception:
        data_label = data_dt

    try:
        from datetime import date as dobj
        y2, mo2, da2 = int(report_dt[:4]), int(report_dt[4:6]), int(report_dt[6:])
        wd2 = ["(월)","(화)","(수)","(목)","(금)","(토)","(일)"][dobj(y2,mo2,da2).weekday()]
        rdt_fmt = f"{report_dt[:4]}.{report_dt[4:6]}.{report_dt[6:]} {wd2}"
    except Exception:
        rdt_fmt = report_dt

    def tbl_s(headers, rows, imp_fn=None):
        ths = "".join(f"<th>{e(str(h))}</th>" for h in headers)
        trs = ""
        for i, row in enumerate(rows):
            bg  = ' style="background:#fafbfc"' if i % 2 == 1 else ""
            imp = f' class="{imp_fn(row)}"' if imp_fn else ""
            tds = ""
            for j, v in enumerate(row):
                t   = e(str(v or "—"))
                cls = ""
                if j > 0:
                    if t.startswith("▲"): cls = ' style="color:#0a6c2a;font-weight:700"'
                    elif t.startswith("▼"): cls = ' style="color:#c00000;font-weight:700"'
                    elif t == "상회": cls = ' style="color:#0a6c2a;font-weight:700"'
                    elif t == "하회": cls = ' style="color:#c00000;font-weight:700"'
                tds += f"<td{cls}>{t}</td>"
            trs += f"<tr{bg}{imp}>{tds}</tr>"
        return f'<table><thead><tr>{ths}</tr></thead><tbody>{trs}</tbody></table>'

    left = ""
    if dr.get("items"):
        left += '<div class="sh">국내 금리</div>'
        left += tbl_s([f"구분", data_label, "전일대비", "전년말대비"],
            [[x["name"], f"{x['value']:.3f}", x.get("prev_day_str","—"), x.get("ytd_str","—")] for x in dr["items"]])
    if dm.get("items"):
        left += '<div class="sh">국내 주식 및 환율</div>'
        left += tbl_s([f"구분", data_label, "전일대비", "전년말대비"],
            [[x["name"], f"{x['value']:,.2f}", x.get("prev_day_str","—"), x.get("ytd_str","—")] for x in dm["items"]])
    if fl.get("items"):
        left += '<div class="sh">투자자별 전일 동향 (억원)</div>'
        left += tbl_s(["시장","외국인","기관","개인"],
            [[x["market"], f'{x["foreign"]:+,}', f'{x["institution"]:+,}', f'{x["individual"]:+,}'] for x in fl["items"]])

    right = ""
    if or_.get("items"):
        right += '<div class="sh">해외 금리</div>'
        right += tbl_s([f"구분", data_label, "전일대비", "전년말대비"],
            [[x["name"], f"{x['value']:.3f}", x.get("prev_day_str","—"), x.get("ytd_str","—")] for x in or_["items"]])
    os_rows = [(x, "주식") for x in om.get("stocks",[])] + \
              [(x, "FX")   for x in om.get("fx",[])]     + \
              [(x, "암호") for x in om.get("crypto",[])]
    if os_rows:
        right += '<div class="sh">해외 주식, 환율 및 암호화폐</div>'
        right += tbl_s([f"구분", data_label, "전일대비", "전년말대비"],
            [[x["name"], f'{x["value"]:,.2f}', x.get("prev_day_str","—"), x.get("ytd_str","—")] for x,_ in os_rows])
    if cm.get("items"):
        right += '<div class="sh">상품</div>'
        right += tbl_s([f"구분", data_label, "전일대비", "전년말대비"],
            [[x["name"], f'{x["value"]:,.2f}', x.get("prev_day_str","—"), x.get("ytd_str","—")] for x in cm["items"]])

    ind_html = ""
    if ind.get("items"):
        ind_html = '<div class="sh">최근 경제지표 발표</div>'
        ind_html += tbl_s(["지표명","발표일","실제치","예상치","전월치","평가"],
            [[x["name"],x["date"],x["actual"],x["forecast"],x["previous"],x.get("eval","—")] for x in ind["items"]])

    sch_html = ""
    if sch.get("items"):
        sch_html = '<div class="sh">주요 일정 (예정)</div>'
        def imp_fn(r): return "imp-high" if "★★★" in str(r) else "imp-mid" if "★★" in str(r) else ""
        sch_html += tbl_s(["날짜","시간","국가","이벤트","예상치","중요도"],
            [[x["date"],x["time"],x["country"],x["event"],x["forecast"],x["importance"]] for x in sch["items"]],
            imp_fn=imp_fn)

    comm_html = "".join(
        f'<p style="margin-bottom:6px"><strong style="color:#003087">[{e(x["tag"])}]</strong> {e(x["text"])}</p>'
        for x in ct.get("items",[])
    )

    summary_html = ""
    if sm.get("text"):
        summary_html = f'<div class="summary-box">💡 {e(sm["text"])}</div>'

    return f"""<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8"><title>Market Daily {e(rdt_fmt)}</title>
<style>
body{{font-family:"Malgun Gothic","맑은 고딕",sans-serif;font-size:11px;line-height:1.5;
     color:#111;padding:12px;max-width:1100px;margin:0 auto}}
.rpt-header{{display:flex;justify-content:space-between;align-items:center;
             border-bottom:3px solid #003087;padding-bottom:8px;margin-bottom:8px}}
.summary-box{{background:linear-gradient(90deg,#1e3a8a,#1a56c4);color:#fff;
              padding:8px 14px;margin-bottom:8px;border-radius:6px;
              border-left:4px solid #ffd700;font-size:11px;font-weight:600}}
.two-col{{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}}
.sh{{background:#003087;color:#fff;font-weight:700;font-size:10px;padding:3px 8px;margin-top:6px}}
table{{width:100%;border-collapse:collapse;margin-bottom:2px}}
thead th{{background:#e8edf5;color:#1e3a6e;font-weight:700;padding:3px 6px;text-align:center;font-size:10px;border-bottom:1px solid #d1d5db}}
thead th:first-child{{text-align:left}}
tbody tr{{border-bottom:1px solid #f0f0f0}}
tbody td{{padding:3px 6px;text-align:center;font-size:10px}}
tbody td:first-child{{text-align:left;font-weight:500;color:#1e3a6e}}
tbody tr.imp-high{{background:#fef9c3}}
tbody tr.imp-mid{{background:#f0f9ff}}
.comm-box{{background:#f8fafc;border:1px solid #d1d5db;padding:8px;font-size:11px;line-height:1.7;margin-top:8px}}
footer{{border-top:1px solid #d1d5db;padding-top:8px;font-size:9px;color:#6b7280;margin-top:16px}}
</style></head><body>
<div class="rpt-header">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="font-size:20px;font-weight:900;color:#003087">B</div>
    <div>
      <div style="font-size:17px;font-weight:700;letter-spacing:1px">MARKET DAILY</div>
      <div style="font-size:10px;color:#6b7280">재무실 자금운용본부</div>
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:14px;font-weight:700;color:#003087">{e(rdt_fmt)}</div>
    <div style="font-size:10px;color:#6b7280">데이터: {e(data_label)}</div>
  </div>
</div>
{summary_html}
<div class="two-col"><div>{left}</div><div>{right}</div></div>
<div class="two-col"><div>{ind_html}</div><div>{sch_html}</div></div>
{"<div class='comm-box'>" + comm_html + "</div>" if comm_html else ""}
<footer>본 보고서는 공개된 자료를 기반으로 정보 제공 목적으로 작성되었습니다. 투자 권유가 아닙니다.</footer>
</body></html>"""


# ── 메인 ─────────────────────────────────────────────────────────────
def main():
    args     = sys.argv[1:]
    all_flag = "--all" in args
    all_daily = load_all_daily()
    hist      = load_hist()

    if not all_daily:
        print("[ERROR] data/daily/ 에 데이터가 없습니다. init_sample_data.py 를 먼저 실행하세요.")
        return

    targets = list(all_daily.keys()) if (all_flag or not args or args[0].startswith("--")) \
              else [args[0].replace("-","")]

    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    for dt in targets:
        out_dir = OUT_ROOT / dt[:4]
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / f"market_daily_{dt}.html"
        path.write_text(build_print_html(all_daily[dt], dt), encoding="utf-8")
        sys.stdout.buffer.write(f"[OK] {path}\n".encode("utf-8"))

    idx_path = OUT_ROOT / "index.html"
    idx_path.write_text(build_index_html(all_daily, hist), encoding="utf-8")
    sys.stdout.buffer.write(f"[OK] Dashboard: {idx_path}\n".encode("utf-8"))


if __name__ == "__main__":
    main()
