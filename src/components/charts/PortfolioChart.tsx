"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { PortfolioSnapshot } from "@/types/portfolio";
import type { ScenarioEvent } from "@/types/scenario";
import { formatCurrency, formatDate } from "@/lib/format";

interface PortfolioChartProps {
  history: PortfolioSnapshot[];
  events?: ScenarioEvent[];
  height?: number;
  /** Benchmark series (e.g. SPY) normalised to starting portfolio value */
  benchmarkData?: Array<{ date: string; value: number }>;
  /** Previous run history for same scenario — "beat your last run" ghost line */
  ghostData?: PortfolioSnapshot[];
}

interface ChartPoint {
  date: string;
  totalValue: number;
  cumulativeReturn: number;
  benchmark?: number;
  ghost?: number;
  eventLabel?: string;
  eventDescription?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ChartPoint | undefined;
  const val = payload.find((p) => p.dataKey === "totalValue")?.value ?? 0;
  const pct = point?.cumulativeReturn;
  const bm = point?.benchmark;
  const ghost = point?.ghost;
  return (
    <div className="bg-elevated border border-border rounded-lg px-3 py-2 text-xs shadow-lg min-w-[140px]">
      <p className="text-secondary mb-1">{formatDate(label as string, true)}</p>
      <p className="text-primary font-mono font-semibold">{formatCurrency(val as number)}</p>
      {pct !== undefined && (
        <p className={`font-mono text-xs ${pct >= 0 ? "text-gain" : "text-loss"}`}>
          {pct >= 0 ? "+" : ""}{(pct * 100).toFixed(1)}% total
        </p>
      )}
      {bm !== undefined && (
        <p className="font-mono text-xs text-secondary mt-0.5">SPY: {formatCurrency(bm, true)}</p>
      )}
      {ghost !== undefined && (
        <p className="font-mono text-xs text-muted mt-0.5">Prev: {formatCurrency(ghost, true)}</p>
      )}
      {point?.eventLabel && (
        <div className="mt-1.5 pt-1.5 border-t border-border/50">
          <p className="text-accent text-xs font-semibold">📰 {point.eventLabel}</p>
          <p className="text-secondary text-xs leading-snug mt-0.5 max-w-[180px]">{point.eventDescription}</p>
        </div>
      )}
    </div>
  );
}

export function PortfolioChart({
  history,
  events = [],
  height = 240,
  benchmarkData,
  ghostData,
}: PortfolioChartProps) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted text-xs" style={{ height }}>
        No data yet
      </div>
    );
  }

  // Scale ghost to same starting value as current run
  const ghostScale =
    history[0]?.totalValue && ghostData?.[0]?.totalValue
      ? history[0].totalValue / ghostData[0].totalValue
      : 1;

  // Build a date → event lookup so each data point can carry its headline
  const eventMap = new Map(events.map((e) => [e.date, e]));

  const chartData: ChartPoint[] = history.map((snap, i) => {
    const evt = eventMap.get(snap.date);
    return {
      date: snap.date,
      totalValue: snap.totalValue,
      cumulativeReturn: snap.cumulativeReturn,
      benchmark: benchmarkData?.[i]?.value,
      ghost: ghostData?.[i] ? ghostData[i].totalValue * ghostScale : undefined,
      eventLabel: evt?.label,
      eventDescription: evt?.description,
    };
  });

  const hasBenchmark = !!benchmarkData && benchmarkData.length > 0;
  const hasGhost = !!ghostData && ghostData.length > 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-gain)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-gain)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--color-secondary)", fontSize: 10 }}
          tickFormatter={(d: string) => formatDate(d, true)}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v: number) => formatCurrency(v, true)}
          tick={{ fill: "var(--color-secondary)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
        {events.map((evt) => (
          <ReferenceLine
            key={evt.date}
            x={evt.date}
            stroke="var(--color-accent)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: evt.label, fill: "var(--color-accent)", fontSize: 9, position: "insideTopRight" }}
          />
        ))}
        {/* Ghost line: previous run, dashed grey */}
        {hasGhost && (
          <Line
            type="monotone"
            dataKey="ghost"
            stroke="var(--color-muted)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={false}
            connectNulls
          />
        )}
        {/* Benchmark: SPY normalised, thin dotted */}
        {hasBenchmark && (
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="var(--color-secondary)"
            strokeWidth={1}
            strokeDasharray="2 4"
            dot={false}
            activeDot={false}
            connectNulls
          />
        )}
        {/* Portfolio — drawn last so it sits on top */}
        <Area
          type="monotone"
          dataKey="totalValue"
          stroke="var(--color-accent)"
          strokeWidth={2}
          fill="url(#portfolioGradient)"
          dot={false}
          activeDot={{ r: 3, fill: "var(--color-accent)", stroke: "var(--color-elevated)" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
