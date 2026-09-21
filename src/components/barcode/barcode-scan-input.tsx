"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScanBarcode, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BarcodeScanInputProps {
  onScan: (code: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * HID-ready barcode capture: USB scanners type characters then Enter.
 * Manual typing works the same way until a physical scanner is available.
 */
export function BarcodeScanInput({
  onScan,
  disabled,
  placeholder = "Scan barcode or type code, then Enter",
  className,
  autoFocus = true,
}: BarcodeScanInputProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRef.current?.focus();
    }
  }, [autoFocus, disabled]);

  const submit = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code || submitting || disabled) return;
      setSubmitting(true);
      try {
        await onScan(code);
        setValue("");
      } finally {
        setSubmitting(false);
        inputRef.current?.focus();
      }
    },
    [onScan, submitting, disabled]
  );

  return (
    <form
      className={cn("flex gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(value);
      }}
    >
      <div className="relative flex-1">
        <ScanBarcode
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          disabled={disabled || submitting}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="pl-10 font-mono tracking-wide"
          aria-label="Barcode scan input"
        />
      </div>
      <Button type="submit" disabled={disabled || submitting || !value.trim()}>
        {submitting ? <Loader2 className="animate-spin" size={18} /> : "Identify"}
      </Button>
    </form>
  );
}
