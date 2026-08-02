"use client";
import TodayTab from "./TodayTab";
import PortfolioTab from "./PortfolioTab";

export default function Dashboard({ data, tab }) {
  if (tab === "today") return <TodayTab data={data} />;
  if (tab === "portfolio") return <PortfolioTab data={data} />;
  if (tab === "sim") return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="text-muted text-sm mb-2">시뮬레이션 상세</div>
      <div className="text-xs text-muted">클라우드에서 자동 실행 중</div>
    </div>
  );
  if (tab === "backtest") return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="text-muted text-sm mb-2">백테스트</div>
      <div className="text-xs text-muted">로컬에서 python backtester.py 실행</div>
    </div>
  );
  return null;
}
