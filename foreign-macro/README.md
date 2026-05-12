# 주간 해외매크로 보고서 자동 생성기

매주 글로벌 매크로 경제 데이터를 JSON으로 입력하면, 맑은 고딕 A4 형식의 `.docx` 보고서를 자동 생성합니다.

---

## 프로젝트 구조

```
foreign-macro/
├── generate_report.py          # 보고서 생성 엔진 (수정 불필요)
├── Weekly_Foreign_Macro_Template.md  # 보고서 섹션 구조 참고용 빈 양식
├── CHECKLIST.md                # 매주 데이터 수집 체크리스트
├── requirements.txt            # Python 패키지 목록
├── .gitignore
│
├── data/                       # 주차별 입력 데이터 (매주 새 파일 추가)
│   └── data_YYYYMMDD.json      # 보고 기준일 날짜로 파일명 지정
│
└── archive/                    # 생성된 보고서 보관 (자동 생성)
    └── YYYY/
        └── Weekly foreign-macro_YYYYMMDD.docx
```

---

## 최초 환경 설정 (최초 1회)

```powershell
uv venv .venv
uv pip install python-docx --python .venv\Scripts\python.exe
```

> `uv`가 없다면: [https://docs.astral.sh/uv/getting-started/installation/](https://docs.astral.sh/uv/getting-started/installation/)

---

## 매주 보고서 작성 순서

### 1단계 — 데이터 수집
`CHECKLIST.md`를 따라 10개 항목 체크

### 2단계 — JSON 파일 작성
기존 파일을 복사해 이번 주 날짜로 저장:

```powershell
copy data\data_20260512.json data\data_20260519.json
```

`data_20260519.json`을 열어 아래 항목 수정:
- `meta.date` — 보고 기준일 (`"2026-05-19"`)
- `meta.period` — 보고 기간 문자열
- `summary` — 핵심 요약 1~2줄
- `markets` — 증시·채권·원자재·FX·경제지표·연준 데이터
- `news` — 이슈 뉴스 1~3개
- `next_week` — 다음 주 일정
- `outlook` — 시사점 및 전망

### 3단계 — 보고서 생성

```powershell
# 방법 A: data/ 폴더에서 최신 파일 자동 선택
.venv\Scripts\python.exe generate_report.py

# 방법 B: 날짜 직접 지정
.venv\Scripts\python.exe generate_report.py 20260519

# 방법 C: 파일 경로 직접 지정
.venv\Scripts\python.exe generate_report.py data\data_20260519.json
```

출력 위치: `archive/2026/Weekly foreign-macro_20260519.docx`

---

## 보고서 구성 (5섹션)

| 섹션 | 내용 |
|------|------|
| 1. 주간 핵심 요약 | 이번 주 시장·정책·이슈 1~2줄 압축. 문장을 짧게 유지 |
| 2. 글로벌 금융시장 동향 | 증시·채권·원자재·FX·지표·연준 (표 형식) |
| 3. 핵심 이슈 뉴스 | 1~3개 이슈, [사실]/[의견] 구분 |
| 4. 다음 주 일정 | 경제지표 발표·주요 인사 발언 (중요도 ★ 표시) |
| 5. 시사점 및 전망 | 경기·통화정책·지정학 [사실]/[의견] 구분 |

선택 섹션(어닝스 시즌·지정학 리스크 트래커 등)은 `Weekly_Foreign_Macro_Template.md` 참고.

---

## 참고 데이터 소스

| 분류 | 소스 |
|------|------|
| 미국 고용·물가 | [BLS](https://www.bls.gov/) |
| 미국 GDP·소득 | [BEA](https://www.bea.gov/) |
| 연준 금리·발언 | [federalreserve.gov](https://www.federalreserve.gov/) |
| 국채금리 시계열 | [FRED](https://fred.stlouisfed.org/) |
| CME FedWatch | [cmegroup.com](https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html) |
| 원자재·환율 | [Trading Economics](https://tradingeconomics.com/) |
| 국내 | [연합인포맥스](https://www.einfomax.co.kr/) · [한국은행](https://www.bok.or.kr/) |
| 일정 | [Econoday](https://us.econoday.com/) · [BLS 발표 일정](https://www.bls.gov/schedule/) |
