"use client";
import { useState, useEffect } from "react";

const SIM_URL = "https://raw.githubusercontent.com/seohyun723/investbot-frontend/main/public/simulation.json";
const FALLBACK_RATE = 1436;

// 종목코드 → 기업명 매핑
const KR_NAMES = {
  "005930": "삼성전자", "000660": "SK하이닉스",
  "373220": "LG에너지솔루션", "006400": "삼성SDI", "051910": "LG화학",
  "035420": "NAVER", "035720": "카카오",
  "005380": "현대차", "000270": "기아",
  "207940": "삼성바이오로직스", "068270": "셀트리온",
  "105560": "KB금융", "055550": "신한지주",
  "247540": "에코프로비엠", "086520": "에코프로",
};

function isKRW(symbol) {
  return symbol.startsWith("KRW-") || /^\d{6}$/.test(symbol);
}

// 종목명 조회 (국내주식 매핑 + latest.json name 필드)
function getName(symbol, data) {
  if (KR_NAMES[symbol]) return KR_NAMES[symbol];
  const all = [...(data.us_signals || []), ...(data.crypto_signals || []), ...(data.kr_signals || [])];
  const found = all.find(s => (s.ticker === symbol || s.symbol === symbol || s.code === symbol));
  if (found && found.name && found.name !== symbol) return found.name;
  if (symbol.startsWith("KRW-")) return symbol.replace("KRW-", "");
  return null;
}

