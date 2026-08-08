"use client";

function extractPct(reasons, keyword) {
  const re = new RegExp(keyword + "\\(([+-]?[0-9.]+)%\\)");
  const m = (reasons || "").match(re);
  return m ? parseFloat(m[1]) : null;
}

function hasFlag(reasons, kw) {
  return (reasons || "").includes(kw);
}

const MAJOR_COINS = ["KRW-BTC","KRW-ETH","KRW-XRP","KRW-SOL","KRW-ADA","KRW-DOGE","KRW-AVAX","KRW-LINK","KRW-DOT","KRW-UNI","KRW-ATOM","KRW-NEAR","KRW-APT","KRW-ALGO"];

function isNewCoin(sig) {
  const sym = sig.symbol || sig.ticker || "";
  return sym.startsWith("KRW-") && !MAJOR_COINS.includes(sym);
}

function riskLevel(sig) {
  const sym = sig.symbol || sig.ticker || "";
  const reasons = sig.reasons || "";
  if (sym.startsWith("KRW-")) return MAJOR_COINS.includes(sym) ? "보통" : "높음";
  const surge = extractPct(reasons, "5일 강세");
  if (surge !== null && surge >= 30) return "높음";
  if (sig.category === "discovered") return "보통";
  return "낮음";
}

function isOverextended(sig) {
  const surge = extractPct(sig.reasons, "5일 강세");
  return surge !== null && surge >= 30;
}

function isPullback(sig) {
  return hasFlag(sig.reasons, "RSI 저점") || hasFlag(sig.reasons, "과매도");
}

function rsiHigh(sig) {
  return hasFlag(sig.reasons, "RSI 고점") || hasFlag(sig.reasons, "과매수");
}

function hasGoodFlow(sig) {
  return hasFlag(sig.reasons, "외국인 순매수");
}

function judgmentHint(sig) {
  if (isPullback(sig) && !isOverextended(sig)) return "눌림목/반등 시작 → 진입 타이밍 양호";
  if (hasGoodFlow(sig)) return "수급 양호 + 과열 아님 → 진입 고려 가능";
  if (hasFlag(sig.reasons, "시장 대비 강세")) return "시장 대비 강세 → 관심";
  return "신호 발생 → 지표 확인 후 판단";
}

// 비중 제안 (월 20만원 기준, 코어-새틀라이트)
function allocHint(sig, isSafe) {
  const sym = sig.symbol || sig.ticker || "";
  const coin = sym.startsWith("KRW-");
  const major = ["KRW-BTC","KRW-ETH","KRW-XRP","KRW-SOL","KRW-ADA","KRW-DOGE","KRW-AVAX","KRW-LINK","KRW-DOT","KRW-UNI","KRW-ATOM","KRW-NEAR","KRW-APT","KRW-ALGO"].includes(sym);
  if (isSafe) return "코어 · 3~5만원";
  if (coin && major) return "새틀라이트 · 1~2만원";
  return "새틀라이트 · 2천~4천원 (1~2%)";
}

const RISK_STYLE = {
  "낮음": { bg: "#EAF3DE", fg: "#3B6D11" },
  "보통": { bg: "#F1EFE8", fg: "#5F5E5A" },
  "높음": { bg: "#FAEEDA", fg: "#854F0B" },
};

function Badge({ level }) {
  const s = RISK_STYLE[level];
  return <span style={{ background: s.bg, color: s.fg, fontSize: 11, padding: "2px 8px", borderRadius: 12 }}>위험 {level}</span>;
}

function ScoreBadge({ sig, muted }) {
  if (muted) return <span style={{ background: "#F1EFE8", color: "#888", fontSize: 12, padding: "3px 10px", borderRadius: 20 }}>{sig.signal} {sig.total_score}</span>;
  return <span style={{ background: "#EAF3DE", color: "#3B6D11", fontSize: 12, padding: "3px 10px", borderRadius: 20 }}>{sig.signal} {sig.total_score}</span>;
}

