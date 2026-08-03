"use client";
import { useState } from "react";

function isKRW(symbol) {
  return (symbol || "").startsWith("KRW-") || /^\d{6}$/.test(symbol || "");
}

function parseStrategyTag(reasons) {
  const m = String(reasons || "").match(/^\[([^\]]+)\]/);
  return {
    tag: m ? m[1] : null,
    rest: m ? String(reasons).replace(/^\[[^\]]+\]\s*\|?\s*/, "") : reasons,
  };
}

function tagColor(tag) {
  if (!tag) return "";
  if (tag.includes("평균회귀")) return "bg-purple-500/15 text-purple-300 border-purple-500/30";
  if (tag.includes("안전자산")) return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  if (tag.includes("고변동")) return "bg-orange-500/15 text-orange-300 border-orange-500/30";
  if (tag.includes("추세")) return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  return "bg-card text-muted border-border";
}

function PriceDisplay({ symbol, price, rate }) {
  if (price == null) return <span>-</span>;
  if (isKRW(symbol)) return <span>₩{Math.round(price).toLocaleString()}</span>;
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

function volLabel(volScore) {
  if (volScore == null) return null;
  if (volScore >= 70) return { text: "거래량 활발", color: "text-danger" };
  if (volScore >= 55) return { text: "거래량 증가", color: "text-red-400" };
  if (volScore >= 45) return { text: "거래량 보통", color: "text-muted" };
  return { text: "거래량 한산", color: "text-blue-400" };
}

function ScoreBar({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-12 text-muted">{label}</span>
      <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, value))}%` }}></div>
      </div>
      <span className="text-xs w-6 text-right">{Math.round(value)}</span>
    </div>
  );
}

function DetailModal({ item, rate, onClose }) {
  const symbol = item.symbol || item.ticker || item.code || "";
  const name = item.name || symbol;
  const price = item.price;
  const target = item.target_price;
  const stop = item.stoploss_price;
  const signal = item.signal;
  const score = item.total_score;
  const tech = item.tech_score;
  const mom = item.mom_score;
  const vol = item.vol_score;
  const fund = item.fund_score;
  const analyst = item.analyst_score;
  const change = item.change_24h ?? item.change_pct;
  const kimchi = item.kimchi_premium;
  const grade = item.grade;
  const { tag, rest } = parseStrategyTag(item.reasons);
  const reasons = String(rest || "").split("|").map(r => r.trim()).filter(Boolean);

  const krw = isKRW(symbol);
  const fmt = (v) => v == null ? "-" : (krw ? `₩${Math.round(v).toLocaleString()}` : `$${v.toFixed(2)}`);

  let upside = null, downside = null, rr = null;
  if (price && target) upside = ((target - price) / price) * 100;
  if (price && stop) downside = ((stop - price) / price) * 100;
  if (upside && downside && downside !== 0) rr = Math.abs(upside / downside);

  const reasonColor = (r) => {
    if (r.includes("정배열") || r.includes("강세") || r.includes("과매도") || r.includes("역프") || r.includes("호재") || r.includes("상승") || r.includes("반등")) return "bg-danger/10 text-danger";
    if (r.includes("과매수") || r.includes("고점") || r.includes("악재") || r.includes("부정") || r.includes("역배열") || r.includes("과열") || r.includes("약세") || r.includes("하락")) return "bg-blue-400/10 text-blue-400";
    return "bg-card text-muted border border-border";
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-bg border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-bg border-b border-border p-4 flex justify-between items-start">
          <div>
            <div className="text-lg font-bold">{symbol}</div>
            {name !== symbol && <div className="text-xs text-muted">{name}</div>}
            {tag && <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${tagColor(tag)}`}>{tag}</span>}
          </div>
          <button onClick={onClose} className="text-muted text-xl leading-none">✕</button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-2xl font-bold">{fmt(price)}</div>
              {change != null && (
                <div className={`text-sm ${change >= 0 ? "text-danger" : "text-blue-400"}`}>
                  {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                </div>
              )}
            </div>
            <div className="text-right">
              <span className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${sigBadge(signal)}`}>{signal}</span>
              {grade && <div className="text-[11px] text-muted mt-1">{grade}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-xs text-muted">목표가</div>
              <div className="text-base font-semibold text-danger">{fmt(target)}</div>
              {upside != null && <div className="text-xs text-muted">상승여력 +{upside.toFixed(1)}%</div>}
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-xs text-muted">손절가</div>
              <div className="text-base font-semibold text-blue-400">{fmt(stop)}</div>
              {downside != null && <div className="text-xs text-muted">하방 {downside.toFixed(1)}%</div>}
            </div>
          </div>

          {rr != null && (
            <div className="bg-accent/10 rounded-xl p-3">
              <div className="text-xs text-accent">
                ⚖ 손익비 {rr.toFixed(1)} : 1 {rr >= 2 ? "(양호)" : rr >= 1.5 ? "(적정)" : "(주의)"}
              </div>
            </div>
          )}

          {score != null && (
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-xs text-muted mb-2">종합점수 {score.toFixed(1)} / 100</div>
              <div className="space-y-1.5">
                {tech != null && <ScoreBar label="기술적" value={tech} />}
                {mom != null && <ScoreBar label="모멘텀" value={mom} />}
                {vol != null && <ScoreBar label="거래량" value={vol} />}
                {fund != null && <ScoreBar label="펀더멘털" value={fund} />}
                {analyst != null && <ScoreBar label="애널리스트" value={analyst} />}
              </div>
            </div>
          )}

          {kimchi != null && Math.abs(kimchi) >= 0.3 && (
            <div className="bg-card border border-border rounded-xl p-3 text-xs">
              <span className="text-muted">김치프리미엄 </span>
              <span className={kimchi >= 8 ? "text-danger font-semibold" : kimchi <= -3 ? "text-blue-400 font-semibold" : "text-primary"}>
                {kimchi >= 0 ? "+" : ""}{kimchi.toFixed(2)}%
              </span>
              <span className="text-muted"> {kimchi >= 8 ? "(과열 주의)" : kimchi <= -3 ? "(역프 - 매수 기회)" : "(정상)"}</span>
            </div>
          )}

          {reasons.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-xs text-muted mb-2">분석 근거</div>
              <div className="flex flex-wrap gap-1.5">
                {reasons.map((r, i) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded-lg ${reasonColor(r)}`}>{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignalCard({ item, rank, highlight, rate = 1436 }) {
  const [showDetail, setShowDetail] = useState(false);
  const symbol = item.symbol || item.ticker || item.code || "";
  const name = item.name || symbol;
  const price = item.price;
  const target = item.target_price;
  const stop = item.stoploss_price;
  const score = item.total_score;
  const signal = item.signal;
  const change = item.change_24h ?? item.change_pct;
  const kimchi = item.kimchi_premium;
  const volScore = item.vol_score;
  const { tag, rest } = parseStrategyTag(item.reasons);

  let upside = null;
  if (price && target && price > 0) upside = ((target - price) / price) * 100;
  const vol = volLabel(volScore);

  return (
    <>
      <div onClick={() => setShowDetail(true)} className={`bg-card border rounded-xl p-4 mb-2 cursor-pointer hover:border-border-strong transition-colors ${highlight ? "border-danger/40" : "border-border"}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-start gap-2 min-w-0">
            {rank && <span className="text-xs bg-danger/20 text-danger rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{rank}</span>}
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{symbol}</div>
              {name !== symbol && <div className="text-xs text-muted truncate">{name}</div>}
              {tag && <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap ${tagColor(tag)}`}>{tag}</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
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

        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
          {upside != null && (
            <span className="text-muted">
              상승여력 <span className={upside >= 0 ? "text-danger font-semibold" : "text-blue-400 font-semibold"}>
                {upside >= 0 ? "+" : ""}{upside.toFixed(1)}%
              </span>
            </span>
          )}
          {vol && <span className={vol.color}>· {vol.text}</span>}
          {kimchi != null && Math.abs(kimchi) >= 0.3 && (
            <span className={kimchi >= 8 ? "text-danger" : kimchi <= -3 ? "text-blue-400" : "text-muted"}>
              · 김프 {kimchi >= 0 ? "+" : ""}{kimchi.toFixed(1)}%
            </span>
          )}
          <span className="text-muted ml-auto">자세히 ›</span>
        </div>

        {rest && (
          <div className="text-xs text-muted mt-2 leading-relaxed line-clamp-2">{rest}</div>
        )}
      </div>

      {showDetail && <DetailModal item={item} rate={rate} onClose={() => setShowDetail(false)} />}
    </>
  );
}
