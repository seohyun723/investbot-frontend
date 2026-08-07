"use client";
import { useState, useEffect, useRef } from "react";

const PORTFOLIO_URL = "https://raw.githubusercontent.com/seohyun723/investbot-frontend/main/public/portfolio.json";
const REFRESH_INTERVAL = 5 * 60 * 1000;

function isKRW(symbol) {
  return (symbol || "").startsWith("KRW-") || /^\d{6}$/.test(symbol || "");
}
function assetType(symbol) {
  const s = (symbol || "").toUpperCase();
  if (s.startsWith("KRW-")) return "코인";
  if (/^\d{6}$/.test(s)) return "국내";
  if (s.includes("/USD") || s.includes("USDT")) return "코인";
  return "해외";
}
function currencyLabel(symbol) {
  return isKRW(symbol) ? "원(₩)" : "달러($)";
}
function signalColor(sig) {
  const s = String(sig || "");
  if (s.includes("강력매수")) return "text-danger border-danger/40 bg-danger/10";
  if (s.includes("매수")) return "text-red-300 border-red-300/30 bg-red-300/5";
  if (s.includes("강력매도")) return "text-blue-400 border-blue-400/40 bg-blue-400/10";
  if (s.includes("매도")) return "text-blue-300 border-blue-300/30 bg-blue-300/5";
  return "text-muted border-border bg-card";
}

