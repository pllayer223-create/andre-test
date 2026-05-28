# 해외매크로 대시보드 — 로컬 실행 가이드

## 사전 요구사항

- Node.js 18.x 이상 ([nodejs.org](https://nodejs.org) 설치)
- npm 9.x 이상 (Node.js 설치 시 자동 포함)

## 빠른 시작

```bash
# 1. 이 폴더로 이동
cd macro-dashboard

# 2. 패키지 설치 (최초 1회)
npm install

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 접속 → 자동으로 대시보드로 이동합니다.

---

## 현재 구현 상태 (Phase 1 — UI Only)

| 기능 | 상태 |
|------|------|
| 로그인 페이지 (Google OAuth UI) | ✅ 구현 (더미) |
| 사이드바 네비게이션 (4개 탭) | ✅ 구현 |
| 핵심 코멘트 섹션 (국내/국외) | ✅ 구현 (더미데이터) |
| 당일 리서치 리포트 목록 | ✅ 구현 (더미데이터) |
| 주요 데이터 카드 (국내 14개, 국외 15개) | ✅ 구현 (더미데이터) |
| 차트 팝업 (3년 시계열) | ✅ 구현 (더미데이터) |
| 기본 데이터 테이블 (카테고리별) | ✅ 구현 (더미데이터) |
| 검색 패널 (6개 엔진 연동) | ✅ 구현 |
| Supabase 연동 | ⏳ Phase 2 |
| Google OAuth 실제 로그인 | ⏳ Phase 2 |
| 실시간 데이터 수집 | ⏳ Phase 2 |

---

## 디렉터리 구조

```
macro-dashboard/
├── app/
│   ├── layout.tsx          # 루트 레이아웃 (다크모드 기본)
│   ├── globals.css         # 전역 스타일 (CSS 변수)
│   ├── page.tsx            # / → /dashboard 리다이렉트
│   ├── login/page.tsx      # 로그인 페이지
│   └── dashboard/page.tsx  # 메인 대시보드
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx     # 좌측 아이콘 네비게이션
│   │   └── Header.tsx      # 상단 헤더 (날짜/상태)
│   ├── dashboard/
│   │   ├── CommentSection.tsx   # 핵심 코멘트 + 리서치
│   │   ├── KeyDataSection.tsx   # 주요 데이터 카드뷰
│   │   ├── BasicDataSection.tsx # 기본 데이터 테이블뷰
│   │   └── ChartModal.tsx       # 3년 시계열 차트 팝업
│   └── search/
│       └── SearchPanel.tsx # 다중 검색엔진 패널
├── lib/
│   ├── types.ts            # TypeScript 타입 정의
│   └── dummy-data.ts       # 더미 데이터 (국내/국외)
├── package.json
├── tsconfig.json
├── next.config.ts
└── postcss.config.mjs
```

---

## Phase 2 구현 예정 (기능 단계)

1. **Supabase 연동**
   - `.env.local` 파일 생성 후 SUPABASE_URL, ANON_KEY 입력
   - Google OAuth 로그인 실제 동작

2. **데이터 수집 파이프라인**
   - 한국은행 ECOS API, FRED API, KRX 데이터
   - Supabase Edge Functions로 스케줄링

3. **실시간 갱신**
   - Supabase Realtime 구독
   - 매주 금요일 자동 갱신

4. **배포**
   - Vercel 배포 (Next.js 최적화)
   - 또는 AWS EC2 + nginx

---

## 환경 변수 설정 (Phase 2)

`.env.local.example`을 `.env.local`로 복사 후 값 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
