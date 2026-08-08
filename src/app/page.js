"use client";
import { useState, useEffect, useRef } from "react";
import Dashboard from "../components/Dashboard";

const DATA_URL = "https://raw.githubusercontent.com/seohyun723/investbot-frontend/main/public/latest.json";

const VALID_TABS = ["today", "portfolio", "briefing", "sim", "backtest"];
const TAB_LABELS = {
  today: "오늘의 시그널",
  portfolio: "포트폴리오",
  briefing: "브리핑",
  sim: "시뮬레이션",
  backtest: "백테스트",
};

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("today");
  const [progress, setProgress] = useState("");
  const [pullDist, setPullDist] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const loadData = async () => {
    try {
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error("데이터 로드 실패");
      const json = await res.json();
      try {
        const pRes = await fetch(`/portfolio.json?t=${Date.now()}`);
        if (pRes.ok) {
          const pJson = await pRes.json();
          json.holdings = pJson.holdings || [];
        }
      } catch (pe) {}
      setData(json);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const triggerReanalysis = async () => {
    setRefreshing(true);
    setProgress("재분석 요청 중...");
    try {
      const res = await fetch("/api/reanalyze", { method: "POST" });
      if (res.ok) {
        setProgress("분석 중... (5-7분 소요)");
        setTimeout(async () => {
          setProgress("완료! 최신 데이터 로드 중...");
          await loadData();
          setTimeout(() => {
            setRefreshing(false);
            setProgress("");
          }, 1000);
        }, 300000);
      } else {
        setProgress("재분석 요청 실패");
        setTimeout(() => { setRefreshing(false); setProgress(""); }, 3000);
      }
    } catch (e) {
      setProgress("서버 연결 실패");
      setTimeout(() => { setRefreshing(false); setProgress(""); }, 3000);
    }
  };

  useEffect(() => {
    loadData();
    const hash = window.location.hash.replace("#", "");
    if (VALID_TABS.includes(hash)) setTab(hash);
    const onHashChange = () => {
      const h = window.location.hash.replace("#", "");
      if (VALID_TABS.includes(h)) setTab(h);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleTouchStart = (e) => {
    if (window.scrollY <= 0) {
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  };
  const handleTouchMove = (e) => {
    if (!pulling.current || pullRefreshing) return;
    const dist = e.touches[0].clientY - touchStartY.current;
    if (dist > 0 && window.scrollY <= 0) {
      setPullDist(Math.min(dist * 0.5, 80));
    }
  };
  const handleTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDist > 50) {
      setPullRefreshing(true);
      setPullDist(60);
      await loadData();
      setTimeout(() => {
        setPullRefreshing(false);
        setPullDist(0);
      }, 500);
    } else {
      setPullDist(0);
    }
  };

  const changeTab = (id) => {
    setTab(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  if (loading) return <div className="p-6 text-center text-muted">로딩 중...</div>;
  if (!data) return (
    <div className="p-6 text-center max-w-md mx-auto">
      <div className="text-danger mb-4">데이터를 불러올 수 없습니다</div>
      <button onClick={loadData} className="px-6 py-3 bg-accent text-white rounded-lg font-semibold">
        다시 시도
      </button>
    </div>
  );

  const lastUpdate = data.generated_at ? (() => {
    const utcStr = data.generated_at.includes('Z') || data.generated_at.includes('+')
      ? data.generated_at
      : data.generated_at + 'Z';
    return new Date(utcStr).toLocaleString("ko-KR", {
      month: "long", day: "numeric", hour: "numeric", minute: "numeric", timeZone: "Asia/Seoul"
    });
  })() : "";

  return (
    <main
      className="max-w-2xl mx-auto p-4 pb-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDist > 0 && (
        <div className="flex items-center justify-center overflow-hidden transition-all"
          style={{ height: `${pullDist}px` }}>
          <span className={`text-xs text-muted ${pullRefreshing ? "animate-pulse" : ""}`}>
            {pullRefreshing ? "🔄 새로고침 중..." : pullDist > 50 ? "↓ 놓으면 새로고침" : "↓ 당겨서 새로고침"}
          </span>
        </div>
      )}

      <header className="flex justify-between items-center mb-3">
        <div>
          <div className="text-xs text-muted tracking-wider">INVESTBOT</div>
          <div className="text-lg font-semibold">{data.date}</div>
          {lastUpdate && (
            <div className="text-xs text-muted mt-0.5">마지막 분석: {lastUpdate}</div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={triggerReanalysis}
            disabled={refreshing}
            className="w-9 h-9 bg-accent border border-accent rounded-lg flex items-center justify-center disabled:opacity-50"
            title="재분석 (5-7분)"
          >
            <span className={refreshing ? "animate-spin" : ""}>⚙️</span>
          </button>
          {(() => {
            const fgIdx = data.fear_greed?.index ?? 50;
            const fgColor = fgIdx < 25 ? "text-blue-400 border-blue-400/40 bg-blue-400/10"
              : fgIdx < 45 ? "text-blue-300 border-blue-300/30 bg-blue-300/5"
              : fgIdx < 55 ? "text-muted border-border bg-card"
              : fgIdx < 75 ? "text-red-300 border-red-300/30 bg-red-300/5"
              : "text-danger border-danger/40 bg-danger/10";
            return (
              <div className={`px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap border ${fgColor}`}>
                🌡 {fgIdx} · {data.fear_greed?.label ?? ""}
              </div>
            );
          })()}
        </div>
      </header>

      {refreshing && (
        <div className="bg-accent/20 border border-accent rounded-lg p-3 mb-4 text-sm text-center">
          {progress}
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto mb-4">
        {VALID_TABS.map((id) => (
          <button key={id} onClick={() => changeTab(id)}
            className={`px-4 py-2 rounded-full text-xs whitespace-nowrap border flex-shrink-0 ${
              tab === id ? "bg-white text-black border-white" : "bg-card border-border text-muted"
            }`}>
            {TAB_LABELS[id]}
          </button>
        ))}
      </nav>

      <Dashboard data={data} tab={tab} />
    </main>
  );
}
