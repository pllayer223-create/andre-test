"""
주간 해외매크로 보고서 HTML 대시보드 생성기

사용법:
  python generate_html.py                   # 최신 data/ 파일 자동 선택
  python generate_html.py 20260519          # 날짜 지정
  python generate_html.py data/data_x.json  # 경로 직접 지정

출력:
  archive/index.html                             ← 메인 대시보드 (모든 보고서 통합)
  archive/YYYY/Weekly foreign-macro_YYYYMMDD.html ← 인쇄용 개별 보고서
"""

import json, sys, datetime
from pathlib import Path
from html import escape as esc

BASE = Path(__file__).parent


# ── 유틸 ──────────────────────────────────────────────────

def val_class(text):
    t = str(text)
    if t.startswith("+") or any(k in t for k in ("상회", "상승")):
        return "pos"
    if t.startswith("-") or any(k in t for k in ("하회", "하락")):
        return "neg"
    return ""

def src_link(url, label="출처"):
    if not url:
        return ""
    return f'<a class="src-link" href="{esc(url)}" target="_blank" rel="noopener">↗ {esc(label)}</a>'

def badge(label, kind):
    cls = "badge-fact" if kind == "fact" else "badge-opinion"
    return f'<span class="badge {cls}">{esc(label)}</span>'

def importance_cls(imp):
    if "★★★" in imp: return "imp-high"
    if "★★" in imp:  return "imp-mid"
    return ""


# ── CSS ───────────────────────────────────────────────────

