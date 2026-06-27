"use client";

import { Recycle, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: "text-lg" },
  md: { icon: 32, text: "text-xl" },
  lg: { icon: 48, text: "text-3xl" },
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-md" />
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
          <Recycle className="text-white" size={s.icon * 0.55} strokeWidth={2.5} />
          <Leaf
            className="absolute -right-0.5 -top-0.5 text-white/90"
            size={s.icon * 0.35}
            fill="currentColor"
          />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold tracking-tight text-foreground", s.text)}>
            Fil<span className="text-primary">Cycle</span>
          </span>
          {size === "lg" && (
            <span className="text-xs text-muted-foreground">
              Recycle Smart. Earn Rewards.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