export default function PortfolioTab({ data }) {
  const [portfolio, setPortfolio] = useState([]);
  const [realtimePrices, setRealtimePrices] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState("dropdown");
  const [symbol, setSymbol] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [editQty, setEditQty] = useState("");
  const timerRef = useRef(null);

  const rate = data.usd_krw || 1436;
  const activeSymbol = mode === "dropdown" ? symbol : customSymbol.trim().toUpperCase();
  const activeCurrency = currencyLabel(activeSymbol);
  const activeType = activeSymbol ? assetType(activeSymbol) : "";

  const fmtPrice = (sym, val) => {
    if (val == null) return "-";
    if (isKRW(sym)) return `₩${Math.round(val).toLocaleString()}`;
    return `$${val.toFixed(2)}`;
  };

  const allSignals = [
    ...(data.us_signals || []),
    ...(data.crypto_signals || []),
    ...(data.kr_signals || []),
    ...(data.alt_signals || []),
  ].map(s => ({
    symbol: s.ticker || s.symbol || s.code,
    price: s.price,
    name: s.name || s.symbol,
    signal: s.signal,
    total_score: s.total_score,
    target_price: s.target_price,
    stoploss_price: s.stoploss_price,
    reasons: s.reasons,
    strategy_tag: s.strategy_tag,
  }));

  const getSignalInfo = (sym) => allSignals.find(s => s.symbol === sym);

  // 이름: 네이버 실시간 > 시그널 > 저장된 이름 (단, 코드와 같으면 무시)
  const getName = (h) => {
    const rt = realtimePrices[h.symbol]?.name;
    if (rt && rt !== h.symbol) return rt;
    const sig = getSignalInfo(h.symbol);
    if (sig?.name && sig.name !== h.symbol) return sig.name;
    if (h.name && h.name !== h.symbol) return h.name;
    return null;
  };

  const loadPortfolio = async () => {
    try {
      const res = await fetch(`${PORTFOLIO_URL}?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setPortfolio(json.holdings || []);
      }
    } catch (e) { setPortfolio([]); }
  };

  const fetchRealtimePrices = async (symbols) => {
    if (symbols.length === 0) return;
    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      if (res.ok) {
        const json = await res.json();
        setRealtimePrices(json.prices || {});
        setLastUpdate(new Date());
      }
    } catch (e) {}
  };

  useEffect(() => { loadPortfolio(); }, []);

  useEffect(() => {
    if (portfolio.length === 0) return;
    const symbols = [...new Set(portfolio.map(h => h.symbol))];
    fetchRealtimePrices(symbols);
    timerRef.current = setInterval(() => fetchRealtimePrices(symbols), REFRESH_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [portfolio.length]);

  const handleSymbolChange = (val) => {
    setSymbol(val.toUpperCase());
    const found = allSignals.find(s => s.symbol === val.toUpperCase());
    if (found && !buyPrice) setBuyPrice(found.price.toString());
  };

  const handleAdd = async () => {
    const targetSymbol = activeSymbol;
    if (!targetSymbol || !buyPrice || !quantity) { setMsg("모든 항목을 입력하세요"); return; }
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
          currency: isKRW(targetSymbol) ? "KRW" : "USD",
          verify: mode === "custom",
          name: getSignalInfo(targetSymbol)?.name || "",
        }),
      });
      const dataResp = await res.json();
      if (res.ok) {
        setMsg(`✅ ${dataResp.name || targetSymbol} 등록 완료!`);
        setSymbol(""); setCustomSymbol(""); setBuyPrice(""); setQuantity("");
        setTimeout(() => { setShowAdd(false); setMsg(""); loadPortfolio(); }, 2000);
      } else {
        setMsg(`❌ ${dataResp.error || "등록 실패"}`);
        setLoading(false);
      }
    } catch (e) { setMsg("서버 오류"); setLoading(false); }
  };
const openEdit = (h) => {
    setEditId(h.id);
    setEditPrice(String(h.buy_price));
    setEditQty(String(h.quantity));
  };

  const handleEditSave = async (id) => {
    try {
      const res = await fetch("/api/portfolio/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, buy_price: parseFloat(editPrice), quantity: parseFloat(editQty) }),
      });
      if (res.ok) {
        setEditId(null);
        setTimeout(loadPortfolio, 2000);
      }
    } catch (e) {}
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
    if (realtimePrices[sym]?.price) return realtimePrices[sym].price;
    const found = allSignals.find(s => s.symbol === sym);
    return found ? found.price : null;
  };

  const handleManualRefresh = () => {
    if (portfolio.length === 0) return;
    const symbols = [...new Set(portfolio.map(h => h.symbol))];
    fetchRealtimePrices(symbols);
  };

  const totalAmt = buyPrice && quantity ? parseFloat(buyPrice) * parseFloat(quantity) : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="text-sm font-semibold">실전 포트폴리오</div>
          {lastUpdate && (
            <div className="text-[10px] text-muted mt-0.5">
              갱신 {lastUpdate.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "numeric", timeZone: "Asia/Seoul" })}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {portfolio.length > 0 && (
            <button onClick={handleManualRefresh} className="w-8 h-8 bg-card border border-border rounded-lg flex items-center justify-center text-xs">🔄</button>
          )}
          <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg">
            {showAdd ? "취소" : "+ 매수"}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex gap-2 mb-3">
            <button onClick={() => setMode("dropdown")} className={`flex-1 px-3 py-1.5 text-xs rounded-lg border ${mode === "dropdown" ? "bg-accent text-white border-accent" : "bg-card border-border text-muted"}`}>워치리스트</button>
            <button onClick={() => setMode("custom")} className={`flex-1 px-3 py-1.5 text-xs rounded-lg border ${mode === "custom" ? "bg-accent text-white border-accent" : "bg-card border-border text-muted"}`}>직접 입력</button>
          </div>
          {mode === "dropdown" ? (
            <div className="mb-3">
              <input type="text" list="watchlist-symbols" value={symbol} onChange={(e) => handleSymbolChange(e.target.value)} placeholder="종목 검색..." className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white uppercase" style={{ colorScheme: 'dark' }} />
              <datalist id="watchlist-symbols">
                {allSignals.map((s, i) => (<option key={i} value={s.symbol}>{s.name}</option>))}
              </datalist>
            </div>
          ) : (
            <div className="mb-3">
              <input type="text" value={customSymbol} onChange={(e) => setCustomSymbol(e.target.value)} placeholder="예: HOOD, BTC/USD, 005930" className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white uppercase" />
            </div>
          )}
          {activeSymbol && (
            <div className="mb-3 text-[11px] text-accent">{activeType} · {activeCurrency}로 입력</div>
          )}
          <div className="flex gap-2 mb-3">
            <input type="number" step="0.01" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder={`매수가 (${activeCurrency})`} className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-white" />
            <input type="number" step="0.0001" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="수량" className="w-24 bg-card border border-border rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          {totalAmt > 0 && (
            <div className="text-[11px] text-muted mb-3">총 {isKRW(activeSymbol) ? `₩${Math.round(totalAmt).toLocaleString()}` : `$${totalAmt.toFixed(2)}`}</div>
          )}
          <button onClick={handleAdd} disabled={loading} className="w-full py-2 bg-accent text-white rounded-lg text-sm disabled:opacity-50">{loading ? "처리 중..." : "등록"}</button>
          {msg && <div className="mt-2 text-xs text-center">{msg}</div>}
        </div>
      )}

      {portfolio.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm bg-card border border-dashed border-border rounded-xl">등록된 보유 종목 없음</div>
      ) : (
        <div className="space-y-2">
          {portfolio.map((h) => {
            const current = getCurrentPrice(h.symbol);
            const pnl = current ? ((current - h.buy_price) / h.buy_price) * 100 : 0;
            const isRealtime = realtimePrices[h.symbol]?.price;
            const krw = isKRW(h.symbol);
            const pnlAmount = current ? Math.abs((current - h.buy_price) * h.quantity) : 0;
            const sig = getSignalInfo(h.symbol);
            const displayName = getName(h);

            return (
              <div key={h.id} className="bg-card border border-border rounded-xl p-3">
                {/* 헤더: 이름 + 신호 + 삭제 */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-sm truncate">{displayName || h.symbol}</span>
                    {isRealtime && <span className="text-[9px] text-danger flex-shrink-0">● 실시간</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sig?.signal && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${signalColor(sig.signal)}`}>{sig.signal}</span>
                    )}
                    <button onClick={() => openEdit(h)} className="text-[10px] text-accent hover:underline">수정</button>
                    <button onClick={() => handleDelete(h.id)} className="text-[10px] text-muted hover:text-danger">삭제</button>
                  </div>
                </div>

                {/* 현재가 강조 (크게) + 손익 */}
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <div className="text-[10px] text-muted">{assetType(h.symbol)} · {h.symbol}</div>
                    <div className="text-lg font-bold leading-tight">{fmtPrice(h.symbol, current)}</div>
                  </div>
                  {current && (
                    <div className={`text-right ${pnl >= 0 ? "text-danger" : "text-blue-400"}`}>
                      <div className="text-base font-bold">{pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%</div>
                      <div className="text-[11px]">{pnl >= 0 ? "▲" : "▼"} {krw ? `₩${Math.round(pnlAmount).toLocaleString()}` : `$${pnlAmount.toFixed(2)}`}</div>
                    </div>
                  )}
                </div>

                {/* 상세 정보 (간격 좁게, 항상 표시) */}
                <div className="grid grid-cols-4 gap-1.5 text-[11px] border-t border-border pt-2">
                  <div><div className="text-muted">매수가</div><div>{fmtPrice(h.symbol, h.buy_price)}</div></div>
                  <div><div className="text-muted">수량</div><div>{h.quantity}</div></div>
                  <div><div className="text-muted">평가금액</div><div>{current ? fmtPrice(h.symbol, current * h.quantity) : "-"}</div></div>
                  <div><div className="text-muted">매수일</div><div>{new Date(h.buy_date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" })}</div></div>
                </div>

                {/* 목표가/손절가 (등록 시 박제된 값 사용 - 텔레그램과 동일) */}
                {(h.target_price || h.stoploss_price) && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-border pt-2 mt-2">
                    {h.target_price && (
                      <div>
                        <span className="text-muted">🎯 목표 </span>
                        <span className="text-danger font-semibold">{fmtPrice(h.symbol, h.target_price)}</span>
                        {current && <span className="text-[9px] text-muted"> ({(((h.target_price - current) / current) * 100).toFixed(1)}%)</span>}
                      </div>
                    )}
                    {h.stoploss_price && (
                      <div>
                        <span className="text-muted">🛑 손절 </span>
                        <span className="text-blue-400 font-semibold">{fmtPrice(h.symbol, h.stoploss_price)}</span>
                        {current && <span className="text-[9px] text-muted"> ({(((h.stoploss_price - current) / current) * 100).toFixed(1)}%)</span>}
                      </div>
                    )}
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