CSS = """
:root{
  --blue:#1F497D;--blue2:#2E74B5;--blue-lt:#D6E4F0;
  --pos:#1D7A2A;--neg:#C00000;--gray:#64748B;
  --border:#E2E8F0;--bg:#F1F5F9;--card:#FFFFFF;
  --nav:52px;--radius:10px;
  --imp-high-bg:#FEF9C3;--imp-mid-bg:#F0F9FF;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:"Malgun Gothic","맑은 고딕","Apple SD Gothic Neo","Noto Sans KR",sans-serif;
     font-size:13px;line-height:1.6;background:var(--bg);color:#1E293B;padding-top:var(--nav)}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:200;height:var(--nav);
    background:var(--blue);display:flex;align-items:center;
    padding:0 20px;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.nav-brand{font-weight:700;color:#fff;font-size:13px;white-space:nowrap;
           border-right:1px solid rgba(255,255,255,.3);padding-right:14px;margin-right:6px}
nav select{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);
           border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;
           font-family:inherit}
nav select option{background:#1F497D;color:#fff}
.nav-links{display:flex;gap:2px;margin-left:auto}
nav a.nav-item{color:rgba(255,255,255,.85);text-decoration:none;font-size:12px;
               padding:5px 9px;border-radius:5px;transition:background .15s;white-space:nowrap}
nav a.nav-item:hover{background:rgba(255,255,255,.2);color:#fff}
.btn-print{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);
           border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit}
.btn-print:hover{background:rgba(255,255,255,.25)}

/* HEADER */
header{background:linear-gradient(135deg,var(--blue) 0%,var(--blue2) 100%);
       color:#fff;padding:32px 20px 24px;text-align:center}
header h1{font-size:22px;font-weight:700;letter-spacing:-.3px}
header .meta{margin-top:6px;font-size:12px;opacity:.8}
header .summary-pill{margin-top:14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);
                      border-radius:8px;padding:12px 18px;font-size:13px;font-weight:600;
                      max-width:860px;margin-left:auto;margin-right:auto;text-align:left;line-height:1.7}

/* LAYOUT */
main{max-width:980px;margin:0 auto;padding:24px 16px 60px}

/* SECTION */
section{margin-bottom:36px;scroll-margin-top:calc(var(--nav) + 10px)}
.section-title{font-size:16px;font-weight:700;color:var(--blue);
               border-bottom:2px solid var(--blue2);padding-bottom:8px;margin-bottom:16px}
.sub-title{font-size:13px;font-weight:700;color:var(--blue2);margin:18px 0 10px}

/* CARDS */
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);
      padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:12px}

/* GRID */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:640px){.grid-2,.grid-3{grid-template-columns:1fr}}

/* KPI CHIPS */
.kpi-row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}
.kpi{background:var(--card);border:1px solid var(--border);border-radius:8px;
     padding:10px 14px;flex:1;min-width:110px;text-align:center}
.kpi-label{font-size:11px;color:var(--gray);margin-bottom:2px}
.kpi-val{font-size:17px;font-weight:700;color:var(--blue)}
.kpi-chg{font-size:11px;margin-top:2px}

/* TABS */
.tab-bar{display:flex;gap:4px;margin-bottom:14px;flex-wrap:wrap}
.tab-btn{background:#fff;border:1px solid var(--border);border-radius:6px;
         padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;color:var(--gray);
         transition:all .15s;font-family:inherit}
.tab-btn.active{background:var(--blue2);color:#fff;border-color:var(--blue2)}
.tab-panel{display:none}.tab-panel.active{display:block}

/* TABLE */
.tbl-wrap{overflow-x:auto;margin-bottom:6px;border-radius:8px;
          box-shadow:0 1px 4px rgba(0,0,0,.07)}
table{width:100%;border-collapse:collapse;background:var(--card);font-size:12px}
thead tr{background:var(--blue2)}
thead th{color:#fff;font-weight:700;padding:8px 10px;text-align:center;
         white-space:nowrap;font-size:11px}
tbody tr{border-bottom:1px solid var(--border)}
tbody tr:last-child{border-bottom:none}
tbody tr:nth-child(even){background:#F8FAFC}
tbody tr.imp-high{background:var(--imp-high-bg)!important}
tbody tr.imp-mid{background:var(--imp-mid-bg)!important}
tbody td{padding:7px 10px;text-align:center;vertical-align:middle}
tbody td:first-child{text-align:left;font-weight:500}
.pos{color:var(--pos);font-weight:700}
.neg{color:var(--neg);font-weight:700}

/* NOTICE */
.notice{font-size:11px;color:var(--gray);font-style:italic;margin:4px 0 12px 4px}

/* SOURCE LINK */
.src-link{font-size:10px;color:var(--blue2);text-decoration:none;
          border:1px solid var(--blue2);border-radius:4px;padding:1px 5px;
          margin-left:6px;white-space:nowrap}
.src-link:hover{background:var(--blue2);color:#fff}

/* BADGE */
.badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 6px;
       border-radius:4px;white-space:nowrap;flex-shrink:0}
.badge-fact{background:#DBEAFE;color:#1E40AF}
.badge-opinion{background:#FEF3C7;color:#92400E}

/* NEWS ACCORDION */
.news-card{background:var(--card);border:1px solid var(--border);
           border-left:4px solid var(--blue2);border-radius:var(--radius);
           margin-bottom:10px;overflow:hidden}
.news-header{padding:12px 16px;cursor:pointer;display:flex;
             justify-content:space-between;align-items:center;
             user-select:none;font-weight:700;font-size:13px;color:var(--blue)}
.news-header:hover{background:#F8FAFC}
.news-arrow{font-size:12px;transition:transform .2s;color:var(--blue2)}
.news-body{padding:0 16px;max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s}
.news-body.open{max-height:600px;padding:4px 16px 14px}
.news-row{display:flex;gap:8px;align-items:flex-start;padding:5px 0;
          border-bottom:1px solid #F1F5F9;font-size:12px}
.news-row:last-child{border-bottom:none;padding-bottom:0}
.news-src{margin-top:8px;font-size:11px}

/* CHART */
.chart-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
.chart-toolbar select{border:1px solid var(--border);border-radius:6px;
                       padding:5px 10px;font-size:12px;font-family:inherit;background:#fff}
.chart-wrap{position:relative;height:280px;background:var(--card);
            border:1px solid var(--border);border-radius:var(--radius);padding:14px}
.chart-note{font-size:11px;color:var(--gray);margin-top:6px;font-style:italic}

/* TIMELINE (calendar) */
.timeline{display:flex;flex-direction:column;gap:6px}
.tl-row{display:grid;grid-template-columns:80px 60px 50px 1fr auto auto;
        gap:8px;align-items:center;background:var(--card);
        border:1px solid var(--border);border-radius:8px;padding:8px 12px}
.tl-row.imp-high{border-left:4px solid #EAB308;background:var(--imp-high-bg)}
.tl-row.imp-mid{border-left:4px solid var(--blue2);background:var(--imp-mid-bg)}
.tl-date{font-weight:700;font-size:12px;color:var(--blue)}
.tl-time{font-size:11px;color:var(--gray)}
.tl-country{font-size:11px;color:var(--gray)}
.tl-event{font-size:12px;font-weight:500}
.tl-forecast{font-size:11px;color:var(--gray);text-align:right}
.tl-imp{font-size:12px}
@media(max-width:600px){
  .tl-row{grid-template-columns:70px 1fr auto;gap:4px}
  .tl-time,.tl-country,.tl-forecast{display:none}
}

/* OUTLOOK */
.outlook-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
@media(max-width:640px){.outlook-grid{grid-template-columns:1fr}}
.outlook-card{background:var(--card);border:1px solid var(--border);
              border-radius:var(--radius);padding:14px}
.outlook-card h4{font-size:12px;font-weight:700;color:var(--blue);margin-bottom:8px;
                  padding-bottom:5px;border-bottom:1px solid var(--border)}
.outlook-row{display:flex;gap:7px;align-items:flex-start;padding:4px 0;font-size:12px}

/* FED */
.fed-list{list-style:none}
.fed-list li{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px}
.fed-list li:last-child{border-bottom:none}
.fed-label{font-weight:700;color:var(--blue);min-width:90px;white-space:nowrap}

/* CHECKPOINT */
.cp-list{list-style:none}
.cp-list li{padding:6px 0 6px 18px;border-bottom:1px solid var(--border);
            font-size:12px;position:relative}
.cp-list li::before{content:"→";position:absolute;left:0;color:var(--blue2);font-weight:700}
.cp-list li:last-child{border-bottom:none}

/* DATA NOTE */
.data-note{background:#FEF9C3;border:1px solid #FDE047;border-radius:8px;
           padding:12px 16px;font-size:12px;margin-bottom:16px}

/* FOOTER */
footer{border-top:1px solid var(--border);padding:20px;text-align:center;
       font-size:11px;color:var(--gray);font-style:italic;margin-top:40px}

/* PRINT */
@media print{
  nav,.tab-bar,.chart-toolbar,.btn-print,.news-header .news-arrow{display:none!important}
  body{padding-top:0;background:#fff;font-size:11px}
  header{padding:12px;background:#1F497D!important;-webkit-print-color-adjust:exact}
  .news-body{max-height:none!important;padding:4px 16px 14px!important;display:block!important}
  .tab-panel{display:block!important}
  section{margin-bottom:16px}
}
"""


