"""
Claude API 자연어 데이터 쿼리 인터페이스 (Q3)

JSON 데이터를 자연어 프롬프트로 조회합니다.

사용법:
  python query_data.py "KOSPI 최근 5일 평균은?"
  python query_data.py "WTI와 브렌트유의 스프레드 추이를 설명해줘"
  python query_data.py --interactive     ← 대화형 쿼리 모드

환경 변수:
  ANTHROPIC_API_KEY=sk-ant-...

의존성:
  pip install anthropic
"""

import json, sys, os
from pathlib import Path

BASE = Path(__file__).parent

try:
    import anthropic
except ImportError:
    print("[ERROR] anthropic 패키지가 설치되지 않았습니다.")
    print("  실행: pip install anthropic")
    sys.exit(1)


# ── 데이터 로더 ──────────────────────────────────────────────────────

def load_context() -> dict:
    """쿼리에 사용할 데이터 컨텍스트 로드."""
    ctx = {}

    # 히스토리컬 데이터 (주간)
    weekly_hist = BASE / "data" / "historical_data.json"
    if weekly_hist.exists():
        ctx["weekly_historical"] = json.loads(weekly_hist.read_text(encoding="utf-8"))

    # 히스토리컬 데이터 (일별)
    daily_hist = BASE / "data" / "historical_daily.json"
    if daily_hist.exists():
        ctx["daily_historical"] = json.loads(daily_hist.read_text(encoding="utf-8"))

    # 최신 일별 데이터
    daily_dir = BASE / "data" / "daily"
    if daily_dir.exists():
        folders = sorted([d for d in daily_dir.iterdir() if d.is_dir()])
        if folders:
            latest = folders[-1]
            ctx["latest_daily"] = {"report_date": latest.name}
            for fname in ["domestic_rates","domestic_markets","investor_flow",
                          "overseas_rates","overseas_markets","commodities","commentary"]:
                fp = latest / f"{fname}.json"
                if fp.exists():
                    ctx["latest_daily"][fname] = json.loads(fp.read_text(encoding="utf-8"))

    # 최신 주간 데이터
    weekly_files = sorted((BASE / "data").glob("data_*.json"))
    if weekly_files:
        ctx["latest_weekly"] = json.loads(weekly_files[-1].read_text(encoding="utf-8"))

    return ctx


# ── Tool 정의 ────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "query_market_data",
        "description": "JSON 데이터에서 특정 시장 데이터를 검색합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "data_source": {
                    "type": "string",
                    "enum": ["daily_historical", "weekly_historical", "latest_daily", "latest_weekly"],
                    "description": "조회할 데이터 소스"
                },
                "metric": {
                    "type": "string",
                    "description": "조회할 지표 (예: kospi, us_10y, wti, btc 등)"
                },
                "operation": {
                    "type": "string",
                    "enum": ["latest", "average", "max", "min", "trend", "list"],
                    "description": "수행할 연산"
                },
                "periods": {
                    "type": "integer",
                    "description": "조회할 기간 수 (최근 N개월/일)"
                }
            },
            "required": ["data_source", "metric", "operation"]
        }
    },
    {
        "name": "compare_metrics",
        "description": "두 지표를 비교 분석합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "metric_a": {"type": "string", "description": "첫 번째 지표"},
                "metric_b": {"type": "string", "description": "두 번째 지표"},
                "data_source": {"type": "string", "enum": ["daily_historical", "weekly_historical"]}
            },
            "required": ["metric_a", "metric_b", "data_source"]
        }
    }
]


# ── Tool 실행 ────────────────────────────────────────────────────────

import statistics

