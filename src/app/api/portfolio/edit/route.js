export async function POST(request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return Response.json({ error: "GITHUB_TOKEN 미설정" }, { status: 500 });

  const body = await request.json();
  const { id, buy_price, quantity } = body;
  if (!id) return Response.json({ error: "id 필요" }, { status: 400 });

  const REPO = "seohyun723/investbot-frontend";
  const PATH = "public/portfolio.json";
  const API_BASE = "https://api.github.com";

  const calcTargets = (avgPrice, isStrong) => {
    const tRate = isStrong ? 1.18 : 1.12;
    const sRate = isStrong ? 0.90 : 0.93;
    return { target_price: avgPrice * tRate, stoploss_price: avgPrice * sRate };
  };

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

    if (buy_price != null && !isNaN(parseFloat(buy_price))) {
      target.buy_price = parseFloat(buy_price);
    }
    if (quantity != null && !isNaN(parseFloat(quantity))) {
      target.quantity = parseFloat(quantity);
    }
    // 매수가 변경 시 손절가/목표가 재박제
    const { target_price, stoploss_price } = calcTargets(target.buy_price, target.is_strong || false);
    target.target_price = target_price;
    target.stoploss_price = stoploss_price;
    target.updated_at = new Date().toISOString();

    const newContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString("base64");
    const putRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${PATH}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Edit ${target.symbol}`, content: newContent, sha }),
    });
    if (putRes.ok) return Response.json({ status: "edited", holding: target });
    return Response.json({ error: "GitHub 저장 실패" }, { status: 500 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
