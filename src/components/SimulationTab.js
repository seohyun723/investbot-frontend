"use client";
import { useState, useEffect } from "react";

const SIM_URL = "https://raw.githubusercontent.com/seohyun723/investbot-analysis/main/data/simulation.json";

export default function SimulationTab({ data }) {
  const [sim, setSim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("summary");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${SIM_URL}?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          setSim(json);
        }
      } catch (e) {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-6 text-center text-muted">로딩 중...</div>;
  if (!sim) return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="text-muted text-sm mb-2">시뮬레이션 데이터 없음</div>
      <div className="text-xs text-muted">첫 자동 실행 후 표시됩니다</div>
    </div>
  );

  const initialCapital = sim.initial_capital || 2000000;
  const cash = sim.cash || 0;
  const holdings = sim.holdings || [];
  const history = sim.history || [];

  // 현재 자산 계산
  const currentPrices = {};
  (data.us_signals || []).forEach(s => { currentPrices[s.ticker] = s.price; });
  (data.crypto_signals || []).forEach(s => { currentPrices[s.symbol] = s.price; });
  (data.kr_signals || []).forEach(s => { currentPrices[s.code || s.ticker] = s.price; });

  let totalAsset = cash;
  let unrealizedPnl = 0;
  const activeHoldings = holdings.filter(h => h.status === "active");

  activeHoldings.forEach(h => {
    const current = currentPrices[h.symbol];
    if (current) {
      totalAsset += current * h.quantity;
      unrealizedPnl += (current - h.buy_price) * h.quantity;
    }
  });

  const totalReturn = ((totalAsset - initialCapital) / initialCapital) * 100;

  // 거래 이력 통계
  const sells = history.filter(h => h.type === "sell");
  const buys = history.filter(h => h.type === "buy");
  const wins = sells.filter(s => (s.pnl || 0) > 0);
  const losses = sells.filter(s => (s.pnl || 0) < 0);
  const winRate = sells.length > 0 ? (wins.length / sells.length) * 100 : 0;
  const realizedPnl = sells.reduce((sum, s) => sum + (s.pnl || 0), 0);

  return (
    <div>
      {/* 요약 카드 */}
      <div className="bg-card border border-border rounded-xl p-4 mb-3">
        <div className="text-xs text-muted mb-1">총 자산 (초기 자본 {initialCapital.toLocaleString()}원)</div>
        <div className="text-2xl font-bold">
          {Math.round(totalAsset).toLocaleString()}원
        </div>
        <div className={`text-sm font-semibold mt-1 ${totalReturn >= 0 ? "text-danger" : "text-blue-400"}`}>
          {totalReturn >= 0 ? "▲" : "▼"} {Math.abs(totalReturn).toFixed(2)}%
        </div>
      </div>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-xs text-muted">현금</div>
          <div className="text-sm font-semibold">{Math.round(cash).toLocaleString()}원</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-xs text-muted">보유 종목</div>
          <div className="text-sm font-semibold">{activeHoldings.length}개</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-xs text-muted">실현 손익</div>
          <div className={`text-sm font-semibold ${realizedPnl >= 0 ? "text-danger" : "text-blue-400"}`}>
            {realizedPnl >= 0 ? "+" : ""}{Math.round(realizedPnl).toLocaleString()}원
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-xs text-muted">평가 손익</div>
          <div className={`text-sm font-semibold ${unrealizedPnl >= 0 ? "text-danger" : "text-blue-400"}`}>
            {unrealizedPnl >= 0 ? "+" : ""}{Math.round(unrealizedPnl).toLocaleString()}원
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-xs text-muted">승률</div>
          <div className="text-sm font-semibold">{winRate.toFixed(1)}%</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-xs text-muted">거래 횟수</div>
          <div className="text-sm font-semibold">{sells.length}회 (W:{wins.length}/L:{losses.length})</div>
        </div>
      </div>

      {/* 뷰 전환 */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setView("summary")} className={`px-3 py-1.5 text-xs rounded-full border ${view === "summary" ? "bg-white text-black border-white" : "bg-card border-border text-muted"}`}>
          보유 종목
        </button>
        <button onClick={() => setView("history")} className={`px-3 py-1.5 text-xs rounded-full border ${view === "history" ? "bg-white text-black border-white" : "bg-card border-border text-muted"}`}>
          거래 이력
        </button>
      </div>

      {view === "summary" && (
        activeHoldings.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm bg-card border border-dashed border-border rounded-xl">
            보유 종목 없음
          </div>
        ) : (
          <div className="space-y-2">
            {activeHoldings.map((h, i) => {
              const current = currentPrices[h.symbol];
              const pnl = current ? ((current - h.buy_price) / h.buy_price) * 100 : 0;
              return (
                <div key={i} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-semibold text-sm">{h.symbol}</div>
                    {current && (
                      <div className={`text-sm font-semibold ${pnl >= 0 ? "text-danger" : "text-blue-400"}`}>
                        {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    매수 ${h.buy_price?.toFixed(2)} → 현재 {current ? `$${current.toFixed(2)}` : "-"} · {h.quantity?.toFixed(4)}개
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {new Date(h.buy_date).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} · {h.signal || ""}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {view === "history" && (
        history.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm bg-card border border-dashed border-border rounded-xl">
            거래 이력 없음
          </div>
        ) : (
          <div className="space-y-1">
            {[...history].reverse().slice(0, 50).map((h, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-3 text-xs">
                <div className="flex justify-between mb-1">
                  <div className="flex gap-2">
                    <span className={`font-semibold ${h.type === "buy" ? "text-accent" : "text-muted"}`}>
                      {h.type === "buy" ? "매수" : "매도"}
                    </span>
                    <span>{h.symbol}</span>
                  </div>
                  <div className="text-muted">
                    {new Date(h.date).toLocaleString("ko-KR", { 
                      month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
                      timeZone: "Asia/Seoul" 
                    })}
                  </div>
                </div>
                <div className="flex justify-between text-muted">
                  <div>${h.price?.toFixed(2)} × {h.quantity?.toFixed(4)}</div>
                  {h.pnl !== undefined && (
                    <div className={h.pnl >= 0 ? "text-danger" : "text-blue-400"}>
                      {h.pnl >= 0 ? "+" : ""}{Math.round(h.pnl).toLocaleString()}원
                    </div>
                  )}
                </div>
                {h.reason && <div className="text-muted mt-1">{h.reason}</div>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
