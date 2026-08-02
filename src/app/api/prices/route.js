// 여러 종목의 실시간 가격을 한번에 조회
export async function POST(request) {
  const { symbols } = await request.json();
  if (!symbols || !Array.isArray(symbols)) {
    return Response.json({ error: "symbols 필요" }, { status: 400 });
  }

  const results = {};

  await Promise.all(symbols.map(async (sym) => {
    try {
      if (sym.startsWith("KRW-")) {
        // 코인: 업비트 API
        const url = `https://api.upbit.com/v1/ticker?markets=${sym}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            results[sym] = {
              price: data[0].trade_price,
              change: data[0].signed_change_price,
              changePct: data[0].signed_change_rate * 100,
              source: "upbit",
            };
          }
        }
      } else if (sym.includes("/USD") || sym.includes("/USDT")) {
        // 기존 해외 코인 (호환성 유지)
        const cleanSym = sym.replace("/USDT", "-USD").replace("/USD", "-USD");
        const url = `https://api.coinbase.com/v2/prices/${cleanSym}/spot`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          results[sym] = { price: parseFloat(data.data.amount), source: "coinbase" };
        }
      } else if (/^\d{6}$/.test(sym)) {
        // 국내주식 (6자리 코드)
        results[sym] = { price: null, error: "국내 실시간 미지원" };
      } else {
        // 해외주식: Yahoo Finance
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const meta = data.chart?.result?.[0]?.meta;
          if (meta?.regularMarketPrice) {
            results[sym] = {
              price: meta.regularMarketPrice,
              change: meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose),
              changePct: ((meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose)) / (meta.previousClose || meta.chartPreviousClose)) * 100,
              source: "yahoo",
            };
          }
        }
      }
    } catch (e) {
      results[sym] = { price: null, error: e.message };
    }
  }));

  return Response.json({ prices: results, timestamp: new Date().toISOString() });
}
