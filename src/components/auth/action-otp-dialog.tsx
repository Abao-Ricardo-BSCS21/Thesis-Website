"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/auth/otp-input";
import { useOtp } from "@/hooks/use-otp";
import { OTP_CONFIG } from "@/lib/constants/otp";
import { toast } from "sonner";

interface ActionOtpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  purpose: "REWARD_REDEMPTION" | "RESET_PASSWORD" | "NEW_DEVICE";
  onVerified: () => void;
}

export function ActionOtpDialog({
  open,
  onOpenChange,
  studentId,
  purpose,
  onVerified,
}: ActionOtpDialogProps) {
  const [requested, setRequested] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [requesting, setRequesting] = useState(false);

  const {
    otp,
    setOtp,
    loading,
    resending,
    error,
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
    onVerified: () => {
      toast.success("Verified!");
      onVerified();
      onOpenChange(false);
    },
  });

  const requestOtp = async () => {
    setRequesting(true);
    try {
      const res = await fetch("/api/auth/otp/request-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to send OTP");
        return;
      }
      setMaskedEmail(data.data.maskedEmail);
      setRequested(true);
      toast.success("Verification code sent to your email");
    } catch {
      toast.error("Network error");
    } finally {
      setRequesting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (next && !requested) {
      requestOtp();
    }
    if (!next) {
      setRequested(false);
      setOtp("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-border/50 bg-card sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="text-primary" size={24} />
          </div>
          <DialogTitle className="text-center">Security Verification</DialogTitle>
          <DialogDescription className="text-center">
            {maskedEmail
              ? `Enter the code sent to ${maskedEmail}`
              : "Confirm this action with a one-time code from your email"}
          </DialogDescription>
        </DialogHeader>

        {requesting ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : requested ? (
          <div className="space-y-4">
            <OtpInput
              value={otp}
              onChange={setOtp}
              length={OTP_CONFIG.LENGTH}
              disabled={loading || isExpired}
              error={!!error}
            />
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
            <p className="text-center text-sm text-muted-foreground">
              Expires in{" "}
              <span className="font-mono font-semibold text-primary">{formatTime(countdown)}</span>
            </p>
            <Button
              className="w-full"
              disabled={loading || otp.length !== OTP_CONFIG.LENGTH || isExpired}
              onClick={() => verify()}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Verify & Continue"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={!canResend}
              onClick={async () => {
                const ok = await resend();
                if (ok) toast.success("New code sent");
              }}
            >
              {resending
                ? "Sending..."
                : resendCountdown > 0
                  ? `Resend in ${resendCountdown}s`
                  : "Resend Code"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
