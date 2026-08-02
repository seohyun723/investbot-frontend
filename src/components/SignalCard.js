"use client";
export default function SignalCard({ item, rank, highlight }) {
  const sig = item.signal || "";
  const isStrongBuy = sig.includes("강력매수");
  const isBuy = sig.includes("매수");
  const isSell = sig.includes("매도");

  const badgeClass = isStrongBuy ? "bg-danger text-white" :
                     isBuy ? "bg-accent text-white" :
                     isSell ? "bg-muted text-white" : "bg-card text-muted";

  const rankColors = ["bg-danger", "bg-warning", "bg-yellow-600"];
  const cardClass = highlight ? "border-danger/50" : "border-border";

  const price = item.price || 0;
  const target = isBuy ? price * 1.10 : price * 0.95;
  const stop = isBuy ? price * 0.95 : price * 1.05;

  const isCrypto = item.market === "코인" || item.market_icon === "🪙";
  const priceStr = isCrypto && price < 1 ? `$${price.toFixed(4)}` : `$${price.toFixed(2)}`;
  const targetStr = isCrypto && target < 1 ? `$${target.toFixed(4)}` : `$${target.toFixed(2)}`;
  const stopStr = isCrypto && stop < 1 ? `$${stop.toFixed(4)}` : `$${stop.toFixed(2)}`;

  return (
    <div className={`bg-card border rounded-xl p-4 mb-2 ${cardClass}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          {rank && (
            <span className={`w-6 h-6 ${rankColors[rank-1]} text-white rounded-full inline-flex items-center justify-center text-xs font-semibold mr-2`}>
              {rank}
            </span>
          )}
          <div>
            <div className="text-sm font-semibold">{item.name || item.symbol || item.ticker}</div>
            <div className="text-xs text-muted">
              {item.market_icon} {item.market} · 점수 {item.score || item.total_score}
              {item.change_24h != null && item.change_24h !== 0 && (
                <span className={item.change_24h > 0 ? "text-success ml-1" : "text-danger ml-1"}>
                  ({item.change_24h > 0 ? "+" : ""}{item.change_24h.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>{sig}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-muted">현재가</div><div className="font-semibold">{priceStr}</div></div>
        <div><div className="text-muted">목표</div><div className="text-success font-semibold">{targetStr}</div></div>
        <div><div className="text-muted">손절</div><div className="text-danger font-semibold">{stopStr}</div></div>
      </div>
      {item.reasons && (
        <div className="text-xs text-muted mt-2 pt-2 border-t border-border">{item.reasons}</div>
      )}
    </div>
  );
}
