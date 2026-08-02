"use client";
import { useState, useEffect } from "react";
import Dashboard from "../components/Dashboard";

const DATA_URL = "https://raw.githubusercontent.com/seohyun723/investbot-frontend/main/public/latest.json";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("today");
  const [progress, setProgress] = useState("");

  const loadData = async () => {
    try {
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error("데이터 로드 실패");
      const json = await res.json();
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

  useEffect(() => { loadData(); }, []);

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
    // generated_at은 timezone 없이 UTC로 저장되어 있음
    const utcStr = data.generated_at.includes('Z') || data.generated_at.includes('+') 
      ? data.generated_at 
      : data.generated_at + 'Z';
    return new Date(utcStr).toLocaleString("ko-KR", { 
      month: "long", day: "numeric", hour: "numeric", minute: "numeric", timeZone: "Asia/Seoul"
    });
  })() : "";

  return (
    <main className="max-w-2xl mx-auto p-4 pb-20">
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
            onClick={loadData}
            className="w-9 h-9 bg-card border border-border rounded-lg flex items-center justify-center"
            title="새로고침"
          >
            🔄
          </button>
          <button
            onClick={triggerReanalysis}
            disabled={refreshing}
            className="w-9 h-9 bg-accent border border-accent rounded-lg flex items-center justify-center disabled:opacity-50"
            title="재분석 (5-7분)"
          >
            <span className={refreshing ? "animate-spin" : ""}>⚙️</span>
          </button>
          <div className="bg-card px-3 py-2 rounded-full text-xs text-muted">
            🌡 {data.fear_greed?.index ?? 50} · {data.fear_greed?.label ?? ""}
          </div>
        </div>
      </header>

      {refreshing && (
        <div className="bg-accent/20 border border-accent rounded-lg p-3 mb-4 text-sm text-center">
          {progress}
        </div>
      )}

      <nav className="flex gap-2 mb-5 overflow-x-auto">
        {[
          { id: "today", label: "오늘의 시그널" },
          { id: "sim", label: "시뮬레이션" },
          { id: "portfolio", label: "포트폴리오" },
          { id: "backtest", label: "백테스트" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-xs whitespace-nowrap border ${
              tab === t.id ? "bg-white text-black border-white" : "bg-card border-border text-muted"
            }`}>
            {t.label}
          </button>
        ))}
      </nav>

      <Dashboard data={data} tab={tab} />
    </main>
  );
}
