# 해외매크로 대시보드 — 개발 로그

> 작성: 2026-05-27  
> 목적: 외환·자금·재무 업무 지원을 위한 글로벌 경제지표 모니터링 대시보드 구축 과정 기록

---

## 배경 및 목표

외환·자금·재무 담당 실무자가 매일 시장 동향을 파악하기 위해 여러 사이트를 수동으로 확인해야 하는 비효율을 해소하고자 시작.  
국내외 주요 경제지표(주가·환율·금리·물가·원자재 등)를 한 화면에서 조회하고, 날짜별 데이터 탐색·리서치 보고서 열람·보고용 출력까지 가능한 통합 대시보드를 목표로 함.

---

## Phase 1 — 기본 UI 구현

### 구현 내용
- Next.js 15 App Router 기반 프로젝트 초기화
- 더미 데이터(dummy-data.ts) 기반 UI 전체 구성
- 다크 테마 기반 사이드바 + 탭 네비게이션
- 주요 섹션 초안: 코멘트, 주요데이터, 기본데이터, 검색

### 주요 파일
- `lib/dummy-data.ts`: 국내·해외 경제지표 더미 데이터
- `lib/types.ts`: `EconomicIndicator` 공통 타입
- `components/layout/Sidebar.tsx`: 아이콘 사이드바
- `app/globals.css`: CSS 변수 기반 다크/딤/라이트 테마

---

## Phase 2 — 기능 확장

### 추가된 기능
- **보고용 탭**: Market Daily 전 지표 일람표, 인쇄(Ctrl+P) 지원
- **차트 비교 탭**: Recharts 기반 다중 시계열 비교, 좌우 Y축 분리 수동 지정
- **설정 탭**: 테마·글꼴·공유 채널·알림 규칙 설정, localStorage 영구 저장
- **관리자 탭**: 수기 조정, 메뉴 구성, 지표 추가·삭제
- 경제지표 발표 일정 더미 데이터 추가

### 지표 확장
- 해외 지표 추가: US 30Y 국채, EUR/USD, USD/JPY 등

---

## Phase 3 — 실데이터 API 연동

### 목표
더미 데이터 → 실제 API 데이터 전환. 주말/공휴일 "데이터 없음" 처리. 날짜 기반 탐색.

### 구현된 데이터 소스

| 소스 | 지표 예시 | 비고 |
|---|---|---|
| Yahoo Finance v8 | KOSPI, KOSDAQ, USD/KRW, S&P500, WTI, Gold | 키 불필요 |
| FRED API | 미국 FF금리, 2Y/10Y/30Y, CPI, 실업률 | 무료 키 |
| BOK ECOS | 한국 기준금리, 국채수익률, CPI, GDP, M2 | 무료 키 |

### 핵심 파일

#### `lib/holidays.ts`
- KRX 2024–2026 공휴일 Set (O(1) 조회)
- NYSE 2024–2026 공휴일 Set
- `localToday()`, `localDateStr(d)`: 시차 버그 방지용 로컬 날짜 함수
- `isKRXBusinessDay()`, `isNYSEBusinessDay()`
- `prevBusinessDay()`, `lastBusinessDay()`

#### `lib/market-symbols.ts`
- `SymbolMapping` 인터페이스: indicatorId → source·symbol 매핑
- `DOMESTIC_SYMBOLS[]`: 국내 지표 26개
- `FOREIGN_SYMBOLS[]`: 해외 지표 30+개
- 전체 Yahoo 10년(10y), FRED 2015-01-01부터 수집

#### `app/api/market-data/route.ts`
- GET `/api/market-data?date=YYYY-MM-DD[&refresh=1]`
- 파일 캐시: `data/market/YYYY-MM-DD.json`
- `fetchYahoo()`, `fetchFred()`, `fetchBok()` 개별 fetch 함수
- `findLatestOnOrBefore(series, targetDate)`: 이진 탐색으로 날짜 기준 최근값 추출
- `calcTrend()`: 전일비·등락률 계산 (부호 보존)
- `validateIndicators()`: 오래된 데이터·결측 검증
- fetch 실패 시 더미 데이터 폴백

#### `components/dashboard/DateNavigator.tsx`
- 이전·오늘·다음 버튼 + 날짜 input
- `DayBadge`: 영업일/KRX휴장/NYSE휴장/토·일·한미공휴일 구분 배지
- 미래 날짜 이동 방지

---

## Phase 4 — 7개 영역 전면 리팩토링

### 1. 핵심 코멘트 → 리서치
**변경 전**: 좌측 매크로 코멘트 카드 + 우측 리서치·일정 탭  
**변경 후**: 좌측 전체 = 리서치 리포트 (날짜 기준 필터), 우측 = 지표 일정만

- `CommentSection.tsx` 전면 재작성
- `/api/research` → publishedAt 기준 날짜 필터
- 선택 날짜 리포트 없을 때 안내 메시지

### 2. 주요데이터
- 참조 링크 수정 (잘못된 외부 사이트 → 올바른 소스)
- 관리자에서 순서 변경 가능
- 데이터 없음 처리

