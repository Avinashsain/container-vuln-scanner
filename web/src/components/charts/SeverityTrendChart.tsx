import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { SEVERITY_COLORS } from "../../lib/severityColors";
import { EmptyState } from "../ui/EmptyState";
import type { SeverityTrendPoint } from "../../types";

const SERIES: Array<{ key: keyof Omit<SeverityTrendPoint, "date">; label: string; color: string }> = [
  { key: "critical", label: "Critical", color: SEVERITY_COLORS.critical },
  { key: "high", label: "High", color: SEVERITY_COLORS.high },
  { key: "medium", label: "Medium", color: SEVERITY_COLORS.medium },
  { key: "low", label: "Low", color: SEVERITY_COLORS.low },
];

function formatTick(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SeverityTrendChart({ data }: { data: SeverityTrendPoint[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No scan history in this range"
        description="Try a wider date range, or scan an image to start building history."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" vertical={false} stroke="#e1e0d9" />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          tick={{ fontSize: 11, fill: "#898781" }}
          axisLine={{ stroke: "#c3c2b7" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#898781" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          labelFormatter={(label) => formatTick(String(label))}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {SERIES.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId="severity"
            stroke={s.color}
            strokeWidth={2}
            fill={s.color}
            fillOpacity={0.15}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
