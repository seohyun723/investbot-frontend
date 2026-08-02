"use client";
import { useState } from "react";
import SignalCard from "./SignalCard";

// 시그널 우선순위 (강력매수 > 매수 > 중립 > 매도 > 강력매도)
function sigPriority(sig) {
  const s = String(sig || "");
  if (s.includes("강력매수")) return 0;
  if (s.includes("매수") && !s.includes("강력")) return 1;
  if (s.includes("중립")) return 2;
  if (s.includes("강력매도")) return 4;
  if (s.includes("매도")) return 3;
  return 5;
}

function sortByStrength(items) {
  return [...items].sort((a, b) => {
    const pa = sigPriority(a.signal);
    const pb = sigPriority(b.signal);
    if (pa !== pb) return pa - pb;
    return (b.total_score || 0) - (a.total_score || 0);
  });
}

export default function TodayTab({ data }) {
  const [market, setMarket] = useState("all");
  const top3 = data.top3 || [];
  const us = data.us_signals || [];
  const crypto = data.crypto_signals || [];
  const kr = data.kr_signals || [];
  const rate = data.usd_krw || 1436;

  const filtered = market === "all"
    ? sortByStrength([...us, ...crypto, ...kr])
    : market === "us" ? us
    : market === "crypto" ? crypto
    : kr;

  return (
    <>
      {top3.length > 0 && (
        <>
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-danger rounded-full inline-block"></span>
            오늘의 TOP 3
          </div>
          {top3.map((item, i) => (
            <SignalCard key={i} item={item} rank={i + 1} highlight rate={rate} />
          ))}
        </>
      )}

      <div className="flex gap-2 mt-6 mb-3 overflow-x-auto">
        {[
          { id: "all", label: "전체" },
          { id: "us", label: "🇺🇸 해외" },
          { id: "crypto", label: "🪙 코인" },
          { id: "kr", label: "🇰🇷 국내" },
        ].map(m => (
          <button key={m.id} onClick={() => setMarket(m.id)}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              market === m.id ? "bg-white text-black border-white" : "bg-card border-border text-muted"
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm bg-card border border-dashed border-border rounded-xl">
          강력한 시그널이 없습니다
        </div>
      ) : (
        filtered.map((item, i) => <SignalCard key={i} item={item} rate={rate} />)
      )}
    </>
  );
}
