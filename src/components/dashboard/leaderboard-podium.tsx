"use client";

import { motion } from "framer-motion";
import { Trophy, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface LeaderboardEntry {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  bottlesRecycled: number;
  rewardPoints: number;
  rank?: number | null;
  profilePicture?: string | null;
  course?: string;
}

interface PodiumProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardPodium({ entries }: PodiumProps) {
  const top3 = entries.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]];

  const heights = ["h-24", "h-32", "h-20"];
  const delays = [0.3, 0.1, 0.5];
  const colors = [
    "from-gray-400 to-gray-500",
    "from-yellow-400 to-yellow-600",
    "from-amber-600 to-amber-800",
  ];
  const medals = ["🥈", "🥇", "🥉"];

  if (top3.length < 3) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        Not enough data for podium
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center gap-4 py-8">
      {podiumOrder.map((entry, i) => {
        if (!entry) return null;
        const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3;
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delays[i], duration: 0.6, type: "spring" }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
            >
              <Avatar className="mb-2 h-16 w-16 ring-4 ring-primary/30">
                <AvatarImage src={entry.profilePicture ?? undefined} />
                <AvatarFallback>
                  {getInitials(entry.firstName, entry.lastName)}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <span className="text-2xl mb-1">{medals[i]}</span>
            <p className="text-sm font-semibold text-center max-w-[100px] truncate">
              {entry.firstName}
            </p>
            <p className="text-xs text-primary font-bold">
              {entry.bottlesRecycled} bottles
            </p>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              transition={{ delay: delays[i] + 0.2, duration: 0.5 }}
              className={`mt-2 w-24 ${heights[i]} rounded-t-xl bg-gradient-to-t ${colors[i]} flex items-center justify-center`}
            >
              <span className="text-2xl font-bold text-white">{actualRank}</span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  startRank?: number;
}

export function LeaderboardList({ entries, startRank = 4 }: LeaderboardListProps) {
  const rest = entries.slice(3);

  if (!rest.length) return null;

  return (
    <div className="space-y-2">
      {rest.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-4 rounded-xl bg-card/50 p-4 hover:bg-card transition-colors"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-sm font-bold">
            {startRank + i}
          </span>
          <Avatar className="h-10 w-10">
            <AvatarImage src={entry.profilePicture ?? undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(entry.firstName, entry.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {entry.firstName} {entry.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{entry.studentId}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-primary">{entry.bottlesRecycled}</p>
            <p className="text-xs text-muted-foreground">bottles</p>
          </div>
          <Trophy size={16} className="text-muted-foreground" />
        </motion.div>
      ))}
    </div>
  );
}

export function AchievementBadge({
  name,
  icon,
  description,
  unlocked,
}: {
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: unlocked ? 1.05 : 1 }}
      className={`relative flex flex-col items-center rounded-2xl p-4 text-center transition-all ${
        unlocked
          ? "bg-primary/10 border border-primary/30"
          : "bg-muted/20 border border-border/30 opacity-50 grayscale"
      }`}
    >
      <div className="mb-2 text-3xl">{icon}</div>
      <p className="text-sm font-semibold">{name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs"
        >
          <Medal size={12} className="text-primary-foreground" />
        </motion.div>
      )}
    </motion.div>
  );
}