# ── JavaScript ─────────────────────────────────────────────

def make_js(all_reports_json, historical_json):
    return f"""
const REPORTS = {all_reports_json};
const HIST    = {historical_json};
let activeDate = Object.keys(REPORTS).sort().pop();
let mainChart  = null;

/* ── 날짜 선택 ── */
function switchReport(date) {{
  activeDate = date;
  renderAll();
}}

/* ── 탭 ── */
function initTabs() {{
  document.querySelectorAll('.tab-btn').forEach(btn => {{
    btn.addEventListener('click', () => {{
      const bar = btn.closest('.tab-bar');
      bar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const group = btn.dataset.group;
      const panel = btn.dataset.panel;
      document.querySelectorAll(`[data-group="${{group}}"]`).forEach(p => {{
        if (p.classList.contains('tab-panel')) p.classList.remove('active');
      }});
      const target = document.getElementById(panel);
      if (target) target.classList.add('active');
    }});
  }});
}}

/* ── 뉴스 아코디언 ── */
function initAccordions() {{
  document.querySelectorAll('.news-header').forEach(hdr => {{
    hdr.addEventListener('click', () => {{
      const body  = hdr.nextElementSibling;
      const arrow = hdr.querySelector('.news-arrow');
      const open  = body.classList.toggle('open');
      arrow.style.transform = open ? 'rotate(90deg)' : '';
    }});
  }});
}}

/* ── 히스토리컬 차트 ── */
function renderHistChart(seriesKey) {{
  const cfg = HIST[seriesKey];
  if (!cfg) return;
  const ctx = document.getElementById('hist-chart');
  if (!ctx) return;
  if (mainChart) mainChart.destroy();
  mainChart = new Chart(ctx, {{
    type: 'line',
    data: {{
      labels: HIST.labels,
      datasets: [{{
        label: cfg.label + (cfg.unit ? ` (${{cfg.unit}})` : ''),
        data: cfg.values,
        borderColor: '#2E74B5',
        backgroundColor: 'rgba(46,116,181,0.08)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.3
      }}]
    }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      plugins: {{
        legend: {{ labels: {{ font: {{ family: "'Malgun Gothic', sans-serif", size: 12 }}, color: '#1E293B' }} }},
        tooltip: {{ callbacks: {{
          label: ctx => ` ${{ctx.parsed.y.toLocaleString()}} ${{cfg.unit}}`
        }}}}
      }},
      scales: {{
        x: {{ ticks: {{ font: {{ size: 10 }}, maxTicksLimit: 12 }}, grid: {{ color: '#F1F5F9' }} }},
        y: {{ ticks: {{ font: {{ size: 10 }}, callback: v => v.toLocaleString() + ' ' + cfg.unit }},
              grid: {{ color: '#F1F5F9' }} }}
      }}
    }}
  }});
  const noteEl = document.getElementById('hist-note');
  if (noteEl && cfg.source) noteEl.innerHTML = `출처: <a href="${{cfg.source}}" target="_blank" rel="noopener" style="color:var(--blue2)">${{cfg.source}}</a>`;
}}

/* ── 전체 렌더링 ── */
function renderAll() {{
  const d = REPORTS[activeDate];
  if (!d) return;
  const meta = d.meta;
  const m    = d.markets;

  /* 헤더 */
  document.getElementById('hdr-title').textContent = `주간 해외매크로 보고 — ${{meta.date}}`;
  document.getElementById('hdr-meta').textContent  = `보고 기간: ${{meta.period}}  |  작성일: ${{meta.date}}`;
  document.getElementById('hdr-summary').textContent = d.summary;

  /* KPI 칩 */
  renderKpi(m);

  /* 탭 내용 */
  renderStocks(m.stocks, m.stocks_notice);
  renderBonds(m.bonds, m.bonds_notice);
  renderComm(m.commodities, m.commodities_notice);
  renderFx(m.fx);
  renderIndicators(m.indicators, m.indicators_notice);
  renderFed(m.fed);

  /* 뉴스 */
  renderNews(d.news);

  /* 다음 주 일정 */
  renderCalendar(d.next_week);

  /* 시사점 */
  renderOutlook(d.outlook);

  initAccordions();
}}

function th(text) {{ return `<th>${{esc(text)}}</th>`; }}
function esc(t) {{
  if (t == null) return '';
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}}
function valCls(t) {{
  const s = String(t);
  if (s.startsWith('+') || /상회|상승/.test(s)) return 'pos';
  if (s.startsWith('-') || /하회|하락/.test(s)) return 'neg';
  return '';
}}
function srcLink(url, label) {{
  if (!url) return '';
  return `<a class="src-link" href="${{esc(url)}}" target="_blank" rel="noopener">↗ ${{esc(label||'출처')}}</a>`;
}}

function renderKpi(m) {{
  const sp = m.stocks.find(s => s.index === 'S&P 500') || {{}};
  const n10 = m.bonds.find(b => b.maturity === '10년물') || {{}};
  const wti = m.commodities.find(c => c.item && c.item.startsWith('WTI')) || {{}};
  const krw = m.fx.find(f => f.pair === 'USD/KRW') || {{}};
  const el  = document.getElementById('kpi-row');
  if (!el) return;
  el.innerHTML = [
    {{l:'S&P 500', v:sp.close||'—', c:sp.weekly||''}},
    {{l:'10Y 금리', v:n10.current||'—', c:n10.change||''}},
    {{l:'WTI 원유', v:wti.close||'—', c:wti.weekly||''}},
    {{l:'USD/KRW', v:krw.current||'—', c:krw.mom||''}},
  ].map(k => `<div class="kpi">
    <div class="kpi-label">${{k.l}}</div>
    <div class="kpi-val">${{esc(k.v)}}</div>
    <div class="kpi-chg ${{valCls(k.c)}}">${{esc(k.c)}}</div>
  </div>`).join('');
}}

function tblRows(headers, rows, imp) {{
  const ths = headers.map(h => `<th>${{esc(h)}}</th>`).join('');
  const trs = rows.map((r, i) => {{
    const cls = imp ? imp(r) : (i%2===1?'stripe':'');
    const tds = r.map((v,ci) => {{
      const t   = esc(String(v));
      const vcls = ci > 0 ? valCls(String(v)) : '';
      return `<td class="${{vcls}}">${{t}}</td>`;
    }}).join('');
    return `<tr class="${{cls}}">${{tds}}</tr>`;
  }}).join('');
  return `<div class="tbl-wrap"><table><thead><tr>${{ths}}</tr></thead><tbody>${{trs}}</tbody></table></div>`;
}}

function renderStocks(stocks, notice) {{
  const el = document.getElementById('tab-stocks');
  if (!el) return;
  const rows = stocks.map(s => [s.index, s.close, s.weekly, s.ytd, s.note]);
  el.innerHTML = tblRows(['지수','종가','주간 등락','YTD','비고'], rows)
    + `<p class="notice">※ ${{esc(notice)}}</p>`
    + stocks.filter(s=>s.source).map(s => srcLink(s.source, s.index)).join(' ');
}}

function renderBonds(bonds, notice) {{
  const el = document.getElementById('tab-bonds');
  if (!el) return;
  const rows = bonds.map(b => [b.maturity, b.current, b.prev_week, b.change, b.note]);
  el.innerHTML = tblRows(['만기','금주','전주','전주대비','비고'], rows)
    + `<p class="notice">※ ${{esc(notice)}}</p>`
    + bonds.filter(b=>b.source).map(b => srcLink(b.source, b.maturity)).join(' ');
}}

function renderComm(comm, notice) {{
  const el = document.getElementById('tab-comm');
  if (!el) return;
  const rows = comm.map(c => [c.item, c.close, c.weekly, c.mom, c.yoy, c.note]);
  el.innerHTML = tblRows(['품목','금주 종가','주간 등락','전월비','전년비','비고'], rows)
    + `<p class="notice">※ ${{esc(notice)}}</p>`
    + comm.filter(c=>c.source).map(c => srcLink(c.source, c.item.split(' ')[0])).join(' ');
}}

function renderFx(fx) {{
  const el = document.getElementById('tab-fx');
  if (!el) return;
  const rows = fx.map(f => [f.pair, f.current, f.mom, f.yoy, f.note]);
  el.innerHTML = tblRows(['통화쌍','금주','전월비','전년비','비고'], rows)
    + fx.filter(f=>f.source).map(f => srcLink(f.source, f.pair)).join(' ');
}}

function renderIndicators(inds, notice) {{
  const el = document.getElementById('tab-inds');
  if (!el) return;
  const rows = inds.map(i => [i.name, i.date, i.actual, i.forecast, i.prev, i.yoy||'—', i.eval]);
  el.innerHTML = tblRows(['지표명','발표일','실제치','예상치','전월치','전년비','평가'], rows)
    + `<p class="notice">※ ${{esc(notice)}}</p>`
    + inds.filter(i=>i.source).map(i => srcLink(i.source, i.name.split('(')[0])).join(' ');
}}

function renderFed(fed) {{
  const el = document.getElementById('tab-fed');
  if (!el) return;
  const items = [
    ['현행 기준금리', fed.rate, ''],
    ['다음 FOMC',    fed.next, fed.source_fomc||''],
    ['지배구조',     fed.gov,  ''],
    ['시장 기대',    fed.market, fed.source_fedwatch||''],
  ];
  el.innerHTML = '<ul class="fed-list">'
    + items.map(([l,v,url]) =>
        `<li><span class="fed-label">${{esc(l)}}</span><span>${{esc(v)}} ${{srcLink(url)}}</span></li>`
      ).join('')
    + '</ul>';
}}

function renderNews(news) {{
  const el = document.getElementById('news-list');
  if (!el) return;
  const marks = ['①','②','③','④','⑤'];
  el.innerHTML = news.map((n, i) => `
    <div class="news-card">
      <div class="news-header">
        <span>${{marks[i]||i+1}} ${{esc(n.title)}}</span>
        <span class="news-arrow">▶</span>
      </div>
      <div class="news-body open">
        <div class="news-row"><span class="badge badge-fact">[사실] 배경</span><span>${{esc(n.background)}}</span></div>
        <div class="news-row"><span class="badge badge-fact">[사실] 경과</span><span>${{esc(n.progress)}}</span></div>
        <div class="news-row"><span class="badge badge-fact">[사실] 시장영향</span><span>${{esc(n.impact)}}</span></div>
        <div class="news-row"><span class="badge badge-opinion">[의견]</span><span>${{esc(n.opinion)}}</span></div>
        ${{n.source_url ? `<div class="news-src">${{srcLink(n.source_url, n.source_label||'원문 보기')}}</div>` : ''}}
      </div>
    </div>`).join('');
}}

function renderCalendar(nw) {{
  const el = document.getElementById('calendar-body');
  if (!el) return;
  el.innerHTML = nw.calendar.map(c => {{
    const imp = c.importance.includes('★★★') ? 'imp-high' : c.importance.includes('★★') ? 'imp-mid' : '';
    const src = c.source ? srcLink(c.source) : '';
    return `<div class="tl-row ${{imp}}">
      <span class="tl-date">${{esc(c.date)}}</span>
      <span class="tl-time">${{esc(c.time)}}</span>
      <span class="tl-country">${{esc(c.country)}}</span>
      <span class="tl-event">${{esc(c.event)}} ${{src}}</span>
      <span class="tl-forecast">예상: ${{esc(c.forecast)}} / 전: ${{esc(c.prev)}}</span>
      <span class="tl-imp">${{esc(c.importance)}}</span>
    </div>`;
  }}).join('');
  document.getElementById('calendar-notice').textContent = '※ ' + nw.calendar_notice;
  const sp = document.getElementById('speakers-list');
  if (sp) sp.innerHTML = nw.speakers.map(s => `<li>${{esc(s)}}</li>`).join('');
}}

function renderOutlook(o) {{
  const mkCard = (title, fact, opinion) =>
    `<div class="outlook-card">
      <h4>${{esc(title)}}</h4>
      <div class="outlook-row"><span class="badge badge-fact">[사실]</span><span>${{esc(fact)}}</span></div>
      <div class="outlook-row"><span class="badge badge-opinion">[의견]</span><span>${{esc(opinion)}}</span></div>
    </div>`;
  const grid = document.getElementById('outlook-grid');
  if (grid) grid.innerHTML =
    mkCard('경기·인플레이션', o.economy.fact, o.economy.opinion) +
    mkCard('통화정책', o.monetary.fact, o.monetary.opinion) +
    mkCard('지정학·무역', o.geopolitical.fact, o.geopolitical.opinion);
  const cp = document.getElementById('checkpoints');
  if (cp) cp.innerHTML = o.checkpoints.map(c => `<li>${{esc(c)}}</li>`).join('');
}}

/* ── 초기화 ── */
document.addEventListener('DOMContentLoaded', () => {{
  /* 날짜 선택 셀렉트 채우기 */
  const sel = document.getElementById('report-sel');
  if (sel) {{
    Object.keys(REPORTS).sort().reverse().forEach(d => {{
      const opt = document.createElement('option');
      opt.value = d; opt.textContent = d;
      if (d === activeDate) opt.selected = true;
      sel.appendChild(opt);
    }});
    sel.addEventListener('change', e => switchReport(e.target.value));
  }}

  /* 히스토리컬 차트 셀렉트 */
  const hsel = document.getElementById('hist-sel');
  if (hsel) {{
    hsel.addEventListener('change', e => renderHistChart(e.target.value));
    renderHistChart(hsel.value);
  }}

  initTabs();
  renderAll();
}});
"""


