"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, Printer, RefreshCw, Sticker } from "lucide-react";
import { toast } from "sonner";
import { StudentBarcode } from "@/components/barcode/student-barcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BARCODE_CONFIG } from "@/lib/constants/barcode";

interface BarcodePayload {
  barcodeId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  course: string;
  year: number;
  format: string;
  sessionMinutes: number;
}

export default function StudentBarcodePage() {
  const [data, setData] = useState<BarcodePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const stickerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students/barcode");
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to load barcode");
        return;
      }
      setData(json.data);
    } catch {
      toast.error("Failed to load barcode");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRegenerate = async () => {
    if (
      !confirm(
        "Generate a new barcode? Your old sticker will stop working at the machine."
      )
    ) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await fetch("/api/students/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Could not regenerate barcode");
        return;
      }
      setData(json.data);
      toast.success("New barcode ready — print a fresh sticker");
    } catch {
      toast.error("Could not regenerate barcode");
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    const svg = stickerRef.current?.querySelector("svg");
    if (!svg || !data) {
      toast.error("Barcode not ready");
      return;
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const pad = 24;
      canvas.width = img.width + pad * 2;
      canvas.height = img.height + pad * 2 + 48;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad);
      ctx.fillStyle = "#111111";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `${data.firstName} ${data.lastName} · ${data.studentId}`,
        canvas.width / 2,
        canvas.height - 16
      );

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(pngBlob);
        a.download = `filcycle-barcode-${data.studentId}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Could not export barcode image");
    };
    img.src = url;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.barcodeId) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Could not load your barcode
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="no-print">
        <h1 className="text-2xl font-bold">My Recycling Barcode</h1>
        <p className="text-muted-foreground">
          Print this sticker and attach it to your school ID. Scan it at the
          machine to recycle without typing your account.
        </p>
      </div>

      <Card className="overflow-hidden print:border-0 print:shadow-none">
        <CardHeader className="no-print">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sticker size={18} className="text-primary" />
            Sticker preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={stickerRef}
            id="filcycle-barcode-sticker"
            className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white p-6 text-black"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-700 uppercase">
              FilCycle
            </p>
            <StudentBarcode value={data.barcodeId} height={72} />
            <div className="text-center">
              <p className="text-sm font-semibold">
                {data.firstName} {data.lastName}
              </p>
              <p className="font-mono text-xs text-neutral-600">
                {data.studentId} · {data.course} Y{data.year}
              </p>
            </div>
            <p className="text-[10px] text-neutral-500">
              Stick on the back of your ID · {BARCODE_CONFIG.FORMAT}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 no-print">
            <Button onClick={handlePrint} className="gap-2">
              <Printer size={16} />
              Print sticker
            </Button>
            <Button variant="outline" onClick={handleDownloadPng} className="gap-2">
              <Download size={16} />
              Download PNG
            </Button>
            <Button
              variant="ghost"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="gap-2"
            >
              {regenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Replace barcode
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
          <p>
            After you buy a USB barcode scanner, plug it into the machine PC —
            it will type into the Recycle page the same way as manual entry.
          </p>
          <p>
            A successful scan unlocks recycling for about{" "}
            {data.sessionMinutes} minutes on that machine session.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
