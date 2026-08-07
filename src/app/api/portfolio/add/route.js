async function verifyTicker(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.quotes && data.quotes.length > 0) {
      const quote = data.quotes[0];
      if (quote.symbol === symbol || quote.symbol === symbol.toUpperCase()) {
        return { valid: true, name: quote.longname || quote.shortname || symbol };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function POST(request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return Response.json({ error: "GITHUB_TOKEN 미설정" }, { status: 500 });

  const body = await request.json();
  const { symbol, buy_price, quantity, buy_date, verify, name: reqName } = body;

  if (!symbol || !buy_price || !quantity) {
    return Response.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  let name = reqName || symbol;

  if (verify) {
    const verified = await verifyTicker(symbol);
    if (!verified) {
      return Response.json({ error: `티커 '${symbol}' 확인 실패. 다시 확인해주세요.` }, { status: 400 });
    }
    name = verified.name;
  }

  const REPO = "seohyun723/investbot-frontend";
  const PATH = "public/portfolio.json";
  const API_BASE = "https://api.github.com";

  // 손절가/목표가 계산 (매수가 기준 고정 박제)
  const calcTargets = (avgPrice, isStrong) => {
    // 강력매수: 목표 +18% / 손절 -10%, 일반: 목표 +12% / 손절 -7%
    const tRate = isStrong ? 1.18 : 1.12;
    const sRate = isStrong ? 0.90 : 0.93;
    return {
      target_price: avgPrice * tRate,
      stoploss_price: avgPrice * sRate,
    };
  };

  try {
    let sha = null;
    let currentData = { holdings: [] };
    try {
      const getRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${PATH}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
        const content = Buffer.from(fileData.content, "base64").toString("utf-8");
        currentData = JSON.parse(content);
      }
    } catch (e) {}

    currentData.holdings = currentData.holdings || [];

    // 같은 종목이 이미 있으면 추가매수 → 평단 재계산
    const existing = currentData.holdings.find(
      (h) => h.symbol === symbol && h.status === "active"
    );

    if (existing) {
      const oldQty = parseFloat(existing.quantity);
      const oldPrice = parseFloat(existing.buy_price);
      const addQty = parseFloat(quantity);
      const addPrice = parseFloat(buy_price);
      const newQty = oldQty + addQty;
      const newAvg = (oldPrice * oldQty + addPrice * addQty) / newQty;
      // 손절가/목표가는 기존 강력매수 여부 유지 (있으면 비율 유지, 없으면 일반)
      const wasStrong = existing.is_strong || false;
      const { target_price, stoploss_price } = calcTargets(newAvg, wasStrong);

      existing.quantity = newQty;
      existing.buy_price = newAvg;
      existing.target_price = target_price;
      existing.stoploss_price = stoploss_price;
      existing.name = name !== symbol ? name : existing.name;
      existing.updated_at = new Date().toISOString();

      const newContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString("base64");
      const putRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${PATH}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Add-buy ${symbol}`,
          content: newContent,
          sha: sha || undefined,
        }),
      });
      if (putRes.ok) {
        return Response.json({ status: "averaged", name: existing.name, holding: existing });
      }
      return Response.json({ error: "GitHub 저장 실패" }, { status: 500 });
    }

    // 신규 등록
    const { target_price, stoploss_price } = calcTargets(parseFloat(buy_price), false);
    const newHolding = {
      id: Date.now().toString(),
      symbol,
      name,
      buy_price: parseFloat(buy_price),
      quantity: parseFloat(quantity),
      buy_date: buy_date || new Date().toISOString(),
      target_price,
      stoploss_price,
      is_strong: false,
      status: "active",
      user_added: true,
    };
    currentData.holdings.push(newHolding);

    const newContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString("base64");
    const putRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${PATH}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Add ${symbol} portfolio`,
        content: newContent,
        sha: sha || undefined,
      }),
    });

    if (putRes.ok) {
      return Response.json({ status: "added", name, holding: newHolding });
    }
    return Response.json({ error: "GitHub 저장 실패" }, { status: 500 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
