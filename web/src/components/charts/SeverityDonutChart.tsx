import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { SEVERITY_COLORS } from "../../lib/severityColors";
import { EmptyState } from "../ui/EmptyState";
import { PieChart as PieChartIcon } from "lucide-react";

interface SeverityDonutChartProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function SeverityDonutChart({ critical, high, medium, low }: SeverityDonutChartProps) {
  const total = critical + high + medium + low;

  if (total === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title="No vulnerabilities to chart"
        description="Once scans complete, the severity breakdown appears here."
      />
    );
  }

  const data = [
    { name: "Critical", value: critical, color: SEVERITY_COLORS.critical },
    { name: "High", value: high, color: SEVERITY_COLORS.high },
    { name: "Medium", value: medium, color: SEVERITY_COLORS.medium },
    { name: "Low", value: low, color: SEVERITY_COLORS.low },
  ].filter((d) => d.value > 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={2}
            strokeWidth={2}
            stroke="var(--chart-surface, #fff)"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const count = Number(value);
              return [`${count} (${((count / total) * 100).toFixed(0)}%)`, name];
            }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend verticalAlign="bottom" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{total}</div>
        <div className="text-xs text-slate-400">total</div>
      </div>
    </div>
  );
}