def execute_tool(tool_name: str, tool_input: dict, context: dict) -> str:
    if tool_name == "query_market_data":
        src    = tool_input["data_source"]
        metric = tool_input["metric"].lower()
        op     = tool_input["operation"]
        periods= tool_input.get("periods", 12)

        data = context.get(src, {})
        if not data:
            return f"데이터 소스 '{src}'를 찾을 수 없습니다."

        # 히스토리컬 데이터 조회
        if src in ("daily_historical", "weekly_historical"):
            # 키 매칭 (대소문자, 별칭 포함)
            aliases = {
                "s&p500": "sp500", "s&p": "sp500", "sp": "sp500",
                "코스피": "kospi", "코스닥": "kosdaq",
                "미국10y": "us_10y", "미국10년": "us_10y",
                "원달러": "usdkrw", "달러원": "usdkrw",
                "wti유": "wti", "원유": "wti",
                "비트코인": "btc", "이더리움": "eth",
            }
            key = aliases.get(metric, metric)
            series = data.get(key)
            if not series:
                avail = [k for k in data.keys() if k not in ("labels","_note")]
                return f"지표 '{metric}'를 찾을 수 없습니다. 사용 가능: {', '.join(avail[:10])}"

            values = series["values"][-periods:]
            labels = data.get("labels", [])[-periods:]
            label  = series.get("label", metric)
            unit   = series.get("unit", "")

            if op == "latest":
                return f"{label} 최신값: {values[-1]:,.3g} {unit} ({labels[-1] if labels else ''})"
            elif op == "average":
                avg = statistics.mean(v for v in values if v is not None)
                return f"{label} 최근 {periods}개월 평균: {avg:,.3g} {unit}"
            elif op == "max":
                m = max(v for v in values if v is not None)
                idx = values.index(m)
                return f"{label} 최대값: {m:,.3g} {unit} ({labels[idx] if idx < len(labels) else ''})"
            elif op == "min":
                m = min(v for v in values if v is not None)
                idx = values.index(m)
                return f"{label} 최소값: {m:,.3g} {unit} ({labels[idx] if idx < len(labels) else ''})"
            elif op == "trend":
                if len(values) >= 2:
                    chg = values[-1] - values[0]
                    pct = chg / values[0] * 100 if values[0] else 0
                    return (f"{label} 추이 ({periods}개월): "
                            f"{values[0]:,.3g} → {values[-1]:,.3g} {unit} "
                            f"({'+' if chg >= 0 else ''}{chg:.3g}, {'+' if pct >= 0 else ''}{pct:.1f}%)")
                return f"데이터 부족"
            elif op == "list":
                rows = [f"{labels[i] if i < len(labels) else i}: {v:,.3g}" for i, v in enumerate(values)]
                return f"{label} 최근 {periods}개 데이터:\n" + "\n".join(rows)

        # 최신 일별/주간 데이터
        elif src in ("latest_daily", "latest_weekly"):
            return f"데이터 소스 '{src}' 내용:\n" + json.dumps(data, ensure_ascii=False)[:800]

        return "처리할 수 없는 요청입니다."

    elif tool_name == "compare_metrics":
        ma = tool_input["metric_a"].lower()
        mb = tool_input["metric_b"].lower()
        src = tool_input["data_source"]
        data = context.get(src, {})

        series_a = data.get(ma)
        series_b = data.get(mb)
        if not series_a or not series_b:
            return f"지표를 찾을 수 없습니다: {ma}, {mb}"

        va, vb = series_a["values"], series_b["values"]
        n = min(len(va), len(vb))
        labels = data.get("labels", [])

        corr_num = sum((va[i] - statistics.mean(va[:n])) * (vb[i] - statistics.mean(vb[:n])) for i in range(n))
        std_a = statistics.stdev(va[:n]) or 1
        std_b = statistics.stdev(vb[:n]) or 1
        corr = corr_num / (n * std_a * std_b)

        return (f"{series_a['label']} vs {series_b['label']} 비교:\n"
                f"  - {series_a['label']}: {va[0]:.3g} → {va[-1]:.3g} ({series_a['unit']})\n"
                f"  - {series_b['label']}: {vb[0]:.3g} → {vb[-1]:.3g} ({series_b['unit']})\n"
                f"  - 상관계수 (피어슨): {corr:.3f}\n"
                f"  - 기간: {labels[0] if labels else '—'} ~ {labels[-1] if labels else '—'}")

    return "알 수 없는 도구입니다."


# ── Claude API 쿼리 ──────────────────────────────────────────────────

def query(user_prompt: str, context: dict, verbose=False) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return "[ERROR] ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다."

    client = anthropic.Anthropic(api_key=api_key)

    # 컨텍스트 요약 (토큰 절약)
    ctx_summary = {
        "available_sources": list(context.keys()),
        "daily_historical_metrics": list(context.get("daily_historical", {}).keys()),
        "latest_daily_date": context.get("latest_daily", {}).get("report_date"),
    }

    system_prompt = f"""당신은 금융 시장 데이터 분석 어시스턴트입니다.
사용 가능한 데이터:
{json.dumps(ctx_summary, ensure_ascii=False, indent=2)}

도구를 활용해 데이터를 조회하고 한국어로 명확하게 답변하세요.
숫자는 읽기 쉽게 포맷하고, 필요시 추세와 맥락을 설명하세요."""

    messages = [{"role": "user", "content": user_prompt}]

    if verbose:
        print(f"[쿼리] {user_prompt}")

    for _ in range(5):  # 최대 5번 tool_use 루프
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=system_prompt,
            tools=TOOLS,
            messages=messages,
        )

        if verbose:
            print(f"[모델] stop_reason={response.stop_reason}")

        if response.stop_reason == "end_turn":
            # 최종 텍스트 응답
            texts = [b.text for b in response.content if hasattr(b, "text")]
            return "\n".join(texts)

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    if verbose:
                        print(f"[도구] {block.name}({json.dumps(block.input, ensure_ascii=False)[:100]})")
                    result = execute_tool(block.name, block.input, context)
                    if verbose:
                        print(f"[결과] {result[:120]}")
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            messages.append({"role": "user", "content": tool_results})
        else:
            break

    return "[ERROR] 응답을 생성할 수 없습니다."


# ── 메인 ─────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    verbose = "--verbose" in args or "-v" in args
    interactive = "--interactive" in args or "-i" in args
    args = [a for a in args if not a.startswith("-")]

    print("■ 데이터 로드 중...", end=" ", flush=True)
    context = load_context()
    print(f"완료 ({len(context)}개 소스)")

    if interactive:
        print("\n===== 대화형 쿼리 모드 (종료: q 또는 exit) =====\n")
        while True:
            try:
                prompt = input("질문 > ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n종료합니다.")
                break
            if prompt.lower() in ("q", "quit", "exit", "종료"):
                break
            if not prompt:
                continue
            answer = query(prompt, context, verbose=verbose)
            print(f"\n{answer}\n")
        return

    if not args:
        print("사용법:")
        print('  python query_data.py "KOSPI 최근 3개월 평균은?"')
        print("  python query_data.py --interactive")
        print("\n예시 질문:")
        print('  "미국 10년물 금리와 한국 국고채 3년물의 상관관계는?"')
        print('  "WTI 원유 최고점은 언제이고 얼마였나?"')
        print('  "KOSPI와 S&P500 최근 6개월 추이를 비교해줘"')
        return

    prompt = " ".join(args)
    answer = query(prompt, context, verbose=verbose)
    print(f"\n{answer}")


if __name__ == "__main__":
    main()
