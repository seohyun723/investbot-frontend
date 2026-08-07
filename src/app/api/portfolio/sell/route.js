export async function POST(request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return Response.json({ error: "GITHUB_TOKEN 미설정" }, { status: 500 });

  const body = await request.json();
  const { id, sell_price, sell_quantity } = body;
  if (!id || !sell_price || !sell_quantity) {
    return Response.json({ error: "id, 매도가, 매도수량 필요" }, { status: 400 });
  }

  const REPO = "seohyun723/investbot-frontend";
  const PATH = "public/portfolio.json";
  const API_BASE = "https://api.github.com";

  try {
    let sha = null;
    let currentData = { holdings: [] };
    const getRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${PATH}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      currentData = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf-8"));
    }
    currentData.holdings = currentData.holdings || [];

    const target = currentData.holdings.find((h) => h.id === id);
    if (!target) return Response.json({ error: "종목을 찾을 수 없음" }, { status: 404 });

    const sellQty = parseFloat(sell_quantity);
    const sellPrice = parseFloat(sell_price);
    const holdQty = parseFloat(target.quantity);

    if (sellQty > holdQty) {
      return Response.json({ error: "매도 수량이 보유 수량보다 많습니다" }, { status: 400 });
    }

    // 실현 손익 계산
    const realizedPnl = (sellPrice - parseFloat(target.buy_price)) * sellQty;
    const realizedPct = ((sellPrice - parseFloat(target.buy_price)) / parseFloat(target.buy_price)) * 100;

    // 매도 기록 추가
    currentData.sold = currentData.sold || [];
    currentData.sold.push({
      id: Date.now().toString(),
      symbol: target.symbol,
      name: target.name || target.symbol,
      buy_price: parseFloat(target.buy_price),
      sell_price: sellPrice,
      quantity: sellQty,
      realized_pnl: realizedPnl,
      realized_pct: realizedPct,
      sell_date: new Date().toISOString(),
    });

    const remainQty = holdQty - sellQty;
    if (remainQty <= 0.0000001) {
      // 전량 매도 → holdings에서 제거
      currentData.holdings = currentData.holdings.filter((h) => h.id !== id);
    } else {
      // 부분 매도 → 수량만 감소 (평단·손절가 유지)
      target.quantity = remainQty;
      target.updated_at = new Date().toISOString();
    }

    const newContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString("base64");
    const putRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${PATH}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Sell ${target.symbol} x${sellQty}`, content: newContent, sha }),
    });
    if (putRes.ok) {
      return Response.json({
        status: remainQty <= 0.0000001 ? "sold_all" : "sold_partial",
        realized_pnl: realizedPnl,
        realized_pct: realizedPct,
        remaining: remainQty,
      });
    }
    return Response.json({ error: "GitHub 저장 실패" }, { status: 500 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
