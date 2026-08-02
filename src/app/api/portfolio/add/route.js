async function verifyTicker(symbol) {
  // yfinance API로 티커 검증
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.quotes && data.quotes.length > 0) {
      const quote = data.quotes[0];
      // 정확한 심볼 매칭
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
  const { symbol, buy_price, quantity, buy_date, verify } = body;

  if (!symbol || !buy_price || !quantity) {
    return Response.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  let name = symbol;

  // 검증 요청이면 yfinance로 확인
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

    const newHolding = {
      id: Date.now().toString(),
      symbol,
      name,
      buy_price: parseFloat(buy_price),
      quantity: parseFloat(quantity),
      buy_date: buy_date || new Date().toISOString(),
      target_price: parseFloat(buy_price) * 1.15,
      stoploss_price: parseFloat(buy_price) * 0.93,
      status: "active",
      user_added: true,
    };
    currentData.holdings = currentData.holdings || [];
    currentData.holdings.push(newHolding);

    const newContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString("base64");
    const putRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${PATH}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
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
