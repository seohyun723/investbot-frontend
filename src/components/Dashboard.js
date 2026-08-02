"use client";
import TodayTab from "./TodayTab";
import PortfolioTab from "./PortfolioTab";
import SimulationTab from "./SimulationTab";
import BacktestTab from "./BacktestTab";

export default function Dashboard({ data, tab }) {
  if (tab === "today") return <TodayTab data={data} />;
  if (tab === "portfolio") return <PortfolioTab data={data} />;
  if (tab === "sim") return <SimulationTab data={data} />;
  if (tab === "backtest") return <BacktestTab data={data} />;
  return null;
}
