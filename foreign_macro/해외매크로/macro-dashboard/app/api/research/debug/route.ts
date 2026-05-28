import { NextResponse } from "next/server";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://finance.naver.com/research/",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

async function checkUrl(url: string, keyword: string) {
  try {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    const buffer = await res.arrayBuffer();
    const html = new TextDecoder("euc-kr").decode(buffer);
    const count = (html.match(new RegExp(keyword, "g")) ?? []).length;
    const dates = [...new Set(html.match(/\d{2}\.\d{2}\.\d{2}/g) ?? [])].slice(0, 3);
    return { status: res.status, matchCount: count, dateSamples: dates, ok: count > 0 };
  } catch (e) {
    return { status: 0, matchCount: 0, dateSamples: [], ok: false, error: String(e) };
  }
}

export async function GET() {
  const [economy, debenture, strategy, industry] = await Promise.all([
    checkUrl("https://finance.naver.com/research/economy_list.naver",  "economy_read"),
    checkUrl("https://finance.naver.com/research/debenture_list.naver","debenture_read"),
    checkUrl("https://finance.naver.com/research/strategy_list.naver", "strategy_read"),
    checkUrl("https://finance.naver.com/research/industry_list.naver", "industry_read"),
  ]);

  return NextResponse.json({ economy, debenture, strategy, industry });
}
