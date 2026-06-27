"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Gift, Coffee, ShoppingBag, DollarSign, GraduationCap, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfettiTrigger } from "@/components/ui/animated-counter";
import { ActionOtpDialog } from "@/components/auth/action-otp-dialog";
import { toast } from "sonner";

interface Reward {
  id: string;
  name: string;
  description: string;
  category: string;
  pointsCost: number;
  stock: number;
  imageUrl: string | null;
}

const categoryIcons: Record<string, React.ElementType> = {
  COFFEE_VOUCHER: Coffee,
  MERCHANDISE: ShoppingBag,
  CASH: DollarSign,
  UNIVERSITY_POINTS: GraduationCap,
  GIFT_CARD: CreditCard,
};

export default function RewardsPage({ canRedeem = true }: { canRedeem?: boolean }) {
  const { data: session } = useSession();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingRewardId, setPendingRewardId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rewards")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRewards(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRedeem = async (rewardId: string) => {
    setRedeeming(rewardId);
    try {
      const res = await fetch("/api/rewards?action=redeem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      const data = await res.json();
      if (data.success) {
        setShowConfetti(true);
        toast.success("Reward claimed! Pending staff approval.");
        setTimeout(() => setShowConfetti(false), 3000);
      } else if (data.code === "OTP_REQUIRED") {
        setPendingRewardId(rewardId);
        setOtpOpen(true);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to redeem reward");
    } finally {
      setRedeeming(null);
    }
  };

  const handleOtpVerified = () => {
    if (pendingRewardId) {
      handleRedeem(pendingRewardId);
      setPendingRewardId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfettiTrigger trigger={showConfetti} />
      {session?.user?.studentId && (
        <ActionOtpDialog
          open={otpOpen}
          onOpenChange={setOtpOpen}
          studentId={session.user.studentId}
          purpose="REWARD_REDEMPTION"
          onVerified={handleOtpVerified}
        />
      )}
      <div>
        <h1 className="text-2xl font-bold">Reward Catalog</h1>
        <p className="text-muted-foreground">Redeem your points for exclusive rewards</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((reward) => {
          const Icon = categoryIcons[reward.category] ?? Gift;
          return (
            <Card key={reward.id} className="card-hover overflow-hidden">
              <div className="flex h-24 items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <Icon className="text-primary" size={40} />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{reward.name}</CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {reward.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-primary">
                      {reward.pointsCost} pts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reward.stock} in stock
                    </p>
                  </div>
                  {canRedeem && (
                    <Button
                      size="sm"
                      disabled={reward.stock <= 0 || redeeming === reward.id}
                      onClick={() => handleRedeem(reward.id)}
                    >
                      {redeeming === reward.id ? "Claiming..." : "Redeem"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!rewards.length && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No rewards available
          </p>
        )}
      </div>
    </div>
  );
}
