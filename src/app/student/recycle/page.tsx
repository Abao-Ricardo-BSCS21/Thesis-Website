"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Recycle,
  Loader2,
  CheckCircle2,
  XCircle,
  Cpu,
  Thermometer,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConfettiTrigger } from "@/components/ui/animated-counter";
import { toast } from "sonner";

type SubmissionState = "idle" | "validating" | "accepted" | "rejected";

export default function RecyclePage() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [result, setResult] = useState<{
    pointsEarned?: number;
    totalPoints?: number;
    totalBottles?: number;
    weightGrams?: number;
    newAchievement?: { name: string; icon: string } | null;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleInsertBottle = async () => {
    setState("validating");
    setResult(null);
    setShowConfetti(false);

    try {
      const res = await fetch("/api/bottles/submit", { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        setState("rejected");
        toast.error(data.error || "Bottle rejected");
        return;
      }

      setState("accepted");
      setResult(data.data);
      setShowConfetti(true);
      toast.success(`+${data.data.pointsEarned} points earned!`);

      if (data.data.newAchievement) {
        toast.success(`Achievement unlocked: ${data.data.newAchievement.name}!`, {
          duration: 5000,
        });
      }
    } catch {
      setState("rejected");
      toast.error("Submission failed");
    }
  };

  useEffect(() => {
    if (state === "accepted" || state === "rejected") {
      const timer = setTimeout(() => {
        setState("idle");
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ConfettiTrigger trigger={showConfetti} />

      <div>
        <h1 className="text-2xl font-bold">Recycle Bottle</h1>
        <p className="text-muted-foreground">
          Insert a plastic bottle to earn reward points
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative flex flex-col items-center justify-center bg-gradient-to-b from-card to-background p-12">
            {/* Machine visualization */}
            <motion.div
              animate={
                state === "validating"
                  ? { scale: [1, 1.02, 1], rotate: [0, 1, -1, 0] }
                  : state === "accepted"
                    ? { scale: [1, 1.1, 1] }
                    : {}
              }
              transition={{ repeat: state === "validating" ? Infinity : 0, duration: 1 }}
              className="relative mb-8"
            >
              <div className="flex h-48 w-48 items-center justify-center rounded-3xl border-2 border-primary/30 bg-card shadow-2xl shadow-primary/10">
                {state === "idle" && (
                  <Recycle className="text-primary" size={64} strokeWidth={1.5} />
                )}
                {state === "validating" && (
                  <Loader2 className="text-primary animate-spin" size={64} />
                )}
                {state === "accepted" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                  >
                    <CheckCircle2 className="text-primary" size={64} />
                  </motion.div>
                )}
                {state === "rejected" && (
                  <XCircle className="text-destructive" size={64} />
                )}
              </div>

              {state === "validating" && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  className="absolute -bottom-4 left-0 right-0 h-1 bg-primary/30 rounded-full overflow-hidden"
                >
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="h-full w-1/3 bg-primary rounded-full"
                  />
                </motion.div>
              )}
            </motion.div>

            <p className="mb-2 text-lg font-semibold">
              {state === "idle" && "Ready to Recycle"}
              {state === "validating" && "Validating Bottle..."}
              {state === "accepted" && "Bottle Accepted!"}
              {state === "rejected" && "Bottle Rejected"}
            </p>
            <p className="mb-8 text-sm text-muted-foreground text-center">
              {state === "idle" && "Place your PET plastic bottle and click Insert Bottle"}
              {state === "validating" && "Sensors are checking material and weight"}
              {state === "accepted" && result && `+${result.pointsEarned} points added to your account`}
              {state === "rejected" && "Invalid material or bottle could not be verified"}
            </p>

            <Button
              size="lg"
              onClick={handleInsertBottle}
              disabled={state === "validating"}
              className="gap-2 px-8"
            >
              {state === "validating" ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Processing...
                </>
              ) : (
                <>
                  <Recycle size={18} />
                  Insert Bottle
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && state === "accepted" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">+{result.pointsEarned}</p>
              <p className="text-xs text-muted-foreground">Points Earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{result.totalBottles}</p>
              <p className="text-xs text-muted-foreground">Total Bottles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{result.totalPoints}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu size={18} className="text-primary" />
            Machine Sensors (Simulated)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "IR Sensor", status: "Active", icon: Gauge },
            { label: "Load Cell", status: "Active", icon: Gauge },
            { label: "Ultrasonic", status: "Active", icon: Gauge },
            { label: "Material Detection", status: "Active", icon: Gauge },
          ].map((sensor) => (
            <div key={sensor.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <sensor.icon size={16} className="text-muted-foreground" />
                <span className="text-sm">{sensor.label}</span>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {sensor.status}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Thermometer size={16} className="text-muted-foreground" />
              <span className="text-sm">Temperature</span>
            </div>
            <span className="text-sm">24.5°C</span>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Storage Capacity</span>
              <span>127/500</span>
            </div>
            <Progress value={25.4} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
