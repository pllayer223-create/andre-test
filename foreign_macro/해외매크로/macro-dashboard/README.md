# 해외매크로 대시보드 (Market Briefing Dashboard)

> 외환·자금·재무 담당자를 위한 실시간 글로벌 경제지표 모니터링 대시보드  
> Next.js 15 · TypeScript · Tailwind CSS · Recharts

---

## 주요 기능

| 탭 | 설명 |
|---|---|
| **리서치** | 국내·국외 증권사/IB 당일 발간 리포트 (날짜 기준 필터) + 경제지표 일정 |
| **주요데이터** | 핵심 경제지표 카테고리별 카드 모니터링 (Yahoo Finance / FRED / BOK 실데이터) |
| **기본데이터** | 전체 경제지표 박스 카드 형식, 카테고리별 그룹핑 |
| **보고용** | Market Daily 전 지표 일람표 (인쇄 지원) |
| **차트** | 다중 시계열 비교 · 좌우 Y축 분리 · 5Y/10Y 기간 지원 |
| **검색** | 네이버·Google·Yahoo Finance·FRED 원천 데이터 검색 |
| **설정** | 테마·글꼴·이메일·텔레그램 공유·알림 규칙 설정 |
| **관리자** | 수기 조정·메뉴 구성·지표 추가·삭제 |

---

## 데이터 소스

| 소스 | 대상 지표 | 비용 |
|---|---|---|
| **Yahoo Finance** (v8 API) | 주가지수, 환율, 원자재 | 무료 (키 불필요) |
| **FRED** (St. Louis Fed) | 미국 금리, CPI, 고용 | 무료 API 키 필요 |
| **BOK ECOS** (한국은행) | 국내 금리, CPI, GDP, M2 | 무료 API 키 필요 |

---

## 빠른 시작

```bash
# 1. 의존성 설치
cd macro-dashboard
npm install

# 2. 환경 변수 설정
cp .env.local.example .env.local
# .env.local 편집 후 API 키 입력

# 3. 캐시 디렉토리 생성 (이미 있으면 건너뜀)
mkdir -p data/market

# 4. 개발 서버 실행
npm run dev
# → http://localhost:3000
```

---

## 환경 변수 (.env.local)

```env
# FRED API (https://fred.stlouisfed.org/docs/api/api_key.html)
FRED_API_KEY=your_fred_api_key_here

# 한국은행 ECOS API (https://ecos.bok.or.kr/api/)
BOK_API_KEY=your_bok_api_key_here
```

- Yahoo Finance는 키 없이 사용 가능
- API 키 미설정 시 더미 데이터로 자동 폴백

---

## 프로젝트 구조

```
macro-dashboard/
├── app/
│   ├── api/
│   │   ├── market-data/route.ts   # 실데이터 fetch + 파일 캐시 (Yahoo/FRED/BOK)
│   │   └── research/route.ts      # 리서치 리포트 API
│   ├── dashboard/page.tsx         # 메인 대시보드 (날짜 네비게이션, 탭 전환)
│   ├── login/page.tsx
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── dashboard/
│   │   ├── AdminSection.tsx       # 관리자 (수기조정·메뉴·지표관리)
│   │   ├── BasicDataSection.tsx   # 기본데이터 카드 그리드
│   │   ├── ChartCompareSection.tsx# 다중 시계열 차트
│   │   ├── ChartModal.tsx         # 개별 지표 차트 팝업
│   │   ├── CommentSection.tsx     # 리서치 + 지표 일정
│   │   ├── DateNavigator.tsx      # 날짜 탐색 (이전·오늘·다음)
│   │   ├── KeyDataSection.tsx     # 주요데이터 카드
│   │   ├── ReportSection.tsx      # 보고용 테이블
│   │   ├── ReportModal.tsx
│   │   └── SettingsSection.tsx    # 설정
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx            # 아이콘 사이드바 (메뉴 동적 관리)
│   └── search/
│       └── SearchPanel.tsx
│
├── lib/
│   ├── dummy-data.ts              # 폴백용 더미 데이터
│   ├── holidays.ts                # KRX·NYSE 공휴일 (2024-2026) + 로컬 날짜 유틸
│   ├── market-symbols.ts          # 지표 ID → API 심볼 매핑
│   ├── settings.ts                # 설정 타입 및 localStorage 유틸
│   └── types.ts                   # EconomicIndicator 등 공통 타입
│
├── data/
│   └── market/                    # YYYY-MM-DD.json 파일 캐시
│
└── public/
```

---

## 핵심 아키텍처 결정

### 날짜 처리 (시차 버그 방지)
```typescript
// ❌ 잘못된 방법: UTC 기준 → 한국(UTC+9)에서 하루 오차 발생
new Date().toISOString().slice(0, 10)

// ✅ 올바른 방법: 로컬 시각 기준
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
```

### 데이터 캐싱
- 서버: `data/market/YYYY-MM-DD.json` 파일 캐시 (Node.js `fs`)
- 최신 기준일 데이터 자동 탐색: `findLatestOnOrBefore(series, targetDate)` 이진 탐색

### Cross-Component 상태 동기화
- 관리자 → 사이드바: `window.dispatchEvent(new Event("macro_menu_updated"))`
- 설정 → 전체 UI: localStorage `macro_settings` + CSS 변수 즉시 적용

---

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3 + CSS 변수 (다크/딤/라이트 테마)
- **Charts**: Recharts
- **Icons**: Lucide React
- **State**: React useState/useEffect (no external state library)
- **Cache**: Node.js fs (서버), localStorage (클라이언트)

---

## 라이선스

Private — 개인/업무 내부 사용 목적
