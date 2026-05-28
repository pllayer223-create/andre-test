import { NextResponse } from "next/server";

export const revalidate = 1800;

export interface NaverReport {
  nid: string;
  title: string;
  publisher: string;
  date: string;         // "YYYY.MM.DD"
  category: string;
  viewUrl: string;
  pdfUrl: string | null;
}

// ── 영업일 계산 ────────────────────────────────
function getBusinessDaysAgo(n: number, from: Date = new Date()): Date {
  let count = 0;
  const d = new Date(from);
  while (count < n) {
    d.setDate(d.getDate() - 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

// "YY.MM.DD" or "YYYY.MM.DD" → Date
function parseNaverDate(s: string): Date | null {
  // YY.MM.DD (2자리 연도)
  const short = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (short) {
    return new Date(2000 + Number(short[1]), Number(short[2]) - 1, Number(short[3]));
  }
  // YYYY.MM.DD (4자리 연도)
  const full = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (full) {
    return new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]));
  }
  return null;
}

// YY.MM.DD → YYYY.MM.DD 문자열로 변환 (표시용)
function normalizeDate(s: string): string {
  const short = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (short) return `20${short[1]}.${short[2]}.${short[3]}`;
  return s;
}

// ── EUC-KR fetch ──────────────────────────────
async function fetchEucKr(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://finance.naver.com/research/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const buffer = await res.arrayBuffer();
  try {
    return new TextDecoder("euc-kr").decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

// ── HTML 파싱 ─────────────────────────────────
// 실제 Naver HTML 구조:
// <tr>
//   <td style="padding-left:10px"><a href="economy_read.naver?nid=XXX&page=1">제목</a></td>
//   <td>증권사명</td>
//   <td class="file"><a href="https://stock.pstatic.net/...pdf">...</a></td>
//   <td>YY.MM.DD</td>
//   <td>조회수</td>
// </tr>
function parseReportList(html: string, category: string): NaverReport[] {
  const reports: NaverReport[] = [];

  const readPath =
    category === "economy"   ? "economy_read"   :
    category === "debenture" ? "debenture_read" :
    "economy_read";

  // <tr> 블록 추출
  const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const row = trMatch[1];

    // nid + 제목 추출 (title 속성 없음 → 텍스트 노드 사용)
    // href="economy_read.naver?nid=13352&page=1">제목 텍스트</a>
    const linkMatch = row.match(
      /href="(?:[^"]*?)?(?:economy|strategy|industry|debenture)_read\.naver\?nid=(\d+)[^"]*">([^<]+)<\/a>/
    );
    if (!linkMatch) continue;

    const nid = linkMatch[1];
    const title = linkMatch[2].trim();
    if (!title) continue;

    // 모든 td 텍스트 추출 (태그 제거)
    const tdTexts = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim()
    );

    // 날짜: YY.MM.DD 또는 YYYY.MM.DD
    const dateRaw =
      tdTexts.find((t) => /^\d{2,4}\.\d{2}\.\d{2}$/.test(t)) ?? "";
    const date = normalizeDate(dateRaw);

    // 증권사: 날짜·숫자·빈값이 아닌 짧은 텍스트
    const publisher =
      tdTexts.find(
        (t) =>
          t &&
          !/^\d{2,4}\.\d{2}\.\d{2}$/.test(t) &&
          !/^[\d,]+$/.test(t) &&
          t.length > 0 &&
          t.length < 30
      ) ?? "";

    // PDF URL (pstatic.net CDN)
    const pdfMatch = row.match(/href="(https:\/\/stock\.pstatic\.net\/[^"]+\.pdf)"/i);
    const pdfUrl = pdfMatch ? pdfMatch[1] : null;

    reports.push({
      nid,
      title,
      publisher,
      date,
      category,
      viewUrl: `https://finance.naver.com/research/${readPath}.naver?nid=${nid}`,
      pdfUrl,
    });
  }

  return reports;
}

// ── 카테고리 정의 ─────────────────────────────
const CATEGORIES = [
  { key: "economy",   listPath: "economy_list",   readPath: "economy_read"   },
  { key: "debenture", listPath: "debenture_list", readPath: "debenture_read" },
];

// ── GET ───────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "all";

  const cutoffDate = getBusinessDaysAgo(3);

  const targetCategories =
    category === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.key === category);

  try {
    // 페이지 1·2 병렬 수집
    const fetchTasks = targetCategories.flatMap((cat) =>
      [1, 2].map(async (page) => {
        const url =
          `https://finance.naver.com/research/${cat.listPath}.naver` +
          (page > 1 ? `?&page=${page}` : "");
        try {
          const html = await fetchEucKr(url);
          return parseReportList(html, cat.key);
        } catch {
          return [] as NaverReport[];
        }
      })
    );

    const settled = await Promise.allSettled(fetchTasks);
    const allReports: NaverReport[] = [];
    settled.forEach((r) => {
      if (r.status === "fulfilled") allReports.push(...r.value);
    });

    // nid 중복 제거
    const seen = new Set<string>();
    const unique = allReports.filter((r) => {
      if (seen.has(r.nid)) return false;
      seen.add(r.nid);
      return true;
    });

    // 3영업일 필터 (날짜 파싱 실패 시 포함)
    const filtered = unique.filter((r) => {
      const d = parseNaverDate(r.date);
      if (!d) return true; // 날짜 불명확 → 일단 포함
      return d >= cutoffDate;
    });

    // 날짜 내림차순
    filtered.sort((a, b) => b.date.localeCompare(a.date));

    const cutoffStr = [
      cutoffDate.getFullYear(),
      String(cutoffDate.getMonth() + 1).padStart(2, "0"),
      String(cutoffDate.getDate()).padStart(2, "0"),
    ].join(".");

    return NextResponse.json({
      reports: filtered,
      fetchedAt: new Date().toISOString(),
      cutoffDate: cutoffStr,
      totalFetched: unique.length,
    });
  } catch (err) {
    console.error("[research API]", err);
    return NextResponse.json(
      { error: String(err), reports: [] },
      { status: 500 }
    );
  }
}
