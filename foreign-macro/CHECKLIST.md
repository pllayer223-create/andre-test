# 주간 데이터 수집 체크리스트

> 매주 **월요일 ~ 일요일 자정** 작성 기준.
> 수집 후 `data/data_YYYYMMDD.json` 파일에 입력 → `generate_report.py` 실행

---

## 1단계 — 핵심 요약 작성
- [ ] 이번 주 시장·정책·이슈 1~2줄 압축 (사실 기반)

---

## 2단계 — 글로벌 증시 (섹션 2-1)
| 확인 항목 | 소스 |
|-----------|------|
| S&P 500 주간 종가·등락 | [CNBC Markets](https://www.cnbc.com/markets/) |
| NASDAQ 주간 종가·등락 | CNBC / Bloomberg |
| DOW 주간 종가·등락 | CNBC / Bloomberg |
| Euro Stoxx 50 | investing.com |
| FTSE 100 | investing.com |
| 닛케이 225 | investing.com |
| 항셍 | investing.com |
| KOSPI | 연합인포맥스 / KRX |

- [ ] 위 지수 모두 입력 완료

---

## 3단계 — 채권금리 (섹션 2-2)
| 확인 항목 | 소스 |
|-----------|------|
| 미 2년물 수익률 | [FRED DGS2](https://fred.stlouisfed.org/series/DGS2) |
| 미 10년물 수익률 | [FRED DGS10](https://fred.stlouisfed.org/series/DGS10) |
| 미 30년물 수익률 | [FRED DGS30](https://fred.stlouisfed.org/series/DGS30) |
| 10Y-2Y 스프레드 | [FRED T10Y2Y](https://fred.stlouisfed.org/series/T10Y2Y) |
| Fed H.15 일별 금리표 | [federalreserve.gov/releases/h15](https://www.federalreserve.gov/releases/h15/) |

- [ ] 금주·전주 수익률 입력 완료

---

## 4단계 — 원자재 (섹션 2-3)
| 확인 항목 | 소스 |
|-----------|------|
| WTI 원유 종가 | [EIA](https://www.eia.gov/) / Trading Economics |
| Brent 원유 종가 | Trading Economics |
| 천연가스 | EIA |
| 금 ($/oz) | [Kitco](https://www.kitco.com/) / Trading Economics |
| 구리 | Trading Economics / LME |

- [ ] 금주 종가·전월비·전년비 입력 완료

---

## 5단계 — 외환 (섹션 2-4)
| 확인 항목 | 소스 |
|-----------|------|
| DXY 달러인덱스 | [ICE](https://www.theice.com/) / Bloomberg |
| EUR/USD | 연합인포맥스 / Bloomberg |
| USD/JPY | 연합인포맥스 / Bloomberg |
| USD/CNY | 연합인포맥스 / Bloomberg |
| USD/KRW | [연합인포맥스](https://www.einfomax.co.kr/) / 한국은행 |

- [ ] 금주·전주 환율 입력 완료

---

## 6단계 — 주간 경제지표 발표 결과 (섹션 2-5)
| 확인 항목 | 소스 |
|-----------|------|
| 해당 주 발표된 미국 지표 실제치 | [BLS](https://www.bls.gov/) / [BEA](https://www.bea.gov/) |
| 예상치 대비 평가 (상회/부합/하회) | Econoday / Bloomberg |
| 유의미한 서프라이즈 지표 메모 | — |

- [ ] 실제치·예상치·전월치 3단 비교 입력 완료

---

## 7단계 — 연준 동향 (섹션 2-6)
| 확인 항목 | 소스 |
|-----------|------|
| 기준금리 현황 확인 | [Fed 홈페이지](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) |
| 주중 연준 인사 발언 수집 | Fed 홈페이지 / CNBC |
| CME FedWatch 인하 확률 | [CME FedWatch](https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html) |

- [ ] 발언 요지 + 매파/비둘기파 성격 분류 완료

---

## 8단계 — 핵심 이슈 뉴스 (섹션 3)
- [ ] 이슈 1 — 배경/경과/시장 영향/의견 작성
- [ ] 이슈 2 — 배경/경과/시장 영향/의견 작성
- [ ] 이슈 3 (선택) — 배경/경과/시장 영향/의견 작성
- [ ] **사실·의견 구분** 재확인

---

## 9단계 — 다음 주 일정 (섹션 4)
| 확인 항목 | 소스 |
|-----------|------|
| 미국 주요 지표 발표 일정 | [BLS 일정](https://www.bls.gov/schedule/) / Econoday |
| 연준 인사 발언 일정 | [Fed 캘린더](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) |
| FOMC 회의 여부 확인 | Fed 캘린더 |
| 주요국 중앙은행 일정 | ECB / 日銀 홈페이지 |

- [ ] 예상치·전월치 입력, 중요도(★) 표시 완료

---

## 10단계 — 시사점 및 전망 (섹션 5)
- [ ] 경기·인플레이션 [사실] / [의견] 작성
- [ ] 통화정책 [사실] / [의견] 작성
- [ ] 지정학·무역 [사실] / [의견] 작성
- [ ] 다음 주 체크포인트 (시나리오 A/B 포함)

---

## 최종 확인
- [ ] `data/data_YYYYMMDD.json` 저장 완료
- [ ] `.venv\Scripts\python.exe generate_report.py` 실행
- [ ] docx 열어서 표·폰트·색상 이상 없는지 육안 확인
- [ ] `archive/YYYY/` 폴더로 이동
