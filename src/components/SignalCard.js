"use client";

// 통화 판단
function isKRW(symbol) {
  return (symbol || "").startsWith("KRW-") || /^\d{6}$/.test(symbol || "");
}

// 가격 포맷 (원화/달러 구분)
function fmtPrice(symbol, price) {
  if (price == null) return "-";
  if (isKRW(symbol)) {
    return `₩${Math.round(price).toLocaleString()}`;
  }
  return `$${price.toFixed(2)}`;
}

function sigColor(sig) {
  const s = String(sig || "");
  if (s.includes("강력매수")) return "text-danger";
  if (s.includes("매수")) return "text-red-400";
  if (s.includes("강력매도")) return "text-blue-500";
  if (s.includes("매도")) return "text-blue-400";
  return "text-muted";
}

function sigBadge(sig) {
  const s = String(sig || "");
  if (s.includes("강력매수")) return "bg-danger/20 text-danger border-danger/30";
  if (s.includes("매수")) return "bg-red-400/10 text-red-400 border-red-400/20";
  if (s.includes("강력매도")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (s.includes("매도")) return "bg-blue-400/10 text-blue-400 border-blue-400/20";
  return "bg-card text-muted border-border";
}

export default function SignalCard({ item, rank, highlight }) {
  const symbol = item.symbol || item.ticker || item.code || "";
  const name = item.name || symbol;
  const price = item.price;
  const target = item.target_price;
  const stop = item.stoploss_price;
  const score = item.total_score;
  const signal = item.signal;
  const change = item.change_24h ?? item.change_pct;
  const reasons = item.reasons || "";

  return (
    <div className={`bg-card border rounded-xl p-4 mb-2 ${highlight ? "border-danger/40" : "border-border"}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {rank && <span className="text-xs bg-danger/20 text-danger rounded-full w-5 h-5 flex items-center justify-center font-bold">{rank}</span>}
          <div>
            <div className="font-semibold text-sm">{symbol}</div>
            {name !== symbol && <div className="text-xs text-muted">{name}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs px-2 py-0.5 rounded-full border ${sigBadge(signal)}`}>{signal}</div>
          {score != null && (
            <div className="text-xs text-muted mt-1">
              점수 {score.toFixed(1)}
              {change != null && (
                <span className={change >= 0 ? "text-danger" : "text-blue-400"}>
                  {" "}({change >= 0 ? "+" : ""}{change.toFixed(1)}%)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-bg/50 rounded-lg p-2">
          <div className="text-xs text-muted">현재가</div>
          <div className="text-sm font-semibold">{fmtPrice(symbol, price)}</div>
        </div>
        <div className="bg-bg/50 rounded-lg p-2">
          <div className="text-xs text-muted">목표</div>
          <div className="text-sm font-semibold text-danger">{fmtPrice(symbol, target)}</div>
        </div>
        <div className="bg-bg/50 rounded-lg p-2">
          <div className="text-xs text-muted">손절</div>
          <div className="text-sm font-semibold text-blue-400">{fmtPrice(symbol, stop)}</div>
        </div>
      </div>

      {reasons && (
        <div className="text-xs text-muted mt-2 leading-relaxed">{reasons}</div>
      )}
    </div>
  );
}
