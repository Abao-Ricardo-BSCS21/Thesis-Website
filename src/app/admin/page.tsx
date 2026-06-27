"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Recycle,
  TrendingUp,
  Award,
  Scale,
  Monitor,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard, ChartCard } from "@/components/dashboard/stat-card";
import { RecyclingChart, DistributionChart } from "@/components/charts/recycling-charts";
import { LeaderboardPodium, LeaderboardList } from "@/components/dashboard/leaderboard-podium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

interface DashboardData {
  totalUsers: number;
  totalBottles: number;
  todayBottles: number;
  totalPoints: number;
  plasticCollectedKg: number;
  machines: {
    id: string;
    name: string;
    status: string;
    bottlesStored: number;
    bottleCapacity: number;
  }[];
  recentTransactions: {
    id: string;
    bottleCount: number;
    pointsEarned: number;
    createdAt: string;
    student: { firstName: string; lastName: string; studentId: string };
  }[];
  topContributors: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    bottlesRecycled: number;
    rewardPoints: number;
    rank: number | null;
  }[];
  chartData: { name: string; bottles: number; points: number; weight: number }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/stats?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Failed to load dashboard data
      </div>
    );
  }

  const onlineMachines = data.machines.filter((m) => m.status === "ONLINE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of recycling operations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Users" value={data.totalUsers} icon={Users} />
        <StatCard title="Total Bottles" value={data.totalBottles} icon={Recycle} />
        <StatCard title="Today's Bottles" value={data.todayBottles} icon={TrendingUp} trend="+12% from yesterday" trendUp />
        <StatCard title="Points Distributed" value={data.totalPoints} icon={Award} />
        <StatCard title="Plastic Collected" value={data.plasticCollectedKg} icon={Scale} suffix=" kg" decimals={1} />
        <StatCard title="Machines Online" value={onlineMachines} icon={Monitor} suffix={`/${data.machines.length}`} />
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        <TabsContent value={period}>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Daily Recycling" description="Bottles recycled over time">
              <RecyclingChart data={data.chartData} type="area" />
            </ChartCard>
            <ChartCard title="Reward Distribution" description="Points earned over time">
              <RecyclingChart data={data.chartData} type="bar" dataKey="points" />
            </ChartCard>
            <ChartCard title="Plastic Collected (kg)" description="Weight collected over time">
              <RecyclingChart data={data.chartData} type="area" dataKey="weight" />
            </ChartCard>
            <ChartCard title="Machine Usage" description="Distribution by machine">
              <DistributionChart
                data={data.machines.map((m) => ({
                  name: m.name,
                  value: m.bottlesStored,
                }))}
              />
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaderboardPodium entries={data.topContributors} />
            <LeaderboardList entries={data.topContributors} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-muted/20 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {tx.student.firstName} {tx.student.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.student.studentId} · {formatDateTime(tx.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">
                      +{tx.pointsEarned} pts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.bottleCount} bottle(s)
                    </p>
                  </div>
                </div>
              ))}
              {!data.recentTransactions.length && (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Machine Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.machines.map((machine) => (
              <div
                key={machine.id}
                className="rounded-xl border border-border/50 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{machine.name}</p>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      machine.status === "ONLINE"
                        ? "bg-primary animate-pulse"
                        : machine.status === "MAINTENANCE"
                          ? "bg-yellow-500"
                          : "bg-destructive"
                    }`}
                  />
                </div>
                <p className="text-xs text-muted-foreground capitalize mb-2">
                  {machine.status.toLowerCase()}
                </p>
                <div className="h-2 rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(machine.bottlesStored / machine.bottleCapacity) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {machine.bottlesStored}/{machine.bottleCapacity} bottles
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
