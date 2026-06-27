"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardPodium, LeaderboardList } from "@/components/dashboard/leaderboard-podium";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  bottlesRecycled: number;
  rewardPoints: number;
  rank?: number | null;
  profilePicture?: string | null;
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "allTime">("allTime");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEntries(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Top recyclers on campus</p>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="allTime">All Time</TabsTrigger>
        </TabsList>
        <TabsContent value={period}>
          {loading ? (
            <Skeleton className="h-64" />
          ) : (
            <Card>
              <CardContent className="p-6">
                <LeaderboardPodium entries={entries} />
                <LeaderboardList entries={entries} />
                {!entries.length && (
                  <p className="text-center text-muted-foreground py-12">
                    No leaderboard data yet
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
