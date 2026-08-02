"use client";
import { useState, useEffect } from "react";

const PORTFOLIO_URL = "https://raw.githubusercontent.com/seohyun723/investbot-frontend/main/public/portfolio.json";

export default function PortfolioTab({ data }) {
  const [portfolio, setPortfolio] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState("dropdown");
  const [symbol, setSymbol] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const allSignals = [
    ...(data.us_signals || []).map(s => ({ symbol: s.ticker, price: s.price, name: s.name })),
    ...(data.crypto_signals || []).map(s => ({ symbol: s.symbol, price: s.price, name: s.symbol })),
    ...(data.kr_signals || []).map(s => ({ symbol: s.code || s.ticker, price: s.price, name: s.name })),
  ];

  const loadPortfolio = async () => {
    try {
      const res = await fetch(`${PORTFOLIO_URL}?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setPortfolio(json.holdings || []);
      }
    } catch (e) {
      setPortfolio([]);
    }
  };

  useEffect(() => { loadPortfolio(); }, []);

  const handleSymbolChange = (val) => {
    setSymbol(val);
    const found = allSignals.find(s => s.symbol === val);
    if (found && !buyPrice) setBuyPrice(found.price.toString());
  };

  const handleAdd = async () => {
    const targetSymbol = mode === "dropdown" ? symbol : customSymbol.trim().toUpperCase();

    if (!targetSymbol || !buyPrice || !quantity) {
      setMsg("모든 항목을 입력하세요");
      return;
    }

    setLoading(true);
    setMsg(mode === "custom" ? "티커 검증 중..." : "추가 중...");

    try {
      const res = await fetch("/api/portfolio/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: targetSymbol,
          buy_price: parseFloat(buyPrice),
          quantity: parseFloat(quantity),
          buy_date: new Date().toISOString(),
          verify: mode === "custom",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg(`✅ ${data.name || targetSymbol} 등록 완료!`);
        setSymbol(""); setCustomSymbol(""); setBuyPrice(""); setQuantity("");
        setTimeout(() => { setShowAdd(false); setMsg(""); loadPortfolio(); }, 3000);
      } else {
        setMsg(`❌ ${data.error || "등록 실패"}`);
        setLoading(false);
      }
    } catch (e) {
      setMsg("서버 오류");
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("삭제하시겠어요?")) return;
    try {
      await fetch("/api/portfolio/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setTimeout(loadPortfolio, 2000);
    } catch (e) {}
  };

  const getCurrentPrice = (sym) => {
    const found = allSignals.find(s => s.symbol === sym);
    return found ? found.price : null;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-semibold">실전 포트폴리오</div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg">
          {showAdd ? "취소" : "+ 매수 등록"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode("dropdown")}
              className={`flex-1 px-3 py-1.5 text-xs rounded-lg border ${mode === "dropdown" ? "bg-accent text-white border-accent" : "bg-base border-border text-muted"}`}
            >
              워치리스트에서 선택
            </button>
            <button
              onClick={() => setMode("custom")}
              className={`flex-1 px-3 py-1.5 text-xs rounded-lg border ${mode === "custom" ? "bg-accent text-white border-accent" : "bg-base border-border text-muted"}`}
            >
              직접 입력
            </button>
          </div>

          {mode === "dropdown" ? (
            <div className="mb-3">
              <label className="text-xs text-muted block mb-1">종목</label>
              <select
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">종목 선택...</option>
                {allSignals.map((s, i) => (
                  <option key={i} value={s.symbol}>{s.symbol} ({s.name})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-3">
              <label className="text-xs text-muted block mb-1">티커 (자동 검증)</label>
              <input
                type="text"
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
                placeholder="예: HOOD, BTC/USD, 005930"
                className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm uppercase"
              />
              <div className="text-xs text-muted mt-1">
                해외주식: 티커 (HOOD) / 코인: 심볼/USD / 국내: 6자리 코드
              </div>
            </div>
          )}

          <div className="mb-3">
            <label className="text-xs text-muted block mb-1">매수가</label>
            <input
              type="number" step="0.01"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-3">
            <label className="text-xs text-muted block mb-1">수량</label>
            <input
              type="number" step="0.0001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {buyPrice && quantity && (
            <div className="text-xs text-muted mb-3">
              총 매수 금액: ${(parseFloat(buyPrice) * parseFloat(quantity)).toFixed(2)}
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={loading}
            className="w-full py-2 bg-accent text-white rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? "처리 중..." : "등록하기"}
          </button>

          {msg && <div className="mt-2 text-xs text-center">{msg}</div>}
        </div>
      )}

      {portfolio.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm bg-card border border-dashed border-border rounded-xl">
          등록된 보유 종목 없음
        </div>
      ) : (
        <div className="space-y-2">
          {portfolio.map((h) => {
            const current = getCurrentPrice(h.symbol);
            const pnl = current ? ((current - h.buy_price) / h.buy_price) * 100 : 0;

            return (
              <div key={h.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">{h.symbol}</div>
                    {h.name && <div className="text-xs text-muted">{h.name}</div>}
                    <div className="text-xs text-muted mt-1">
                      {new Date(h.buy_date).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(h.id)} className="text-xs text-muted hover:text-danger">삭제</button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><div className="text-muted">매수가</div><div>${h.buy_price.toFixed(2)}</div></div>
                  <div><div className="text-muted">현재가</div><div>{current ? `$${current.toFixed(2)}` : "-"}</div></div>
                  <div><div className="text-muted">수량</div><div>{h.quantity}</div></div>
                  <div><div className="text-muted">평가금액</div><div>{current ? `$${(current * h.quantity).toFixed(2)}` : "-"}</div></div>
                </div>

                {current && (
                  <div className={`mt-2 pt-2 border-t border-border text-sm font-semibold ${pnl >= 0 ? "text-danger" : "text-blue-400"}`}>
                    {pnl >= 0 ? "▲" : "▼"} {Math.abs(pnl).toFixed(2)}% (${Math.abs((current - h.buy_price) * h.quantity).toFixed(2)})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
