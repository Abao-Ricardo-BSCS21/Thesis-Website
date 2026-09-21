"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AchievementBadge } from "@/components/dashboard/leaderboard-podium";
import { Skeleton } from "@/components/ui/skeleton";

interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  requirementType: string;
  scope: "LIFETIME" | "MONTHLY";
  unlocked: boolean;
  current: number;
  progress: number;
}

interface AchievementsPayload {
  periodLabel: string;
  unlockedCount: number;
  totalCount: number;
  monthly: { bottles: number; points: number };
  lifetime: { bottles: number; points: number };
  achievements: AchievementItem[];
}

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64" />;

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Failed to load achievements
      </div>
    );
  }

  const monthly = data.achievements.filter((a) => a.scope === "MONTHLY");
  const lifetime = data.achievements.filter((a) => a.scope === "LIFETIME");
  const locked = data.achievements.filter((a) => !a.unlocked);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Achievements</h1>
        <p className="text-muted-foreground">
          {data.unlockedCount}/{data.totalCount} active · Monthly challenges
          reset each calendar month · Big milestones stay forever
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              This month · {data.periodLabel}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {data.monthly.bottles} bottles · {data.monthly.points} pts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Lifetime totals
            </p>
            <p className="mt-1 text-lg font-semibold">
              {data.lifetime.bottles} bottles · {data.lifetime.points} pts
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Monthly challenges</h2>
        <p className="text-sm text-muted-foreground">
          Progress uses this month&apos;s recycling only. Unlocks clear when the
          next month starts.
        </p>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {monthly.map((a) => (
            <AchievementBadge
              key={a.id}
              name={a.name}
              icon={a.icon}
              description={a.description}
              unlocked={a.unlocked}
              scope="MONTHLY"
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Lifetime milestones</h2>
        <p className="text-sm text-muted-foreground">
          These never reset once unlocked.
        </p>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {lifetime.map((a) => (
            <AchievementBadge
              key={a.id}
              name={a.name}
              icon={a.icon}
              description={a.description}
              unlocked={a.unlocked}
              scope="LIFETIME"
            />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {locked.map((a) => (
            <div key={a.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span>
                  {a.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({a.scope === "MONTHLY" ? "monthly" : "lifetime"})
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {a.current}/{a.requirement}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/30">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${a.progress}%` }}
                />
              </div>
            </div>
          ))}
          {locked.length === 0 && (
            <p className="py-4 text-center font-medium text-primary">
              All active achievements unlocked for this period!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
