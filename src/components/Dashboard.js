"use client";
import TodayTab from "./TodayTab";
import SignalCard from "./SignalCard";

export default function Dashboard({ data, tab }) {
  if (tab === "today") return <TodayTab data={data} />;
  if (tab === "sim") return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="text-muted text-sm mb-2">시뮬레이션 상세</div>
      <div className="text-xs text-muted">로컬 daily_run.py 실행 후 데이터 반영</div>
    </div>
  );
  if (tab === "portfolio") return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="text-muted text-sm mb-2">실전 포트폴리오</div>
      <div className="text-xs text-muted">python portfolio.py add 명령어로 등록</div>
    </div>
  );
  if (tab === "backtest") return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="text-muted text-sm mb-2">백테스트</div>
      <div className="text-xs text-muted">python backtester.py [종목] 명령어로 실행</div>
    </div>
  );
  return null;
}
