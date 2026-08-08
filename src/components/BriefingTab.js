"use client";

// 판단 로직 헬퍼
function extractPct(reasons, keyword) {
  // "5일 강세(42.9%)" 같은 패턴에서 숫자 추출
  const re = new RegExp(keyword + "\\(([+-]?[0-9.]+)%\\)");
  const m = (reasons || "").match(re);
  return m ? parseFloat(m[1]) : null;
}

function hasFlag(reasons, kw) {
  return (reasons || "").includes(kw);
}

// 종목의 리스크 레벨 판정
function riskLevel(sig) {
  const sym = sig.symbol || sig.ticker || "";
  const reasons = sig.reasons || "";
  // 신생/소형 코인 = 높음 (KRW- 인데 워치리스트 밖)
  const majorCoins = ["KRW-BTC","KRW-ETH","KRW-XRP","KRW-SOL","KRW-ADA","KRW-DOGE","KRW-AVAX","KRW-LINK","KRW-DOT","KRW-UNI","KRW-ATOM","KRW-NEAR","KRW-APT","KRW-ALGO"];
  if (sym.startsWith("KRW-")) {
    return majorCoins.includes(sym) ? "보통" : "높음";
  }
  // 5일 급등 크면 높음
  const surge = extractPct(reasons, "5일 강세");
  if (surge !== null && surge >= 30) return "높음";
  // 발굴 종목(discovered)이면 보통
  if (sig.category === "discovered") return "보통";
  return "낮음";
}

// 급등 후 종목 판정
function isOverextended(sig) {
  const surge = extractPct(sig.reasons, "5일 강세");
  const rsiHigh = hasFlag(sig.reasons, "RSI 고점");
  return surge !== null && surge >= 30;
}

// 눌림목 판정
function isPullback(sig) {
  return hasFlag(sig.reasons, "RSI 저점") || hasFlag(sig.reasons, "과매도") || hasFlag(sig.reasons, "MACD 반등");
}

// 수급 양호 판정
function hasGoodFlow(sig) {
  return hasFlag(sig.reasons, "외국인 순매수");
}

// 판단 힌트 한 줄 생성
function judgmentHint(sig) {
  if (isPullback(sig) && !isOverextended(sig)) return "눌림목/반등 시작 → 추격 아님, 진입 타이밍 양호";
  if (hasGoodFlow(sig)) return "수급 양호 + 과열 아님 → 진입 고려 가능";
  if (hasFlag(sig.reasons, "시장 대비 강세")) return "시장 대비 강세 → 관심";
  if (isOverextended(sig)) return "이미 급등 → 추격 주의, 조정 대기";
  return "신호 발생 → 지표 확인 후 판단";
}

const RISK_STYLE = {
  "낮음": { bg: "#EAF3DE", fg: "#3B6D11" },
  "보통": { bg: "#F1EFE8", fg: "#5F5E5A" },
  "높음": { bg: "#FAEEDA", fg: "#854F0B" },
};

export default function BriefingTab({ data }) {
  if (!data) return <div style={{ padding: 20, color: "#888" }}>데이터 로딩 중...</div>;

  const us = data.us_signals || [];
  const cr = data.crypto_signals || [];
  const kr = data.kr_signals || [];
  const all = [...us, ...cr, ...kr];
  const holdings = data.holdings || (data.portfolio && data.portfolio.holdings) || [];

  // 매수 신호 종목
  const buys = all
    .filter((x) => x.signal && x.signal.includes("매수") && !x.signal.includes("매도"))
    .sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

  // TOP 3: 급등 안 한 것 우선
  const notOverext = buys.filter((x) => !isOverextended(x));
  const top3 = (notOverext.length >= 3 ? notOverext : buys).slice(0, 3);

  // 주의: 급등 후
  const cautions = buys.filter(isOverextended).slice(0, 4);

  const genAt = (data.generated_at || "").substring(5, 16).replace("T", " ");
  const vix = data.vix || (data.market && data.market.vix);
  const fg = data.crypto_fear_greed && data.crypto_fear_greed.index;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 500 }}>오늘의 브리핑</span>
        <span style={{ fontSize: 12, color: "#999" }}>
          {genAt}{vix ? ` · VIX ${vix}` : ""}{fg ? ` · 공포탐욕 ${fg}` : ""}
        </span>
      </div>

      {/* 보유 종목 점검 */}
      {holdings.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>📋 내 보유 종목 점검</div>
          <div style={{ display: "grid", gap: 8 }}>
            {holdings.map((h, i) => {
              const sig = all.find((x) => (x.symbol || x.ticker) === h.symbol);
              const rl = sig ? riskLevel(sig) : "보통";
              const flowWarn = sig && hasFlag(sig.reasons, "외국인") && !hasGoodFlow(sig);
              return (
                <div key={i} style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      {h.name || h.symbol} <span style={{ fontSize: 11, color: "#999" }}>평단 {Math.round(h.buy_price).toLocaleString()}</span>
                    </span>
                    <span style={{ background: RISK_STYLE[rl].bg, color: RISK_STYLE[rl].fg, fontSize: 12, padding: "3px 10px", borderRadius: 20 }}>
                      위험 {rl}
                    </span>
                  </div>
                  {sig && (
                    <div style={{ fontSize: 13, color: "#666", marginTop: 5 }}>
                      {sig.signal} {sig.total_score}점 · {judgmentHint(sig)}
                    </div>
                  )}
                  {!sig && <div style={{ fontSize: 13, color: "#999", marginTop: 5 }}>오늘 신호 없음</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TOP 3 */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>⭐ 오늘의 TOP 3 <span style={{ fontSize: 11, color: "#999", fontWeight: 400 }}>신규 매수 후보</span></div>
        <div style={{ display: "grid", gap: 10 }}>
          {top3.map((sig, i) => {
            const rl = riskLevel(sig);
            return (
              <div key={i} style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    {sig.name || sig.symbol || sig.ticker}
                  </span>
                  <span style={{ background: "#EAF3DE", color: "#3B6D11", fontSize: 12, padding: "3px 10px", borderRadius: 20 }}>
                    {sig.signal} {sig.total_score}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ background: RISK_STYLE[rl].bg, color: RISK_STYLE[rl].fg, fontSize: 11, padding: "2px 8px", borderRadius: 12 }}>위험도 {rl}</span>
                </div>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>💡 {judgmentHint(sig)}</div>
                <div style={{ fontSize: 12, color: "#999" }}>🎯 진입: 눌림 시 분할 · 손절 {sig.stoploss_price ? Math.round(sig.stoploss_price).toLocaleString() : "-7%"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 주의 - 급등 */}
      {cautions.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>⚠️ 주의 — 이미 급등 (추격 위험)</div>
          <div style={{ background: "#FAEEDA", borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ display: "grid", gap: 8 }}>
              {cautions.map((sig, i) => {
                const surge = extractPct(sig.reasons, "5일 강세");
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#854F0B", fontWeight: 500 }}>{sig.name || sig.symbol}</span>
                    <span style={{ color: "#854F0B" }}>5일 +{surge}% → 조정 대기</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