### 3. 기본데이터 — 행 테이블 → 박스 카드
**변경 전**: HTML table 행  
**변경 후**: `DataCard` + `CategoryBlock` 카드 그리드

```
repeat(auto-fill, minmax(180px, 1fr))
```

- 카테고리별 색상 구분 바 + 헤더
- 트렌드 아이콘 (↑↓─), 등락률 배지

### 4. 보고용
- `indicators` prop 수신 → 실데이터 표시
- `date` prop → 기준일 표시 수정 (TODAY 변수 제거)

### 5. 차트
- 지수화(normalize) 기능 제거
- Y축 단위 레이블 추가 (좌축: `leftUnit`, 우축: `rightUnit`)
- 5Y·10Y 기간 옵션 추가

### 6. 설정
- 카카오 공유 섹션 완전 제거
- `indicators?: EconomicIndicator[]`, `date?: string` props 추가
- `buildMarketSummary()`: 실데이터 기반, 선택 날짜 기준일 표시
- CSV 내보내기도 실데이터 사용

### 7. 관리자
- 수기 조정: localStorage `macro_indicators_override` 저장 → 새로고침 후에도 유지
- 메뉴 구성 순서 변경 → `window.dispatchEvent("macro_menu_updated")` → Sidebar 즉시 반영
- Sidebar: `applyMenuConfig()` 함수 분리 + 이벤트 리스너 등록
- 지표 추가 폼 간소화: 한글명·현재값·단위·카테고리·지역·주기만 입력 (ID 자동 생성)

---

## 트러블슈팅 기록

### 1. 이틀 간격 날짜 이동 버그 (가장 중요)
**증상**: 날짜 이동 버튼 클릭 시 하루가 아닌 이틀씩 이동  
**원인**: `new Date().toISOString()` → UTC 기준. 한국(UTC+9)에서 자정 이후 하루 밀림  
**해결**: 모든 날짜 연산을 `localToday()`, `localDateStr(d)` (getFullYear/Month/Date 사용)로 통일

```typescript
// ❌ Before
const today = new Date().toISOString().slice(0, 10);

// ✅ After
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
```

### 2. Yahoo Finance 날짜 파싱
**원인**: Yahoo timestamp는 UTC 자정 기준 → `getUTCFullYear/Month/Date()` 사용 필수  
**해결**: `tsToDate(ts)` 함수로 일원화

### 3. KeyDataSection.tsx 빌드 에러 (Unexpected token `[`)
**원인**: Edit 도구가 파일 중간을 truncate → 고아 코드(`indicators={grouped[cat]}`) 309줄 이후 잔류  
**해결**: bash `head -308 > tmp && cp tmp target` 로 클린 truncate

### 4. TODAY is not defined 런타임 에러
**원인**: dummy-data.ts의 `TODAY` import는 제거했으나 JSX 303줄에 `{TODAY}` 참조 잔류  
**해결**: `{TODAY}` → `{dateStr}` 로 교체

### 5. 전일비 항상 양수
**원인**: `calcTrend()`에서 `Math.abs(diff)` 사용  
**해결**: `Math.round(diff * 10000) / 10000` (부호 보존)

### 6. 관리자 저장이 사이드바에 미반영
**원인**: AdminSection과 Sidebar가 props 연결 없음  
**해결**: `window.dispatchEvent(new Event("macro_menu_updated"))` + Sidebar에 이벤트 리스너 등록

---

## 향후 개선 과제

1. **2027년 이후 공휴일**: `lib/holidays.ts` 연도별 갱신 필요
2. **리서치 API 실연동**: 현재 `/api/research`는 더미 응답. 네이버 금융/증권사 API 연동 필요
3. **서버 스케줄러**: 일일 시장 요약 자동 전송 (현재 브라우저 열림 시에만 동작)
4. **BOK 지표 코드 검증**: 일부 통계표 코드가 변경될 수 있음 → ECOS 최신 코드 확인
5. **ISM 제조업·서비스업**: `manual` 소스로 표시됨 → 수기 입력 또는 유료 데이터 연동
6. **지표 추가 자동 참조**: 관리자에서 한글명 입력 시 심볼 자동 검색 (현재 미구현)
7. **시계열 CSV 내보내기**: 현재 스냅샷만 지원

---

## 기술 스택 최종 정리

| 항목 | 선택 | 이유 |
|---|---|---|
| Framework | Next.js 15 App Router | SSR API routes + 클라이언트 컴포넌트 혼용 |
| Language | TypeScript | 타입 안전 데이터 구조 |
| Styling | Tailwind CSS v3 + CSS 변수 | 빠른 개발 + 테마 전환 |
| Charts | Recharts | React 친화적, 좌우 이중 축 지원 |
| State | React 내장 (useState/useEffect) | 규모 대비 외부 라이브러리 불필요 |
| 데이터 캐시 | Node.js fs (서버) + localStorage (클라이언트) | 서버리스 환경에서 가장 단순한 방법 |
| 공휴일 | 하드코딩 Set | API 의존성 없이 O(1) 조회 |