# ── HTML 빌더 ─────────────────────────────────────────────

def build_index_html(all_reports: dict, historical: dict) -> str:
    all_js  = json.dumps(all_reports, ensure_ascii=False)
    hist_js = json.dumps(historical,  ensure_ascii=False)

    hist_options = ""
    for key, cfg in historical.items():
        if key in ("labels", "_note"):
            continue
        hist_options += f'<option value="{esc(key)}">{esc(cfg.get("label", key))}</option>\n'

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>주간 해외매크로 보고 대시보드</title>
<style>{CSS}</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
</head>
<body>

<nav>
  <span class="nav-brand">해외매크로 대시보드</span>
  <select id="report-sel" title="보고서 날짜 선택"></select>
  <div class="nav-links">
    <a class="nav-item" href="#s1">요약</a>
    <a class="nav-item" href="#s2">시장</a>
    <a class="nav-item" href="#s3">뉴스</a>
    <a class="nav-item" href="#s4">일정</a>
    <a class="nav-item" href="#s5">시사점</a>
    <a class="nav-item" href="#s6">과거데이터</a>
  </div>
  <button class="btn-print" onclick="window.print()">인쇄</button>
</nav>

<header>
  <h1 id="hdr-title">주간 해외매크로 보고</h1>
  <p class="meta" id="hdr-meta"></p>
  <div class="summary-pill" id="hdr-summary"></div>
