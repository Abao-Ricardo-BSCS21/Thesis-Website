"use client";

import { useCallback, useEffect, useState } from "react";
import { OTP_CONFIG } from "@/lib/constants/otp";
import type { OtpPurposeType } from "@/lib/constants/otp";

interface UseOtpOptions {
  studentId: string;
  purpose: OtpPurposeType;
  expiresAt?: string | null;
  resendAvailableAt?: string | null;
  onVerified?: () => void;
}

export function useOtp({
  studentId,
  purpose,
  expiresAt: initialExpiresAt,
  resendAvailableAt: initialResendAt,
  onVerified,
}: UseOtpOptions) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    initialExpiresAt ? new Date(initialExpiresAt) : null
  );
  const [resendAvailableAt, setResendAvailableAt] = useState<Date | null>(
    initialResendAt ? new Date(initialResendAt) : null
  );
  const [countdown, setCountdown] = useState(OTP_CONFIG.EXPIRY_MINUTES * 60);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (!expiresAt) {
      const defaultExpiry = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);
      setExpiresAt(defaultExpiry);
    }
  }, [expiresAt]);

  useEffect(() => {
    const tick = () => {
      if (expiresAt) {
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        setCountdown(remaining);
      }
      if (resendAvailableAt) {
        const resendRemaining = Math.max(
          0,
          Math.floor((resendAvailableAt.getTime() - Date.now()) / 1000)
        );
        setResendCountdown(resendRemaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, resendAvailableAt]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const verify = useCallback(async () => {
    if (otp.length !== OTP_CONFIG.LENGTH) {
      setError(`Please enter the complete ${OTP_CONFIG.LENGTH}-digit code`);
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, otp, purpose }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Verification failed");
        return false;
      }

      setSuccess(true);
      onVerified?.();
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [otp, studentId, purpose, onVerified]);

  const resend = useCallback(async () => {
    if (resendCountdown > 0) return false;

    setResending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, purpose }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to resend OTP");
        return false;
      }

      setOtp("");
      setExpiresAt(new Date(data.data.expiresAt));
      setResendAvailableAt(new Date(data.data.resendAvailableAt));
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setResending(false);
    }
  }, [studentId, purpose, resendCountdown]);

  return {
    otp,
    setOtp,
    loading,
    resending,
    error,
    setError,
    success,
    countdown,
    resendCountdown,
    formatTime,
    verify,
    resend,
    canResend: resendCountdown <= 0 && !resending,
    isExpired: countdown <= 0,
  };
}
