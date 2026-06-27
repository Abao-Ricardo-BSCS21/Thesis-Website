"use client";

import { Suspense, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OtpInput } from "@/components/auth/otp-input";
import { useOtp } from "@/hooks/use-otp";
import type { OtpPurposeType } from "@/lib/constants/otp";
import { toast } from "sonner";

import { AUTH_PENDING_KEY } from "@/lib/constants/auth";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const studentId = searchParams.get("studentId") || "";
  const purpose = (searchParams.get("purpose") || "REGISTRATION") as OtpPurposeType;
  const maskedPhone = searchParams.get("maskedPhone") || "";
  const expiresAt = searchParams.get("expiresAt");
  const resendAvailableAt = searchParams.get("resendAvailableAt");

  const completeSignIn = useCallback(async () => {
    const pending = sessionStorage.getItem(AUTH_PENDING_KEY);
    if (!pending) {
      toast.success("Phone verified! Please sign in.");
      router.push("/login");
      return;
    }

    try {
      const { studentId: sid, password } = JSON.parse(pending) as {
        studentId: string;
        password: string;
      };
      sessionStorage.removeItem(AUTH_PENDING_KEY);

      const result = await signIn("credentials", {
        identifier: sid,
        password,
        loginType: "student",
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        router.push("/login");
        return;
      }

      toast.success("Welcome to FilCycle!");
      router.push("/student");
    } catch {
      toast.error("Sign in failed. Please log in manually.");
      router.push("/login");
    }
  }, [router]);

  const handleVerified = useCallback(() => {
    if (purpose === "REWARD_REDEMPTION" || purpose === "CHANGE_PHONE" || purpose === "RESET_PASSWORD" || purpose === "NEW_DEVICE") {
      toast.success("Action verified!");
      router.back();
      return;
    }
    setTimeout(() => completeSignIn(), 1200);
  }, [purpose, completeSignIn, router]);

  const {
    otp,
    setOtp,
    loading,
    resending,
    error,
    success,
    countdown,
    resendCountdown,
    formatTime,
    verify,
    resend,
    canResend,
    isExpired,
  } = useOtp({
    studentId,
    purpose,
    expiresAt,
    resendAvailableAt,
    onVerified: handleVerified,
  });

  useEffect(() => {
    if (!studentId) {
      router.replace("/login");
    }
  }, [studentId, router]);

  const handleVerify = async () => {
    const ok = await verify();
    if (ok) toast.success("Verification successful!");
  };

  const handleResend = async () => {
    const ok = await resend();
    if (ok) toast.success("New OTP sent!");
  };

  const title =
    purpose === "REGISTRATION"
      ? "Verify Your Phone"
      : purpose === "PHONE_VERIFICATION"
        ? "Complete Verification"
        : "Security Verification";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F172A] p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(126,217,87,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(27,94,32,0.08),transparent_40%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>

        <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7ED957]/10">
              <ShieldCheck className="text-[#7ED957]" size={28} />
            </div>
            <CardTitle className="text-2xl text-white">{title}</CardTitle>
            <CardDescription className="text-slate-400">
              {maskedPhone
                ? `Enter the 6-digit code sent to ${maskedPhone}`
                : "Enter the 6-digit code sent to your phone"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#7ED957]/20"
                  >
                    <ShieldCheck className="text-[#7ED957]" size={40} />
                  </motion.div>
                  <p className="text-lg font-semibold text-[#7ED957]">Verified!</p>
                  <p className="text-sm text-slate-400">Redirecting you now...</p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="mb-6">
                    <OtpInput
                      value={otp}
                      onChange={setOtp}
                      disabled={loading || isExpired}
                      error={!!error}
                    />
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 text-center text-sm text-red-400"
                      >
                        {error}
                      </motion.p>
                    )}
                  </div>

                  <div className="mb-6 text-center">
                    <p className="text-sm text-slate-400">Code expires in</p>
                    <p
                      className={`text-2xl font-mono font-bold tabular-nums ${
                        countdown <= 60 ? "text-red-400" : "text-[#7ED957]"
                      }`}
                    >
                      {formatTime(countdown)}
                    </p>
                    {isExpired && (
                      <p className="mt-1 text-xs text-red-400">OTP expired — request a new code</p>
                    )}
                  </div>

                  <Button
                    className="w-full bg-[#7ED957] text-[#0F172A] hover:bg-[#6bc84a] font-semibold"
                    disabled={loading || otp.length !== 6 || isExpired}
                    onClick={handleVerify}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Verifying...
                      </>
                    ) : (
                      "Verify OTP"
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    className="mt-3 w-full text-slate-300 hover:text-white hover:bg-white/5"
                    disabled={!canResend}
                    onClick={handleResend}
                  >
                    {resending ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Sending...
                      </>
                    ) : resendCountdown > 0 ? (
                      <>
                        <RefreshCw size={16} />
                        Resend in {resendCountdown}s
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        Resend OTP
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border-t border-white/10 pt-4 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-[#7ED957] transition-colors"
              >
                <ArrowLeft size={14} />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
          <Loader2 className="animate-spin text-[#7ED957]" size={32} />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