</header>

<main>

<!-- S1 핵심 지표 KPI -->
<section id="s1">
  <div class="section-title">① 핵심 지표 현황</div>
  <div class="kpi-row" id="kpi-row"></div>
</section>

<!-- S2 시장 동향 -->
<section id="s2">
  <div class="section-title">② 글로벌 금융시장 동향</div>

  <div class="tab-bar">
    <button class="tab-btn active" data-group="mkt" data-panel="tab-stocks">📈 증시</button>
    <button class="tab-btn" data-group="mkt" data-panel="tab-bonds">📊 채권금리</button>
    <button class="tab-btn" data-group="mkt" data-panel="tab-comm">🛢 원자재</button>
    <button class="tab-btn" data-group="mkt" data-panel="tab-fx">💱 외환(FX)</button>
    <button class="tab-btn" data-group="mkt" data-panel="tab-inds">📋 경제지표</button>
    <button class="tab-btn" data-group="mkt" data-panel="tab-fed">🏦 연준(Fed)</button>
  </div>

  <div class="tab-panel active" id="tab-stocks" data-group="mkt"></div>
  <div class="tab-panel" id="tab-bonds"  data-group="mkt"></div>
  <div class="tab-panel" id="tab-comm"   data-group="mkt"></div>
  <div class="tab-panel" id="tab-fx"     data-group="mkt"></div>
  <div class="tab-panel" id="tab-inds"   data-group="mkt"></div>
  <div class="tab-panel" id="tab-fed"    data-group="mkt"></div>
