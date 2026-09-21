"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Recycle,
  Loader2,
  CheckCircle2,
  XCircle,
  Cpu,
  Thermometer,
  Gauge,
  ScanBarcode,
  LogOut,
  Sticker,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConfettiTrigger } from "@/components/ui/animated-counter";
import { BarcodeScanInput } from "@/components/barcode/barcode-scan-input";
import { toast } from "sonner";
import { BARCODE_CONFIG } from "@/lib/constants/barcode";

type SubmissionState = "idle" | "validating" | "accepted" | "rejected";

interface ScannedStudent {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  barcodeId: string | null;
  rewardPoints: number;
  bottlesRecycled: number;
}

export default function RecyclePage() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [scannedStudent, setScannedStudent] = useState<ScannedStudent | null>(
    null
  );
  const [sessionEndsAt, setSessionEndsAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<{
    pointsEarned?: number;
    totalPoints?: number;
    totalBottles?: number;
    weightGrams?: number;
    newAchievement?: { name: string; icon: string } | null;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearSession = useCallback(() => {
    setScannedStudent(null);
    setSessionEndsAt(null);
    setSecondsLeft(0);
    setState("idle");
    setResult(null);
  }, []);

  useEffect(() => {
    if (!sessionEndsAt) {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      return;
    }

    const tick = () => {
      const left = Math.max(0, Math.ceil((sessionEndsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearSession();
        toast.message("Barcode session expired — scan again to continue");
      }
    };

    tick();
    sessionTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [sessionEndsAt, clearSession]);

  const handleScan = async (code: string) => {
    const res = await fetch("/api/barcode/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();

    if (!data.success) {
      toast.error(data.error || "Barcode not recognized");
      return;
    }

    const student = data.data.student as ScannedStudent;
    const minutes =
      (data.data.sessionMinutes as number) ?? BARCODE_CONFIG.SESSION_MINUTES;

    setScannedStudent(student);
    setSessionEndsAt(Date.now() + minutes * 60 * 1000);
    setState("idle");
    setResult(null);
    toast.success(`Welcome, ${student.firstName}! Ready to recycle.`);
  };

  const handleInsertBottle = async () => {
    if (!scannedStudent?.barcodeId) {
      toast.error("Scan your barcode sticker first");
      return;
    }

    setState("validating");
    setResult(null);
    setShowConfetti(false);

    try {
      const res = await fetch("/api/bottles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcodeId: scannedStudent.barcodeId }),
      });
      const data = await res.json();

      if (!data.success) {
        setState("rejected");
        toast.error(data.error || "Bottle rejected");
        return;
      }

      setState("accepted");
      setResult(data.data);
      setShowConfetti(true);
      setScannedStudent((prev) =>
        prev
          ? {
              ...prev,
              rewardPoints: data.data.totalPoints ?? prev.rewardPoints,
              bottlesRecycled: data.data.totalBottles ?? prev.bottlesRecycled,
            }
          : prev
      );
      toast.success(`+${data.data.pointsEarned} points earned!`);

      if (data.data.newAchievement) {
        toast.success(
          `Achievement unlocked: ${data.data.newAchievement.name}!`,
          { duration: 5000 }
        );
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

  const formatCountdown = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ConfettiTrigger trigger={showConfetti} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recycle Bottle</h1>
          <p className="text-muted-foreground">
            Scan your ID sticker, then insert a PET bottle to earn points
          </p>
        </div>
        <Link href="/student/barcode">
          <Button variant="outline" size="sm" className="gap-2">
            <Sticker size={16} />
            Print barcode
          </Button>
        </Link>
      </div>

      {!scannedStudent ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanBarcode size={18} className="text-primary" />
              Identify with barcode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use a USB barcode scanner (when available) or type/paste your
              FilCycle code and press Enter. Same input works for both.
            </p>
            <BarcodeScanInput onScan={handleScan} />
            <p className="text-xs text-muted-foreground">
              Need a sticker?{" "}
              <Link href="/student/barcode" className="text-primary underline">
                Print your barcode
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  {scannedStudent.firstName} {scannedStudent.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {scannedStudent.studentId} · {scannedStudent.rewardPoints} pts ·{" "}
                  {scannedStudent.bottlesRecycled} bottles
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-primary">
                  Session {formatCountdown(secondsLeft)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={clearSession}
                >
                  <LogOut size={14} />
                  End
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative flex flex-col items-center justify-center bg-gradient-to-b from-card to-background p-12">
                <motion.div
                  animate={
                    state === "validating"
                      ? { scale: [1, 1.02, 1], rotate: [0, 1, -1, 0] }
                      : state === "accepted"
                        ? { scale: [1, 1.1, 1] }
                        : {}
                  }
                  transition={{
                    repeat: state === "validating" ? Infinity : 0,
                    duration: 1,
                  }}
                  className="relative mb-8"
                >
                  <div className="flex h-48 w-48 items-center justify-center rounded-3xl border-2 border-primary/30 bg-card shadow-2xl shadow-primary/10">
                    {state === "idle" && (
                      <Recycle
                        className="text-primary"
                        size={64}
                        strokeWidth={1.5}
                      />
                    )}
                    {state === "validating" && (
                      <Loader2 className="animate-spin text-primary" size={64} />
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
                      className="absolute -bottom-4 left-0 right-0 h-1 overflow-hidden rounded-full bg-primary/30"
                    >
                      <motion.div
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="h-full w-1/3 rounded-full bg-primary"
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
                <p className="mb-8 text-center text-sm text-muted-foreground">
                  {state === "idle" &&
                    "Place your PET plastic bottle and click Insert Bottle"}
                  {state === "validating" &&
                    "Sensors are checking material and weight"}
                  {state === "accepted" &&
                    result &&
                    `+${result.pointsEarned} points added to your account`}
                  {state === "rejected" &&
                    "Invalid material or bottle could not be verified"}
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
        </>
      )}

      {result && state === "accepted" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                +{result.pointsEarned}
              </p>
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
          <CardTitle className="flex items-center gap-2 text-base">
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
            { label: "Barcode Scanner", status: "HID ready", icon: ScanBarcode },
          ].map((sensor) => (
            <div
              key={sensor.label}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <sensor.icon size={16} className="text-muted-foreground" />
                <span className="text-sm">{sensor.label}</span>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {sensor.status}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border/50 pt-2">
            <div className="flex items-center gap-2">
              <Thermometer size={16} className="text-muted-foreground" />
              <span className="text-sm">Temperature</span>
            </div>
            <span className="text-sm">24.5°C</span>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm">
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
