import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trophy } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { formatImageRef } from "../../lib/format";
import type { TopVulnerableImage } from "../../types";

const BAR_COLOR = "#2a78d6";

export function TopVulnerableImagesChart({ data }: { data: TopVulnerableImage[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No vulnerable images yet"
        description="Once images are scanned, the most vulnerable ones are ranked here."
      />
    );
  }

  const chartData = data.map((d) => ({
    name: formatImageRef(d.image),
    total: d.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 36)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="0" horizontal={false} stroke="#e1e0d9" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={170}
          tick={{ fontSize: 11, fill: "#52514e" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: "rgba(42,120,214,0.08)" }} />
        <Bar dataKey="total" name="Total vulnerabilities" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