</section>

<!-- S3 이슈 뉴스 -->
<section id="s3">
  <div class="section-title">③ 핵심 이슈 뉴스</div>
  <div id="news-list"></div>
</section>

<!-- S4 다음 주 일정 -->
<section id="s4">
  <div class="section-title">④ 다음 주 경제지표 및 주요 일정</div>
  <div class="timeline" id="calendar-body"></div>
  <p class="notice" id="calendar-notice"></p>
  <div class="sub-title">주요 인사 발언 예정</div>
  <ul class="cp-list" id="speakers-list"></ul>
</section>

<!-- S5 시사점 -->
<section id="s5">
  <div class="section-title">⑤ 시사점 및 전망</div>
  <div class="outlook-grid" id="outlook-grid"></div>
  <div class="sub-title" style="margin-top:16px">다음 주 체크포인트</div>
  <ul class="cp-list" id="checkpoints"></ul>
</section>

<!-- S6 과거 데이터 차트 -->
<section id="s6">
  <div class="section-title">⑥ 과거 데이터 (약 3년)</div>
  <div class="data-note">
    💡 아래 차트는 2023년 5월~2026년 5월 월별 데이터입니다.
    데이터 갱신은 <code>data/historical_data.json</code>의 <code>values</code> 배열을 수정하세요.
  </div>
  <div class="chart-toolbar">
    <label style="font-size:12px;font-weight:600">지표 선택:</label>
    <select id="hist-sel">
      {hist_options}
    </select>
  </div>
  <div class="chart-wrap"><canvas id="hist-chart"></canvas></div>
  <p class="chart-note" id="hist-note"></p>
