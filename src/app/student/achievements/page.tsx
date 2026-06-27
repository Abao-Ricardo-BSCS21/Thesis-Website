"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AchievementBadge } from "@/components/dashboard/leaderboard-podium";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_ACHIEVEMENTS = [
  { name: "First Bottle", icon: "🌱", description: "Recycle your first bottle", requirement: 1 },
  { name: "100 Bottles", icon: "♻️", description: "Recycle 100 bottles", requirement: 100 },
  { name: "500 Bottles", icon: "🏆", description: "Recycle 500 bottles", requirement: 500 },
  { name: "1000 Bottles", icon: "👑", description: "Recycle 1000 bottles", requirement: 1000 },
  { name: "Eco Warrior", icon: "⚔️", description: "Earn 500 points", requirement: 500 },
  { name: "Plastic Hero", icon: "🦸", description: "Earn 2000 points", requirement: 2000 },
  { name: "Planet Saver", icon: "🌍", description: "Earn 5000 points", requirement: 5000 },
];

export default function AchievementsPage() {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ bottles: 0, points: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setUnlocked(new Set(d.data.achievements.map((a: { achievement: { name: string } }) => a.achievement.name)));
          setStats({ bottles: d.data.bottlesRecycled, points: d.data.rewardPoints });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Achievements</h1>
        <p className="text-muted-foreground">
          {unlocked.size}/{ALL_ACHIEVEMENTS.length} unlocked
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {ALL_ACHIEVEMENTS.map((a) => (
          <AchievementBadge
            key={a.name}
            name={a.name}
            icon={a.icon}
            description={a.description}
            unlocked={unlocked.has(a.name)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ALL_ACHIEVEMENTS.filter((a) => !unlocked.has(a.name)).map((a) => {
            const current = a.name.includes("Bottle") ? stats.bottles : stats.points;
            const progress = Math.min((current / a.requirement) * 100, 100);
            return (
              <div key={a.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{a.name}</span>
                  <span className="text-muted-foreground">
                    {current}/{a.requirement}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted/30">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
          {unlocked.size === ALL_ACHIEVEMENTS.length && (
            <p className="text-center text-primary font-medium py-4">
              🎉 All achievements unlocked! You&apos;re a recycling champion!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
