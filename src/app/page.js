"use client";
import { useState, useEffect, useRef } from "react";
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
  const [dragIdx, setDragIdx] = useState(null);
  const holdTimer = useRef(null);
  const [holding, setHolding] = useState(null);

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
    // URL 해시에서 탭 복원
    const hash = window.location.hash.replace("#", "");
    if (VALID_TABS.includes(hash)) setTab(hash);
    // URL 쿼리에서 탭 순서 복원 (?order=today,sim,...)
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

  // 롱프레스 시작 → 드래그 모드
  const handlePressStart = (idx) => {
    holdTimer.current = setTimeout(() => {
      setHolding(idx);
      setDragIdx(idx);
    }, 400);
  };
  const handlePressEnd = (id) => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (holding === null) {
      changeTab(id); // 짧게 누르면 탭 전환
    }
    setHolding(null);
    setDragIdx(null);
  };
  const handleDragEnter = (idx) => {
    if (dragIdx === null || dragIdx === idx) return;
    const newOrder = [...tabOrder];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    setDragIdx(idx);
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
          <div className="bg-card px-3 py-2 rounded-full text-xs text-muted whitespace-nowrap">
            🌡 {data.fear_greed?.index ?? 50} · {data.fear_greed?.label ?? ""}
          </div>
        </div>
      </header>

      {refreshing && (
        <div className="bg-accent/20 border border-accent rounded-lg p-3 mb-4 text-sm text-center">
          {progress}
        </div>
      )}

      <nav className="flex gap-2 mb-2 overflow-x-auto">
        {tabOrder.map((id, idx) => (
          <button
            key={id}
            onMouseDown={() => handlePressStart(idx)}
            onMouseUp={() => handlePressEnd(id)}
            onMouseLeave={() => { if (holdTimer.current) clearTimeout(holdTimer.current); }}
            onTouchStart={() => handlePressStart(idx)}
            onTouchEnd={() => handlePressEnd(id)}
            onMouseEnter={() => holding !== null && handleDragEnter(idx)}
            className={`px-4 py-2 rounded-full text-xs whitespace-nowrap border transition-all select-none ${
              holding === idx ? "scale-105 ring-2 ring-accent opacity-80" : ""
            } ${
              tab === id ? "bg-white text-black border-white" : "bg-card border-border text-muted"
            }`}
          >
            {holding === idx && "⣿ "}{TAB_LABELS[id]}
          </button>
        ))}
      </nav>
      <div className="text-[10px] text-muted mb-4 pl-1">💡 탭을 길게 눌러 순서 변경</div>

      <Dashboard data={data} tab={tab} />
    </main>
  );
}
