"use client";
import { useState, useEffect } from "react";
import Dashboard from "@/components/Dashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("today");
  const [progress, setProgress] = useState("");

  const loadData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/latest`);
      const json = await res.json();
      setData(json);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    setProgress("서버 요청 중...");
    try {
      await fetch(`${API_URL}/api/refresh`, { method: "POST" });
      // 상태 폴링
      const checkStatus = async () => {
        const res = await fetch(`${API_URL}/api/status`);
        const status = await res.json();
        if (status.status === "running") {
          setProgress(status.message || "분석 중...");
          setTimeout(checkStatus, 3000);
        } else if (status.status === "done") {
          setProgress("완료!");
          await loadData();
          setTimeout(() => { setRefreshing(false); setProgress(""); }, 1000);
        } else if (status.status === "error") {
          setProgress("오류: " + status.message);
          setTimeout(() => { setRefreshing(false); setProgress(""); }, 3000);
        }
      };
      setTimeout(checkStatus, 2000);
    } catch (e) {
      setProgress("서버 연결 실패");
      setTimeout(() => { setRefreshing(false); setProgress(""); }, 3000);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="p-6 text-center text-muted">로딩 중...</div>;
  if (!data || data.error) return (
    <div className="p-6 text-center max-w-md mx-auto">
      <div className="text-danger mb-4">데이터를 불러올 수 없습니다</div>
      <button onClick={refresh} className="px-6 py-3 bg-accent text-white rounded-lg font-semibold">
        분석 시작하기
      </button>
      {refreshing && <div className="mt-4 text-muted text-sm">{progress}</div>}
    </div>
  );

  return (
    <main className="max-w-2xl mx-auto p-4 pb-20">
      <header className="flex justify-between items-center mb-5">
        <div>
          <div className="text-xs text-muted tracking-wider">INVESTBOT</div>
          <div className="text-lg font-semibold">{data.date}</div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="w-9 h-9 bg-card border border-border rounded-lg flex items-center justify-center disabled:opacity-50"
          >
            <span className={refreshing ? "animate-spin" : ""}>🔄</span>
          </button>
          <div className="bg-card px-3 py-2 rounded-full text-xs text-muted">
            🌡 {data.fear_greed?.index ?? 50} · {data.fear_greed?.label ?? ""}
          </div>
        </div>
      </header>

      {refreshing && (
        <div className="bg-accent/20 border border-accent rounded-lg p-3 mb-4 text-sm text-center">
          {progress || "분석 중... (최대 5분 소요)"}
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
