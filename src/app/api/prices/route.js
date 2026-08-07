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
        // 국내주식 (6자리 코드): 네이버 실시간 우선 → yahoo 폴백
        let got = false;
        try {
          const nres = await fetch(`https://polling.finance.naver.com/api/realtime/domestic/stock/${sym}`, {
            headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://finance.naver.com/" },
          });
          if (nres.ok) {
            const nd = await nres.json();
            const item = nd?.datas?.[0];
            if (item && item.closePrice) {
              const price = parseFloat(String(item.closePrice).replace(/,/g, ""));
              const chg = item.compareToPreviousClosePrice ? parseFloat(String(item.compareToPreviousClosePrice).replace(/,/g, "")) : 0;
              const chgPct = item.fluctuationsRatio ? parseFloat(item.fluctuationsRatio) : 0;
              results[sym] = { price, change: chg, changePct: chgPct, source: "naver" };
              got = true;
            }
          }
        } catch (e) {}
        if (!got) {
          // yahoo 폴백: 코스피(.KS) 시도 후 코스닥(.KQ)
          for (const suffix of [".KS", ".KQ"]) {
            try {
              const yurl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}${suffix}?interval=1d&range=1d`;
              const yres = await fetch(yurl);
              if (yres.ok) {
                const yd = await yres.json();
                const meta = yd.chart?.result?.[0]?.meta;
                if (meta?.regularMarketPrice) {
                  const prev = meta.previousClose || meta.chartPreviousClose;
                  results[sym] = {
                    price: meta.regularMarketPrice,
                    change: meta.regularMarketPrice - prev,
                    changePct: ((meta.regularMarketPrice - prev) / prev) * 100,
                    source: "yahoo" + suffix,
                  };
                  got = true;
                  break;
                }
              }
            } catch (e) {}
          }
        }
        if (!got) {
          results[sym] = { price: null, error: "국내 시세 조회 실패" };
        }
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
