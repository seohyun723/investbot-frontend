"use client";

function isKRW(symbol) {
  return (symbol || "").startsWith("KRW-") || /^\d{6}$/.test(symbol || "");
}

function PriceDisplay({ symbol, price, rate }) {
  if (price == null) return <span>-</span>;
  if (isKRW(symbol)) {
    return <span>₩{Math.round(price).toLocaleString()}</span>;
  }
  return (
    <span>
      ${price.toFixed(2)}
      <span className="block text-[10px] text-muted font-normal">
        ≈₩{Math.round(price * rate).toLocaleString()}
      </span>
    </span>
  );
}

function sigBadge(sig) {
  const s = String(sig || "");
  if (s.includes("강력매수")) return "bg-danger/20 text-danger border-danger/30";
  if (s.includes("매수")) return "bg-red-400/10 text-red-400 border-red-400/20";
  if (s.includes("강력매도")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (s.includes("매도")) return "bg-blue-400/10 text-blue-400 border-blue-400/20";
  return "bg-card text-muted border-border";
}

// 거래량 라벨
function volLabel(volScore) {
  if (volScore == null) return null;
  if (volScore >= 70) return { text: "거래량 활발", color: "text-danger" };
  if (volScore >= 55) return { text: "거래량 증가", color: "text-red-400" };
  if (volScore >= 45) return { text: "거래량 보통", color: "text-muted" };
  return { text: "거래량 한산", color: "text-blue-400" };
}

export default function SignalCard({ item, rank, highlight, rate = 1436 }) {
  const symbol = item.symbol || item.ticker || item.code || "";
  const name = item.name || symbol;
  const price = item.price;
  const target = item.target_price;
  const stop = item.stoploss_price;
  const score = item.total_score;
  const signal = item.signal;
  const change = item.change_24h ?? item.change_pct;
  const reasons = item.reasons || "";
  const kimchi = item.kimchi_premium;
  const volScore = item.vol_score;

  // 상승여력 계산
  let upside = null;
  if (price && target && price > 0) {
    upside = ((target - price) / price) * 100;
  }
  const vol = volLabel(volScore);

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
          <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full border whitespace-nowrap ${sigBadge(signal)}`}>{signal}</span>
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
          <div className="text-sm font-semibold"><PriceDisplay symbol={symbol} price={price} rate={rate} /></div>
        </div>
        <div className="bg-bg/50 rounded-lg p-2">
          <div className="text-xs text-muted">목표</div>
          <div className="text-sm font-semibold text-danger"><PriceDisplay symbol={symbol} price={target} rate={rate} /></div>
        </div>
        <div className="bg-bg/50 rounded-lg p-2">
          <div className="text-xs text-muted">손절</div>
          <div className="text-sm font-semibold text-blue-400"><PriceDisplay symbol={symbol} price={stop} rate={rate} /></div>
        </div>
      </div>

      {/* 추가 지표: 상승여력 · 거래량 · 김프 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
        {upside != null && (
          <span className="text-muted">
            상승여력 <span className={upside >= 0 ? "text-danger font-semibold" : "text-blue-400 font-semibold"}>
              {upside >= 0 ? "+" : ""}{upside.toFixed(1)}%
            </span>
          </span>
        )}
        {vol && (
          <span className={vol.color}>· {vol.text}</span>
        )}
        {kimchi != null && Math.abs(kimchi) >= 0.3 && (
          <span className={kimchi >= 8 ? "text-danger" : kimchi <= -3 ? "text-blue-400" : "text-muted"}>
            · 김프 {kimchi >= 0 ? "+" : ""}{kimchi.toFixed(1)}%
          </span>
        )}
      </div>

      {reasons && (
        <div className="text-xs text-muted mt-2 leading-relaxed">{reasons}</div>
      )}
    </div>
  );
}