</section>

</main>

<footer>
  본 보고서는 공개된 자료를 기반으로 정보 제공 목적으로 작성되었습니다.
  투자 권유 또는 의사결정의 근거로 활용 시 추가적인 검토가 필요합니다.
  사실(Fact)과 의견(Opinion)은 각 항목에 명시하였습니다.
</footer>

<script>
{make_js(all_js, hist_js)}
</script>
</body>
</html>"""


def build_print_html(data: dict) -> str:
    """인쇄·공유용 단순 HTML (기존 방식 유지)."""
    from html import escape as e
    meta = data["meta"]
    m    = data["markets"]

    def tbl(headers, rows):
        ths = "".join(f"<th>{e(h)}</th>" for h in headers)
        trs = ""
        for i, row in enumerate(rows):
            bg = ' style="background:#F8FAFC"' if i % 2 == 1 else ""
            tds = ""
            for j, v in enumerate(row):
                t   = e(str(v))
                cls = ""
                if str(v).startswith("+") or "상회" in str(v): cls = ' style="color:#1D7A2A;font-weight:700"'
                elif str(v).startswith("-") or "하회" in str(v): cls = ' style="color:#C00000;font-weight:700"'
                tds += f"<td{cls}>{t}</td>"
            trs += f"<tr{bg}>{tds}</tr>"
        return (f'<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px">'
                f'<thead style="background:#2E74B5"><tr>{ths}</tr></thead><tbody>{trs}</tbody></table>')

    body = f"""<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>주간 해외매크로 {e(meta['date'])}</title>