export default function SimulationTab({ data }) {
  const [sim, setSim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("summary");
  const rate = data.usd_krw || FALLBACK_RATE;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${SIM_URL}?t=${Date.now()}`);
        if (res.ok) setSim(await res.json());
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

  // 현재가 (원화 환산, 실시간 환율)
  const currentPrices = {};
  (data.us_signals || []).forEach(s => { currentPrices[s.ticker] = s.price * rate; });
  (data.crypto_signals || []).forEach(s => { currentPrices[s.symbol] = s.price; });
  (data.kr_signals || []).forEach(s => { currentPrices[s.code || s.ticker] = s.price; });

  let totalAsset = cash;
  let unrealizedPnl = 0;
  let investedAmount = 0;  // 투자원금 (활성 보유 매수액 합)
  const activeHoldings = holdings.filter(h => h.status === "active");

  activeHoldings.forEach(h => {
    investedAmount += h.buy_amount || (h.buy_price * h.quantity);
    const current = currentPrices[h.symbol];
    if (current) {
      totalAsset += current * h.quantity;
      unrealizedPnl += (current - h.buy_price) * h.quantity;
    } else {
      totalAsset += h.buy_price * h.quantity;
    }
  });

  const totalReturn = ((totalAsset - initialCapital) / initialCapital) * 100;
  const investRatio = initialCapital > 0 ? (investedAmount / initialCapital) * 100 : 0;
  const cashRatio = 100 - investRatio;
  // 투자원금 대비 수익률
  const investedCurrent = investedAmount + unrealizedPnl;
  const investReturn = investedAmount > 0 ? ((investedCurrent - investedAmount) / investedAmount) * 100 : 0;

  const sells = history.filter(h => h.type === "sell");
  const wins = sells.filter(s => (s.pnl || 0) > 0);
  const losses = sells.filter(s => (s.pnl || 0) < 0);
  const winRate = sells.length > 0 ? (wins.length / sells.length) * 100 : 0;
  const realizedPnl = sells.reduce((sum, s) => sum + (s.pnl || 0), 0);

  const fmtWon = (v) => `${Math.round(v).toLocaleString()}원`;

  return (
    <div>
      {/* 상단 3칸: 총자산 / 투자원금 / 현금 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted">총 자산</div>
          <div className="text-lg font-bold mt-0.5">{fmtWon(totalAsset)}</div>
          <div className={`text-xs mt-0.5 ${totalReturn >= 0 ? "text-danger" : "text-blue-400"}`}>
            {totalReturn >= 0 ? "▲" : "▼"} {Math.abs(totalReturn).toFixed(2)}%
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted">투자원금</div>
          <div className="text-lg font-bold mt-0.5">{fmtWon(investedAmount)}</div>
          <div className="text-xs text-accent mt-0.5">비중 {investRatio.toFixed(0)}%</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted">현금</div>
          <div className="text-lg font-bold mt-0.5">{fmtWon(cash)}</div>
          <div className="text-xs text-muted mt-0.5">비중 {cashRatio.toFixed(0)}%</div>
        </div>
      </div>

      {/* 투자 비중 막대 */}
      <div className="flex h-2.5 rounded-full overflow-hidden mb-1">
        <div style={{ width: `${investRatio}%`, background: "#378ADD" }}></div>
        <div style={{ width: `${cashRatio}%`, background: "#B4B2A9" }}></div>
      </div>
      <div className="flex justify-between text-xs text-muted mb-3">
        <span>■ 투자 {investRatio.toFixed(0)}%</span>
        <span>현금 {cashRatio.toFixed(0)}% ■</span>
      </div>

      {/* 수익률 2칸: 투자원금 대비 vs 총자산 대비 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-card border-2 border-accent rounded-xl p-3">
          <div className="text-xs text-muted">투자원금 대비 수익률</div>
          <div className={`text-xl font-bold mt-0.5 ${investReturn >= 0 ? "text-danger" : "text-blue-400"}`}>
            {investReturn >= 0 ? "+" : ""}{investReturn.toFixed(2)}%
          </div>
          <div className="text-[11px] text-muted mt-0.5">{fmtWon(investedAmount)} → {fmtWon(investedCurrent)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted">총자산 대비 수익률</div>
          <div className="text-xl font-bold mt-0.5 text-muted">
            {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}%
          </div>
          <div className="text-[11px] text-muted mt-0.5">현금 포함 (희석됨)</div>
        </div>
      </div>

      {/* 요약 지표 */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-card border border-border rounded-lg p-2 text-center">
          <div className="text-xs text-muted">보유</div>
          <div className="text-sm font-semibold">{activeHoldings.length}개</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-2 text-center">
          <div className="text-xs text-muted">승률</div>
          <div className="text-sm font-semibold">{winRate.toFixed(0)}%</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-2 text-center">
          <div className="text-xs text-muted">거래</div>
          <div className="text-sm font-semibold">{sells.length}회</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-2 text-center">
          <div className="text-xs text-muted">실현손익</div>
          <div className={`text-sm font-semibold ${realizedPnl >= 0 ? "text-danger" : "text-blue-400"}`}>
            {realizedPnl >= 0 ? "+" : ""}{Math.round(realizedPnl).toLocaleString()}
          </div>
        </div>
      </div>

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
              const name = getName(h.symbol, data);
              return (
                <div key={i} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="font-semibold text-sm">{h.symbol}</div>
                      {name && <div className="text-xs text-muted">{name}</div>}
                    </div>
                    {current && (
                      <div className={`text-sm font-semibold ${pnl >= 0 ? "text-danger" : "text-blue-400"}`}>
                        {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    매수 {fmtWon(h.buy_price)} → 현재 {current ? fmtWon(current) : "-"} · {h.quantity?.toFixed(4)}개
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
            {[...history].reverse().slice(0, 50).map((h, i) => {
              const name = getName(h.symbol, data);
              return (
                <div key={i} className="bg-card border border-border rounded-lg p-3 text-xs">
                  <div className="flex justify-between mb-1">
                    <div className="flex gap-2 items-center">
                      <span className={`font-semibold ${h.type === "buy" ? "text-accent" : "text-muted"}`}>
                        {h.type === "buy" ? "매수" : "매도"}
                      </span>
                      <span>{h.symbol}</span>
                      {name && <span className="text-muted">{name}</span>}
                    </div>
                    <div className="text-muted">
                      {new Date(h.date).toLocaleString("ko-KR", {
                        month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
                        timeZone: "Asia/Seoul"
                      })}
                    </div>
                  </div>
                  <div className="flex justify-between text-muted">
                    <div>{fmtWon(h.price)} × {h.quantity?.toFixed(4)}</div>
                    {h.pnl !== undefined && (
                      <div className={h.pnl >= 0 ? "text-danger" : "text-blue-400"}>
                        {h.pnl >= 0 ? "+" : ""}{fmtWon(h.pnl)}
                      </div>
                    )}
                  </div>
                  {h.reason && <div className="text-muted mt-1">{h.reason}</div>}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
