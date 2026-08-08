"use client";
import { useState, useEffect } from "react";
import SignalCard from "./SignalCard";

const SIM_URL = "https://raw.githubusercontent.com/seohyun723/investbot-frontend/main/public/simulation.json";
const PORTFOLIO_URL = "https://raw.githubusercontent.com/seohyun723/investbot-frontend/main/public/portfolio.json";

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

function vixEmoji(v) {
  if (v == null) return "";
  if (v < 15) return "😌";
  if (v < 20) return "🙂";
  if (v < 30) return "⚠️";
  return "🔴";
}

function fgEmoji(v) {
  if (v == null) return "";
  if (v < 25) return "😱";
  if (v < 45) return "😰";
  if (v < 55) return "😐";
  if (v < 75) return "🙂";
  return "🤑";
}

function MarketItem({ name, price, change }) {
  if (price == null) return null;
  const up = (change ?? 0) >= 0;
  const fmtPrice = price >= 1000 ? Math.round(price).toLocaleString() : price.toFixed(2);
  const chg = change ?? 0;
  return (
    <div className="flex-shrink-0 bg-card border border-border rounded-lg px-3 py-2 min-w-[100px]">
      <div className="text-[11px] text-muted whitespace-nowrap">{name}</div>
      <div className="text-sm font-semibold">{fmtPrice}</div>
     <div className={`text-[11px] ${up ? "text-danger" : "text-blue-400"}`}>
        {up ? "▲" : "▼"} {Math.abs(chg).toFixed(2)}%
      </div>
    </div>
  );
}

function SentimentItem({ label, value, sub, emoji }) {
  return (
    <div className="bg-card border border-border rounded-lg px-2 py-1.5 text-center">
      <div className="text-[10px] text-muted whitespace-nowrap">{label}</div>
      <div className="text-sm font-bold leading-tight">
        {emoji && <span className="mr-0.5">{emoji}</span>}{value}
      </div>
      <div className="text-[10px] text-muted whitespace-nowrap">{sub}</div>
    </div>
  );
}

export default function TodayTab({ data }) {
  const [market, setMarket] = useState("all");
  const [myHoldings, setMyHoldings] = useState([]);

  const top3 = data.top3 || [];
  const us = data.us_signals || [];
  const crypto = data.crypto_signals || [];
  const kr = data.kr_signals || [];
  const alt = data.alt_signals || [];
  const rate = data.usd_krw || 1436;

  useEffect(() => {
    const load = async () => {
      const symbols = new Set();
      try {
        const r = await fetch(`${SIM_URL}?t=${Date.now()}`);
        if (r.ok) {
          const j = await r.json();
          (j.holdings || []).filter(h => h.status === "active").forEach(h => symbols.add(h.symbol));
        }
      } catch (e) {}
      try {
        const r = await fetch(`${PORTFOLIO_URL}?t=${Date.now()}`);
        if (r.ok) {
          const j = await r.json();
          (j.holdings || []).forEach(h => symbols.add(h.symbol));
        }
      } catch (e) {}
      setMyHoldings([...symbols]);
    };
    load();
  }, []);

  const rawIndicators = (data.market_indicators || []).filter(
    m => !(m.name || "").includes("VIX")
  );
  const ORDER = ["원달러", "KOSPI", "NASDAQ", "S&P 500"];
  const marketIndicators = [...rawIndicators].sort((a, b) => {
    const ia = ORDER.indexOf(a.name); const ib = ORDER.indexOf(b.name);
    const ra = ia === -1 ? 999 : ia;
    const rb = ib === -1 ? 999 : ib;
    return ra - rb;
  });

  const fg = data.fear_greed || {};
  const trumpSummary = data.trump_summary || "";
  const cryptoFg = data.crypto_fear_greed || null;
  const vix = fg.vix;

  const getSymbol = (item) => item.ticker || item.symbol || item.code || "";
  const isHeld = (item) => myHoldings.includes(getSymbol(item));

  // 내 종목 = 보유 중인 모든 종목 (전 자산군에서)
  const allItems = [...us, ...crypto, ...kr, ...alt];
  const myItems = sortByStrength(allItems.filter(isHeld));

  const baseList = market === "all"
    ? allItems
    : market === "us" ? us
    : market === "crypto" ? crypto
    : market === "kr" ? kr
    : alt;

  const sortedList = sortByStrength(baseList);

  return (
    <>
      {marketIndicators.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-muted mb-2">시장 지표</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {marketIndicators.map((m, i) => (
              <MarketItem key={i} name={m.name} price={m.price} change={m.change_pct} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5 mb-4">
        <SentimentItem label="공포탐욕" value={fg.index ?? "-"} sub={fg.label || ""} emoji={fgEmoji(fg.index)} />
        <SentimentItem label="VIX" value={vix != null ? vix.toFixed(1) : "-"} sub="변동성" emoji={vixEmoji(vix)} />
        <SentimentItem
          label="뉴스"
          value={`${trumpSummary.match(/호재 (\d+)/)?.[1] || "-"}:${trumpSummary.match(/악재 (\d+)/)?.[1] || "-"}`}
          sub="호재:악재"
        />
        <SentimentItem
          label="코인심리"
          value={cryptoFg ? cryptoFg.index : "-"}
          sub={cryptoFg ? cryptoFg.label : "수집중"}
          emoji={cryptoFg ? fgEmoji(cryptoFg.index) : ""}
        />
      </div>


      <div className="flex gap-2 mt-6 mb-3 overflow-x-auto">
        {[
          { id: "all", label: "전체" },
          { id: "us", label: "🇺🇸 해외" },
          { id: "crypto", label: "🪙 코인" },
          { id: "kr", label: "🇰🇷 국내" },
          { id: "alt", label: "🏦 원자재·채권" },
        ].map(m => (
          <button key={m.id} onClick={() => setMarket(m.id)}
            className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap ${
              market === m.id ? "bg-white text-black border-white" : "bg-card border-border text-muted"
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {sortedList.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm bg-card border border-dashed border-border rounded-xl">
          해당 시그널이 없습니다
        </div>
      ) : (
        <>
          {sortedList.map((item, i) => (
            <SignalCard key={`main-${i}`} item={item} rate={rate} held={isHeld(item)} />
          ))}
        </>
      )}
    </>
  );
}
