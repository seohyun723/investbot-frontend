"use client";
import { useState, useEffect } from "react";
import Dashboard from "../components/Dashboard";

const DATA_URL = "https://raw.githubusercontent.com/seohyun723/investbot-frontend/main/public/latest.json";

const VALID_TABS = ["today", "sim", "portfolio", "backtest"];
const TAB_LABELS = {
  today: "오늘의 시그널",
  sim: "시뮬레이션",
  portfolio: "포트폴리오",
  backtest: "백테스트",
};
const DEFAULT_ORDER = ["today", "sim", "portfolio", "backtest"];

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("today");
  const [progress, setProgress] = useState("");
  const [tabOrder, setTabOrder] = useState(DEFAULT_ORDER);
  const [editMode, setEditMode] = useState(false);

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

  useEffect(() => {
    loadData();
    const hash = window.location.hash.replace("#", "");
    if (VALID_TABS.includes(hash)) setTab(hash);
    const params = new URLSearchParams(window.location.search);
    const savedOrder = params.get("order");
    if (savedOrder) {
      const arr = savedOrder.split(",").filter(t => VALID_TABS.includes(t));
      if (arr.length === VALID_TABS.length) setTabOrder(arr);
    }
    const onHashChange = () => {
      const h = window.location.hash.replace("#", "");
      if (VALID_TABS.includes(h)) setTab(h);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const changeTab = (id) => {
    setTab(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}${window.location.search}`);
    }
  };

  const saveOrder = (order) => {
    setTabOrder(order);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("order", order.join(","));
      window.history.replaceState(null, "", `?${params.toString()}#${tab}`);
    }
  };

  const moveTab = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= tabOrder.length) return;
    const newOrder = [...tabOrder];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    saveOrder(newOrder);
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

      <div className="flex items-center justify-between mb-2">
        <nav className="flex gap-2 overflow-x-auto">
          {tabOrder.map((id, idx) => (
            <div key={id} className="flex items-center flex-shrink-0">
              {editMode && (
                <button onClick={() => moveTab(idx, -1)} disabled={idx === 0}
                  className="px-1 text-muted disabled:opacity-20 text-sm">◀</button>
              )}
              <button onClick={() => changeTab(id)}
                className={`px-4 py-2 rounded-full text-xs whitespace-nowrap border ${
                  tab === id ? "bg-white text-black border-white" : "bg-card border-border text-muted"
                } ${editMode ? "ring-1 ring-accent/40" : ""}`}>
                {TAB_LABELS[id]}
              </button>
              {editMode && (
                <button onClick={() => moveTab(idx, 1)} disabled={idx === tabOrder.length - 1}
                  className="px-1 text-muted disabled:opacity-20 text-sm">▶</button>
              )}
            </div>
          ))}
        </nav>
        <button onClick={() => setEditMode(!editMode)}
          title="탭 순서 변경"
          className={`ml-2 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border text-sm ${
            editMode ? "bg-accent text-white border-accent" : "bg-card border-border text-muted"
          }`}>
          {editMode ? "✓" : "⋮⋮"}
        </button>
      </div>
      {editMode && (
        <div className="text-[10px] text-muted mb-4 pl-1">◀ ▶ 버튼으로 탭 순서를 바꾸세요</div>
      )}
      {!editMode && <div className="mb-4" />}

      <Dashboard data={data} tab={tab} />
    </main>
  );
}