export default function BriefingTab({ data }) {
  if (!data) return <div style={{ padding: 20, color: "#888" }}>데이터 로딩 중...</div>;

  const all = [...(data.us_signals || []), ...(data.crypto_signals || []), ...(data.kr_signals || [])];
  const holdings = data.holdings || [];

  const buys = all
    .filter((x) => x.signal && x.signal.includes("매수") && !x.signal.includes("매도"))
    .sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

  const isCoin = (x) => (x.symbol || x.ticker || "").startsWith("KRW-");
  const safeTop = buys.filter((x) => !isCoin(x) && !isOverextended(x)).slice(0, 3);
  const highRisk = buys.filter((x) => isCoin(x)).slice(0, 5);
  const cautions = buys.filter(isOverextended).slice(0, 4);

  const genAt = (data.generated_at || "").substring(5, 16).replace("T", " ");
  const fg = (data.fear_greed && data.fear_greed.index) || (data.crypto_fear_greed && data.crypto_fear_greed.index);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 500 }}>오늘의 브리핑</span>
        <span style={{ fontSize: 12, color: "#999" }}>{genAt}{fg ? ` · 공포탐욕 ${fg}` : ""}</span>
      </div>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px" }}>
        안전 종목은 메인으로, 신생 코인은 소액(전체의 1~2%)만 · 손절 엄수.
      </p>

      {holdings.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            📋 내 보유 종목 점검
          </div>
          <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
            {holdings.map((h, i) => {
              const sig = all.find((x) => (x.symbol || x.ticker) === h.symbol);
              const rl = sig ? riskLevel(sig) : (isNewCoin({ symbol: h.symbol }) ? "높음" : "보통");
              const flowWarn = sig && hasFlag(sig.reasons, "외국인") && !hasGoodFlow(sig);
              return (
                <div key={i} style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      {h.name || h.symbol} <span style={{ fontSize: 11, color: "#999" }}>평단 {Math.round(h.buy_price).toLocaleString()}</span>
                    </span>
                    <Badge level={rl} />
                  </div>
                  {sig && (
                    <div style={{ fontSize: 13, color: flowWarn ? "#993C1D" : "#666", marginTop: 5 }}>
                      {flowWarn ? "⚠️ " : ""}{sig.signal} {sig.total_score}점 · {flowWarn ? "외국인 순매도 주의" : judgmentHint(sig)}
                    </div>
                  )}
                  {!sig && <div style={{ fontSize: 13, color: "#999", marginTop: 5 }}>오늘 신호 없음 · 보유 유지</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
        🛡 안전 TOP <span style={{ fontSize: 11, color: "#999", fontWeight: 400 }}>코어 · 메인 투자</span>
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
        {safeTop.length === 0 && <div style={{ fontSize: 13, color: "#999" }}>오늘은 안전 매수 후보가 없어요.</div>}
        {safeTop.map((sig, i) => {
          const rl = riskLevel(sig);
          return (
            <div key={i} style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{sig.name || sig.symbol || sig.ticker}</span>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Badge level={rl} /><ScoreBadge sig={sig} /></span>
              </div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 3 }}>💡 {judgmentHint(sig)}</div>
              <div style={{ fontSize: 12, color: "#999" }}>🎯 진입: 눌림 시 분할 · 손절 {sig.stoploss_price ? Math.round(sig.stoploss_price).toLocaleString() : "-7%"}</div>
              <div style={{ fontSize: 12, color: "#3B6D11", marginTop: 2 }}>💰 {allocHint(sig, true)}</div>
            </div>
          );
        })}
      </div>

      {highRisk.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            🚀 고위험 기회 <span style={{ fontSize: 11, color: "#854F0B", fontWeight: 400 }}>새틀라이트 · 소액만 (전체의 1~2%)</span>
          </div>
          <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
            {highRisk.map((sig, i) => {
              const good = isPullback(sig);
              const tooHigh = rsiHigh(sig);
              return (
                <div key={i} style={{ background: "#fff", border: good ? "0.5px solid #EF9F27" : "0.5px solid #e5e5e5", borderRadius: 12, padding: "12px 16px", opacity: tooHigh ? 0.7 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{sig.name || sig.symbol} <span style={{ fontSize: 11, color: "#999" }}>신생코인</span></span>
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Badge level="높음" /><ScoreBadge sig={sig} muted={tooHigh} /></span>
                  </div>
                  {good && (
                    <>
                      <div style={{ fontSize: 13, color: "#666", marginBottom: 3 }}>✅ RSI 저점/과매도 반등 → 진입 타이밍 양호 (새틀라이트 규칙 충족)</div>
                      <div style={{ fontSize: 12, color: "#854F0B" }}>⚠️ 소액만 · 8% 트레일링 스톱 · 손절 엄수</div>
                      <div style={{ fontSize: 12, color: "#854F0B", marginTop: 2 }}>💰 {allocHint(sig, false)}</div>
                    </>
                  )}
                  {!good && tooHigh && <div style={{ fontSize: 13, color: "#666" }}>✕ 점수 높지만 RSI 고점 → 지금 진입 부적합 (눌림 대기)</div>}
                  {!good && !tooHigh && <div style={{ fontSize: 13, color: "#666" }}>신호 발생 · 신생코인이라 변동성 큼 → 소액만</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {cautions.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>⚠️ 주의 — 이미 급등 (추격 위험)</div>
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
        </>
      )}
    </div>
  );
}
