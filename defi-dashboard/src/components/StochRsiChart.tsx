"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  CartesianGrid,
} from "recharts";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

export interface StochRsiPoint {
  timestamp: number;
  stochK: number | null;
  stochD: number | null;
}

interface StochRsiChartProps {
  data: StochRsiPoint[];
  height?: number;
}

export default function StochRsiChart({ data, height = 120 }: StochRsiChartProps) {
  const chartData = data
    .filter((d) => d.stochK != null && d.stochD != null)
    .map((d) => ({
      date: formatDate(d.timestamp),
      k: d.stochK ?? 0,
      d: d.stochD ?? 0,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ height }}>
        Sem dados Stoch RSI
      </div>
    );
  }

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 2" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <ReferenceArea y1={80} y2={100} fill="#fecaca" fillOpacity={0.4} />
          <ReferenceArea y1={0} y2={20} fill="#bbf7d0" fillOpacity={0.4} />
          <XAxis dataKey="date" tick={{ fontSize: 9 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} width={24} />
          <Tooltip
            formatter={(value, name) => [value != null ? Number(value).toFixed(1) : "", name]}
            labelFormatter={(label) => label}
            contentStyle={{ borderRadius: "6px", fontSize: "12px" }}
          />
          <Line type="monotone" dataKey="k" stroke="#6366f1" strokeWidth={2} dot={false} name="%K" />
          <Line type="monotone" dataKey="d" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="%D" />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-0.5 text-[10px] text-zinc-400">
        Verde: &lt;20 (sobrevendido). Vermelho: &gt;80 (sobrecomprado).
      </p>
    </div>
  );
}
