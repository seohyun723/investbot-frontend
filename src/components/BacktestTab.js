"use client";
import { useState, useEffect } from "react";

const SIM_URL = "https://raw.githubusercontent.com/seohyun723/investbot-frontend/main/public/simulation.json";
const PORTFOLIO_URL = "https://raw.githubusercontent.com/seohyun723/investbot-frontend/main/public/portfolio.json";

function calcStats(history, holdings) {
  const sells = history.filter(h => h.type === "sell");
  const totalTrades = sells.length;
  const wins = sells.filter(s => (s.pnl || 0) > 0).length;
  const losses = sells.filter(s => (s.pnl || 0) < 0).length;
  const totalPnl = sells.reduce((sum, s) => sum + (s.pnl || 0), 0);
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const activeCount = (holdings || []).filter(h => h.status === "active").length;

  const bySymbol = {};
  sells.forEach(s => {
    const sym = s.symbol;
    if (!bySymbol[sym]) bySymbol[sym] = { symbol: sym, trades: 0, wins: 0, pnl: 0 };
    bySymbol[sym].trades++;
    if ((s.pnl || 0) > 0) bySymbol[sym].wins++;
    bySymbol[sym].pnl += (s.pnl || 0);
  });

  const byMarket = { crypto: { trades: 0, wins: 0, pnl: 0 }, us: { trades: 0, wins: 0, pnl: 0 }, kr: { trades: 0, wins: 0, pnl: 0 } };
  sells.forEach(s => {
    const sym = s.symbol;
    const market = sym.includes("/USD") ? "crypto" : /^\d{6}$/.test(sym) ? "kr" : "us";
    byMarket[market].trades++;
    if ((s.pnl || 0) > 0) byMarket[market].wins++;
    byMarket[market].pnl += (s.pnl || 0);
  });

  const sortedSells = [...sells].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
  const best5 = sortedSells.slice(0, 5);
  const worst5 = sortedSells.slice(-5).reverse();

  // 신호별 집계 (자기개선: 어떤 신호가 잘 맞나)
  const bySignal = {};
  sells.forEach(s => {
    const sig = s.signal || s.buy_signal || "미분류";
    if (!bySignal[sig]) bySignal[sig] = { signal: sig, trades: 0, wins: 0, pnl: 0 };
    bySignal[sig].trades++;
    if ((s.pnl || 0) > 0) bySignal[sig].wins++;
    bySignal[sig].pnl += (s.pnl || 0);
  });

  return {
    totalTrades, wins, losses, totalPnl, winRate, activeCount,
    bySymbol: Object.values(bySymbol).sort((a, b) => b.pnl - a.pnl),
    bySignal: Object.values(bySignal).sort((a, b) => b.pnl - a.pnl),
    byMarket, best5, worst5,
  };
}

