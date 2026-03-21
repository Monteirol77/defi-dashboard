"use client";

import {
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Bar,
} from "recharts";
import type { MarketChartPoint, OHLCPoint } from "@/lib/coingecko";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export type ChartRange = "7d" | "30d";
export type ChartType = "line" | "candlestick";

export interface ChartPointWithMA extends MarketChartPoint {
  ma7?: number | null;
  ma30?: number | null;
  stochK?: number | null;
  stochD?: number | null;
}

interface PriceChartLineProps {
  data: ChartPointWithMA[];
  name: string;
  color: string;
  range: ChartRange;
}

function buildLineChartData(data: ChartPointWithMA[]) {
  return data.map(({ timestamp, price, ma7, ma30 }) => ({
    date: formatDate(timestamp),
    full: price,
    price: Math.round(price),
    ma7: ma7 ?? undefined,
    ma30: ma30 ?? undefined,
  }));
}

export function PriceChartLine({ data, name, color, range }: PriceChartLineProps) {
  const chartData = buildLineChartData(data);

  return (
    <div className="h-[280px] min-h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id={`gradient-${name}-${range}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-zinc-500" />
          <YAxis tickFormatter={formatPrice} tick={{ fontSize: 10 }} className="text-zinc-500" width={52} />
          <Tooltip
            labelFormatter={(label) => label}
            contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as { date: string; full: number; ma7?: number; ma30?: number };
              return (
                <div className="rounded-lg border border-zinc-200 bg-white p-2 shadow dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="text-xs font-medium text-zinc-500">{p.date}</p>
                  <p>Preço: {formatPrice(p.full)}</p>
                  {p.ma7 != null && <p className="text-purple-600">MA 7: {formatPrice(p.ma7)}</p>}
                  {p.ma30 != null && <p className="text-emerald-600">MA 30: {formatPrice(p.ma30)}</p>}
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="full" stroke={color} strokeWidth={2} fill={`url(#gradient-${name}-${range})`} />
          <Line type="monotone" dataKey="ma7" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="MA 7d" />
          <Line type="monotone" dataKey="ma30" stroke="#34d399" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="MA 30d" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CandlestickChartProps {
  data: OHLCPoint[];
  name: string;
  range: ChartRange;
}

export function CandlestickChart({ data, name: _name, range: _range }: CandlestickChartProps) {
  const allV = data.flatMap((d) => [d.open, d.high, d.low, d.close]);
  const minP = Math.min(...allV);
  const maxP = Math.max(...allV);
  const rangeP = maxP - minP || 1;
  const marginTop = 8;
  const marginBottom = 8;
  const plotHeight = 280 - marginTop - marginBottom;
  const toY = (v: number) => marginTop + plotHeight * (1 - (v - minP) / rangeP);

  const chartData = data.map((d) => ({
    date: formatDate(d.timestamp),
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    isUp: d.close >= d.open,
    pyHigh: toY(d.high),
    pyLow: toY(d.low),
    pyOpen: toY(d.open),
    pyClose: toY(d.close),
  }));

  const barW = Math.max(6, Math.min(20, 260 / chartData.length));

  return (
    <div className="h-[280px] min-h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-zinc-500" />
          <YAxis tickFormatter={formatPrice} tick={{ fontSize: 10 }} width={52} domain={[minP, maxP]} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
            formatter={(value: unknown) => (value != null ? formatPrice(Number(value)) : "")}
            labelFormatter={(label) => label}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as (typeof chartData)[0];
              return (
                <div className="rounded-lg border border-zinc-200 bg-white p-2 shadow dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="text-xs font-medium text-zinc-500">{p.date}</p>
                  <p>O: {formatPrice(p.open)}</p>
                  <p>H: {formatPrice(p.high)}</p>
                  <p>L: {formatPrice(p.low)}</p>
                  <p>C: {formatPrice(p.close)}</p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="close"
            fill="transparent"
            barSize={barW}
            shape={(props) => {
              const { x, width, payload } = props;
              const p = payload as (typeof chartData)[0];
              const color = p.isUp ? "#22c55e" : "#ef4444";
              const cx = (x as number) + width / 2;
              return (
                <g>
                  <line x1={cx} y1={p.pyHigh} x2={cx} y2={p.pyLow} stroke={color} strokeWidth={1} />
                  <rect
                    x={x as number}
                    y={Math.min(p.pyOpen, p.pyClose)}
                    width={width}
                    height={Math.max(2, Math.abs(p.pyClose - p.pyOpen))}
                    fill={color}
                    stroke={color}
                  />
                </g>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PriceChartProps {
  chartType: ChartType;
  range: ChartRange;
  lineData: ChartPointWithMA[];
  ohlcData: OHLCPoint[];
  name: string;
  color: string;
}

export default function PriceChart({ chartType, range, lineData, ohlcData, name, color }: PriceChartProps) {
  if (chartType === "candlestick") {
    return <CandlestickChart data={ohlcData} name={name} range={range} />;
  }
  return <PriceChartLine data={lineData} name={name} color={color} range={range} />;
}
