"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#7ED957", "#1B5E20", "#4ADE80", "#86EFAC", "#BBF7D0"];

interface RecyclingChartProps {
  data: { name: string; bottles: number; points?: number; weight?: number }[];
  type?: "area" | "bar";
  dataKey?: "bottles" | "points" | "weight";
}

export function RecyclingChart({
  data,
  type = "area",
  dataKey = "bottles",
}: RecyclingChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const labels: Record<string, string> = {
    bottles: "Bottles",
    points: "Points",
    weight: "Weight (kg)",
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      {type === "area" ? (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7ED957" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7ED957" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "12px",
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="#7ED957"
            fill="url(#colorPrimary)"
            strokeWidth={2}
            name={labels[dataKey]}
          />
        </AreaChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "12px",
            }}
          />
          <Bar dataKey={dataKey} fill="#7ED957" radius={[6, 6, 0, 0]} name={labels[dataKey]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

interface DistributionChartProps {
  data: { name: string; value: number }[];
}

export function DistributionChart({ data }: DistributionChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[250px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={4}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1E293B",
            border: "1px solid #334155",
            borderRadius: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