export default function BacktestTab({ data }) {
  const [sim, setSim] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("sim");
  const [view, setView] = useState("summary");

  useEffect(() => {
    const load = async () => {
      try {
        const [simRes, portRes] = await Promise.all([
          fetch(`${SIM_URL}?t=${Date.now()}`),
          fetch(`${PORTFOLIO_URL}?t=${Date.now()}`),
        ]);
        if (simRes.ok) setSim(await simRes.json());
        if (portRes.ok) setPortfolio(await portRes.json());
      } catch (e) {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-6 text-center text-muted">로딩 중...</div>;

  const simStats = sim ? calcStats(sim.history || [], sim.holdings || []) : null;

  const portfolioHoldings = portfolio?.holdings || [];
  const currentPrices = {};
  (data.us_signals || []).forEach(s => { currentPrices[s.ticker] = s.price; });
  (data.crypto_signals || []).forEach(s => { currentPrices[s.symbol] = s.price; });
  (data.kr_signals || []).forEach(s => { currentPrices[s.code || s.ticker] = s.price; });

  const activePortfolio = portfolioHoldings.filter(h => h.status === "active");
  const realStats = {
    totalHoldings: activePortfolio.length,
    unrealizedPnl: activePortfolio.reduce((sum, h) => {
      const cur = currentPrices[h.symbol];
      return cur ? sum + (cur - h.buy_price) * h.quantity : sum;
    }, 0),
    totalInvested: activePortfolio.reduce((sum, h) => sum + h.buy_price * h.quantity, 0),
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button onClick={() => setMode("sim")} className={`px-3 py-2 text-xs rounded-lg border ${mode === "sim" ? "bg-accent text-white border-accent" : "bg-card border-border text-muted"}`}>
          🤖 시뮬 성과
        </button>
        <button onClick={() => setMode("real")} className={`px-3 py-2 text-xs rounded-lg border ${mode === "real" ? "bg-accent text-white border-accent" : "bg-card border-border text-muted"}`}>
          💰 실전 성과
        </button>
        <button onClick={() => setMode("compare")} className={`px-3 py-2 text-xs rounded-lg border ${mode === "compare" ? "bg-accent text-white border-accent" : "bg-card border-border text-muted"}`}>
          ⚖️ 비교
        </button>
      </div>

      {mode === "sim" && (
        simStats?.totalTrades === 0 ? (
          <div className="text-center py-8 text-muted text-sm bg-card border border-dashed border-border rounded-xl">
            시뮬 매도 이력 없음 (매수 후 목표가/손절가 도달 시 쌓임)
          </div>
        ) : simStats ? (
          <>
            <div className="bg-card border border-border rounded-xl p-4 mb-3">
              <div className="text-xs text-muted mb-1">🤖 시뮬레이션 - 알고리즘 자동 매매</div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <div className="text-xs text-muted">승률</div>
                  <div className="text-lg font-bold">{simStats.winRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted">거래</div>
                  <div className="text-lg font-bold">{simStats.totalTrades}회</div>
                </div>
                <div>
                  <div className="text-xs text-muted">실현 손익</div>
                  <div className={`text-lg font-bold ${simStats.totalPnl >= 0 ? "text-danger" : "text-blue-400"}`}>
                    {simStats.totalPnl >= 0 ? "+" : ""}{Math.round(simStats.totalPnl).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-3 overflow-x-auto">
              {[
                { id: "summary", label: "요약" },
                { id: "symbol", label: "종목별" },
                { id: "market", label: "시장별" },
                { id: "best", label: "TOP/WORST" },
              ].map(v => (
                <button key={v.id} onClick={() => setView(v.id)} className={`px-3 py-1.5 text-xs rounded-full border whitespace-nowrap ${view === v.id ? "bg-white text-black border-white" : "bg-card border-border text-muted"}`}>
                  {v.label}
                </button>
              ))}
            </div>

            {view === "summary" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card border border-border rounded-lg p-3"><div className="text-xs text-muted">승리</div><div className="text-sm font-bold text-danger">{simStats.wins}회</div></div>
                <div className="bg-card border border-border rounded-lg p-3"><div className="text-xs text-muted">패배</div><div className="text-sm font-bold text-blue-400">{simStats.losses}회</div></div>
                <div className="bg-card border border-border rounded-lg p-3"><div className="text-xs text-muted">보유 종목</div><div className="text-sm font-bold">{simStats.activeCount}개</div></div>
              </div>
            )}

            {view === "symbol" && (
              <div className="space-y-2">
                {simStats.bySymbol.map((s, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div className="font-semibold text-sm">{s.symbol}</div>
                      <div className={`text-sm font-semibold ${s.pnl >= 0 ? "text-danger" : "text-blue-400"}`}>{s.pnl >= 0 ? "+" : ""}{Math.round(s.pnl).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-muted mt-1">거래 {s.trades}회 · 승률 {((s.wins / s.trades) * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            )}

            {view === "market" && (
              <div className="space-y-2">
                {[{ key: "us", label: "🇺🇸 해외" }, { key: "crypto", label: "🪙 코인" }, { key: "kr", label: "🇰🇷 국내" }].map(({ key, label }) => {
                  const s = simStats.byMarket[key];
                  return (
                    <div key={key} className="bg-card border border-border rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div className="font-semibold text-sm">{label}</div>
                        <div className={`text-sm font-semibold ${s.pnl >= 0 ? "text-danger" : "text-blue-400"}`}>{s.pnl >= 0 ? "+" : ""}{Math.round(s.pnl).toLocaleString()}</div>
                      </div>
                      <div className="text-xs text-muted mt-1">거래 {s.trades}회 · 승률 {s.trades > 0 ? ((s.wins / s.trades) * 100).toFixed(0) : 0}%</div>
                    </div>
                  );
                })}
              </div>
            )}

            {view === "best" && (
              <div>
                <div className="text-xs text-muted mb-2">🏆 최고 거래 TOP 5</div>
                <div className="space-y-1 mb-4">
                  {simStats.best5.map((t, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-2 text-xs flex justify-between">
                      <div>{t.symbol}</div>
                      <div className="text-danger font-semibold">+{Math.round(t.pnl || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted mb-2">💀 최악 거래 TOP 5</div>
                <div className="space-y-1">
                  {simStats.worst5.map((t, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-2 text-xs flex justify-between">
                      <div>{t.symbol}</div>
                      <div className="text-blue-400 font-semibold">{Math.round(t.pnl || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null
      )}

      {mode === "real" && (
        realStats.totalHoldings === 0 ? (
          <div className="text-center py-8 text-muted text-sm bg-card border border-dashed border-border rounded-xl">
            실전 매수 등록 없음<br />
            <span className="text-xs">포트폴리오 탭에서 매수 등록하세요</span>
          </div>
        ) : (
          <div>
            <div className="bg-card border border-border rounded-xl p-4 mb-3">
              <div className="text-xs text-muted mb-1">💰 실전 매매 - 사용자 직접 등록</div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <div className="text-xs text-muted">보유 종목</div>
                  <div className="text-lg font-bold">{realStats.totalHoldings}개</div>
                </div>
                <div>
                  <div className="text-xs text-muted">투자금</div>
                  <div className="text-lg font-bold">${realStats.totalInvested.toFixed(0)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">평가 손익</div>
                  <div className={`text-lg font-bold ${realStats.unrealizedPnl >= 0 ? "text-danger" : "text-blue-400"}`}>
                    {realStats.unrealizedPnl >= 0 ? "+" : ""}${realStats.unrealizedPnl.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {activePortfolio.map((h, i) => {
                const cur = currentPrices[h.symbol];
                const pnl = cur ? ((cur - h.buy_price) / h.buy_price) * 100 : 0;
                return (
                  <div key={i} className="bg-card border border-border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-sm">{h.symbol}</div>
                      {cur && (
                        <div className={`text-sm font-semibold ${pnl >= 0 ? "text-danger" : "text-blue-400"}`}>
                          {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted">매수 ${h.buy_price?.toFixed(2)} → 현재 {cur ? `$${cur.toFixed(2)}` : "-"}</div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-muted text-center mt-4">
              실전 매도 이력은 나중에 여기 표시됩니다
            </div>
          </div>
        )
      )}

      {mode === "compare" && (
        <div className="space-y-3">
          <div className="text-xs text-muted mb-2">🤖 시뮬 vs 💰 실전 비교</div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-muted mb-1">🤖 시뮬 승률</div>
              <div className="text-lg font-bold">{simStats?.winRate.toFixed(1) || "-"}%</div>
              <div className="text-xs text-muted mt-1">거래 {simStats?.totalTrades || 0}회</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-muted mb-1">💰 실전 승률</div>
              <div className="text-lg font-bold">-</div>
              <div className="text-xs text-muted mt-1">매도 이력 대기</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-muted mb-1">🤖 시뮬 손익</div>
              <div className={`text-lg font-bold ${(simStats?.totalPnl || 0) >= 0 ? "text-danger" : "text-blue-400"}`}>
                {(simStats?.totalPnl || 0) >= 0 ? "+" : ""}{Math.round(simStats?.totalPnl || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-muted mb-1">💰 실전 평가손익</div>
              <div className={`text-lg font-bold ${realStats.unrealizedPnl >= 0 ? "text-danger" : "text-blue-400"}`}>
                {realStats.unrealizedPnl >= 0 ? "+" : ""}${realStats.unrealizedPnl.toFixed(0)}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted">
            <div className="mb-2">💡 시뮬 vs 실전 비교 팁</div>
            <div>• 시뮬 승률 {'>'} 실전 승률: 알고리즘 튜닝 여지</div>
            <div>• 시뮬 승률 ≈ 실전 승률: 알고리즘 신뢰도 높음</div>
            <div>• 실전 데이터가 쌓여야 정확한 비교 가능</div>
          </div>
        </div>
      )}
    </div>
  );
}
