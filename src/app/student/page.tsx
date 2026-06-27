"use client";

import { useEffect, useState } from "react";
import { Award, Recycle, Trophy, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AchievementBadge } from "@/components/dashboard/leaderboard-podium";
import { formatDateTime, getInitials, calculateRankPosition } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface StudentProfile {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  course: string;
  year: number;
  profilePicture: string | null;
  rewardPoints: number;
  bottlesRecycled: number;
  rank: number | null;
  achievements: { achievement: { id: string; name: string; icon: string; description: string } }[];
  redemptions: { id: string; pointsUsed: number; status: string; createdAt: string; reward: { name: string } }[];
  transactions: { id: string; bottleCount: number; pointsEarned: number; createdAt: string; type: string }[];
}

const ALL_ACHIEVEMENTS = [
  { name: "First Bottle", icon: "🌱", description: "Recycle your first bottle" },
  { name: "100 Bottles", icon: "♻️", description: "Recycle 100 bottles" },
  { name: "500 Bottles", icon: "🏆", description: "Recycle 500 bottles" },
  { name: "1000 Bottles", icon: "👑", description: "Recycle 1000 bottles" },
  { name: "Eco Warrior", icon: "⚔️", description: "Earn 500 points" },
  { name: "Plastic Hero", icon: "🦸", description: "Earn 2000 points" },
  { name: "Planet Saver", icon: "🌍", description: "Earn 5000 points" },
];

export default function StudentDashboard() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProfile(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Failed to load profile
      </div>
    );
  }

  const unlockedNames = new Set(profile.achievements.map((a) => a.achievement.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-4 ring-primary/20">
            <AvatarImage src={profile.profilePicture ?? undefined} />
            <AvatarFallback className="text-lg">
              {getInitials(profile.firstName, profile.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              Welcome, {profile.firstName}!
            </h1>
            <p className="text-muted-foreground">
              {profile.studentId} · {profile.course} · Year {profile.year}
            </p>
          </div>
        </div>
        <Link href="/student/recycle">
          <Button className="gap-2">
            <Recycle size={18} />
            Recycle Now
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Reward Points" value={profile.rewardPoints} icon={Award} />
        <StatCard title="Bottles Recycled" value={profile.bottlesRecycled} icon={Recycle} />
        <StatCard
          title="Rank"
          value={profile.rank ?? 0}
          icon={Trophy}
          suffix={profile.rank ? calculateRankPosition(profile.rank).replace(/^\d+/, "") : ""}
        />
        <StatCard
          title="Achievements"
          value={profile.achievements.length}
          icon={TrendingUp}
          suffix={`/${ALL_ACHIEVEMENTS.length}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Link href="/student/history">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-muted/20 p-3"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {tx.type.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(tx.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary">
                    +{tx.pointsEarned} pts
                  </p>
                </div>
              ))}
              {!profile.transactions.length && (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet. Start recycling!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Rewards Claimed</CardTitle>
            <Link href="/student/rewards">
              <Button variant="ghost" size="sm">Browse Rewards</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.redemptions.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-muted/20 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{r.reward.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {r.status.toLowerCase()} · {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-destructive">
                    -{r.pointsUsed} pts
                  </p>
                </div>
              ))}
              {!profile.redemptions.length && (
                <p className="text-center text-muted-foreground py-8">
                  No rewards claimed yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {ALL_ACHIEVEMENTS.map((a) => (
              <AchievementBadge
                key={a.name}
                name={a.name}
                icon={a.icon}
                description={a.description}
                unlocked={unlockedNames.has(a.name)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