<style>
body{{font-family:"Malgun Gothic","맑은 고딕",sans-serif;font-size:13px;line-height:1.6;
     max-width:900px;margin:0 auto;padding:24px;color:#1E293B}}
h1{{font-size:20px;color:#1F497D;margin-bottom:4px}}
h2{{font-size:14px;color:#2E74B5;border-bottom:2px solid #2E74B5;padding-bottom:4px;margin:20px 0 10px}}
h3{{font-size:12px;color:#2E74B5;margin:14px 0 6px}}
.meta{{font-size:11px;color:#64748B;margin-bottom:16px}}
.sumbox{{background:#D6E4F0;border-left:4px solid #1F497D;padding:12px;border-radius:6px;
         font-weight:600;font-size:13px;color:#1F497D;margin-bottom:20px}}
thead th{{color:#fff;padding:7px 9px;text-align:center;font-size:11px}}
tbody td{{padding:6px 9px;text-align:center}}
tbody td:first-child{{text-align:left}}
.notice{{font-size:11px;color:#64748B;font-style:italic;margin-bottom:10px}}
.bdg-f{{background:#DBEAFE;color:#1E40AF;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700}}
.bdg-o{{background:#FEF3C7;color:#92400E;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700}}
.nr{{display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #F1F5F9;font-size:12px}}
.src{{font-size:10px;color:#2E74B5}}
footer{{margin-top:30px;border-top:1px solid #E2E8F0;padding-top:12px;
        font-size:10px;color:#64748B;font-style:italic}}
</style></head><body>
<h1>주간 해외매크로 보고</h1>
<p class="meta">보고 기간: {e(meta['period'])} &nbsp;|&nbsp; 작성일: {e(meta['date'])}</p>
<div class="sumbox">{e(data['summary'])}</div>
<h2>1. 글로벌 증시</h2>
{tbl(['지수','종가','주간 등락','YTD','비고'], [[s['index'],s['close'],s['weekly'],s['ytd'],s['note']] for s in m['stocks']])}
<p class="notice">※ {e(m['stocks_notice'])}</p>
<h2>2. 미국 국채금리</h2>
{tbl(['만기','금주','전주','전주대비','비고'], [[b['maturity'],b['current'],b['prev_week'],b['change'],b['note']] for b in m['bonds']])}
<p class="notice">※ {e(m['bonds_notice'])}</p>
<h2>3. 원자재</h2>
{tbl(['품목','금주 종가','주간 등락','전월비','전년비','비고'], [[c['item'],c['close'],c['weekly'],c['mom'],c['yoy'],c['note']] for c in m['commodities']])}
<p class="notice">※ {e(m['commodities_notice'])}</p>
<h2>4. 외환(FX)</h2>
{tbl(['통화쌍','금주','전월비','전년비','비고'], [[f['pair'],f['current'],f['mom'],f['yoy'],f['note']] for f in m['fx']])}
<h2>5. 주간 경제지표</h2>
{tbl(['지표명','발표일','실제치','예상치','전월치','전년비','평가'], [[i['name'],i['date'],i['actual'],i['forecast'],i['prev'],i.get('yoy','—'),i['eval']] for i in m['indicators']])}
<p class="notice">※ {e(m['indicators_notice'])}</p>
<h2>6. 핵심 이슈 뉴스</h2>
{"".join(
    f'<h3>{"①②③"[i]} {e(n["title"])}</h3>'
    f'<div class="nr"><span class="bdg-f">[사실] 배경</span><span>{e(n["background"])}</span></div>'
    f'<div class="nr"><span class="bdg-f">[사실] 경과</span><span>{e(n["progress"])}</span></div>'
    f'<div class="nr"><span class="bdg-f">[사실] 영향</span><span>{e(n["impact"])}</span></div>'
    f'<div class="nr"><span class="bdg-o">[의견]</span><span>{e(n["opinion"])}</span></div>'
    + (f'<p class="src">출처: <a href="{e(n["source_url"])}">{e(n.get("source_label","링크"))}</a></p>' if n.get("source_url") else '')
    for i, n in enumerate(data['news'])
)}
<h2>7. 다음 주 일정</h2>
{tbl(['날짜','시간(ET)','국가','지표·이벤트','예상치','전월치','중요도'],
    [[c['date'],c['time'],c['country'],c['event'],c['forecast'],c['prev'],c['importance']] for c in data['next_week']['calendar']])}
<p class="notice">※ {e(data['next_week']['calendar_notice'])}</p>
<h2>8. 시사점</h2>
<div class="nr"><span class="bdg-f">[사실] 경기·인플레</span><span>{e(data['outlook']['economy']['fact'])}</span></div>
<div class="nr"><span class="bdg-o">[의견] 경기·인플레</span><span>{e(data['outlook']['economy']['opinion'])}</span></div>
<div class="nr"><span class="bdg-f">[사실] 통화정책</span><span>{e(data['outlook']['monetary']['fact'])}</span></div>
<div class="nr"><span class="bdg-o">[의견] 통화정책</span><span>{e(data['outlook']['monetary']['opinion'])}</span></div>
<div class="nr"><span class="bdg-f">[사실] 지정학</span><span>{e(data['outlook']['geopolitical']['fact'])}</span></div>
<div class="nr"><span class="bdg-o">[의견] 지정학</span><span>{e(data['outlook']['geopolitical']['opinion'])}</span></div>
<footer>본 보고서는 공개된 자료를 기반으로 정보 제공 목적으로 작성되었습니다. 투자 권유가 아닙니다.</footer>
</body></html>"""
    return body


# ── 파일 로더 ──────────────────────────────────────────────

def resolve_data_file(arg=None):
    data_dir = BASE / "data"
    if arg is None:
        files = sorted(data_dir.glob("data_*.json"))
        if not files:
            raise FileNotFoundError("data/ 폴더에 data_YYYYMMDD.json 파일이 없습니다.")
        return files[-1]
    if Path(arg).exists():
        return Path(arg)
    candidate = data_dir / f"data_{arg}.json"
    if candidate.exists():
        return candidate
    raise FileNotFoundError(f"데이터 파일을 찾을 수 없습니다: {arg}")

def load_all_reports() -> dict:
    all_data = {}
    for f in sorted((BASE / "data").glob("data_*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            all_data[d["meta"]["date"]] = d
        except Exception:
            pass
    return all_data

def load_historical() -> dict:
    hist_path = BASE / "data" / "historical_data.json"
    if hist_path.exists():
        return json.loads(hist_path.read_text(encoding="utf-8"))
    return {}


# ── 메인 ──────────────────────────────────────────────────

def main():
    arg        = sys.argv[1] if len(sys.argv) > 1 else None
    data_path  = resolve_data_file(arg)
    all_reports = load_all_reports()
    historical  = load_historical()

    # 1. 인쇄용 개별 HTML
    single_data = json.loads(data_path.read_text(encoding="utf-8"))
    report_date = single_data["meta"]["date"].replace("-", "")
    year        = single_data["meta"]["date"][:4]
    out_dir     = BASE / "archive" / year
    out_dir.mkdir(parents=True, exist_ok=True)
    single_path = out_dir / f"Weekly foreign-macro_{report_date}.html"
    single_path.write_text(build_print_html(single_data), encoding="utf-8")

    # 2. 메인 대시보드 index.html
    index_path = BASE / "archive" / "index.html"
    index_path.write_text(build_index_html(all_reports, historical), encoding="utf-8")

    out = sys.stdout.buffer
    out.write(f"[OK] Dashboard : {index_path}\n".encode("utf-8"))
    out.write(f"[OK] Print HTML: {single_path}\n".encode("utf-8"))

if __name__ == "__main__":
    main()
