"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ScanBarcode,
  UserCheck,
  XCircle,
  History,
  Trash2,
  Loader2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { BarcodeScanInput } from "@/components/barcode/barcode-scan-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatDateTime } from "@/lib/utils";

interface MatchedStudent {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  course: string;
  year: number;
  rewardPoints: number;
  bottlesRecycled: number;
  barcodeId: string | null;
}

interface ScanRecord {
  id: string;
  code: string;
  success: boolean;
  student: MatchedStudent | null;
  error: string | null;
  scannedAt: Date;
}

interface SampleStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  barcodeId: string | null;
  course: string;
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function BarcodeTestPage({
  studentOnly = false,
}: {
  studentOnly?: boolean;
}) {
  const [lastScan, setLastScan] = useState<ScanRecord | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [samples, setSamples] = useState<SampleStudent[]>([]);
  const [myBarcode, setMyBarcode] = useState<string | null>(null);

  useEffect(() => {
    if (studentOnly) {
      fetch("/api/students/barcode")
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setMyBarcode(d.data.barcodeId);
        })
        .catch(() => {});
      return;
    }

    fetch("/api/barcode/samples")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSamples(d.data);
      })
      .catch(() => {});
  }, [studentOnly]);

  const handleScan = useCallback(async (code: string) => {
    setLookingUp(true);
    const scannedAt = new Date();

    try {
      const res = await fetch("/api/barcode/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      const record: ScanRecord = {
        id: makeId(),
        code: code.trim().toUpperCase(),
        success: Boolean(data.success),
        student: data.success ? data.data.student : null,
        error: data.success ? null : data.error || "Lookup failed",
        scannedAt,
      };

      setLastScan(record);
      setHistory((prev) => [record, ...prev].slice(0, 20));

      if (data.success) {
        toast.success(
          `Matched: ${data.data.student.firstName} ${data.data.student.lastName}`
        );
      } else {
        toast.error(data.error || "No matching student found");
      }
    } catch {
      const record: ScanRecord = {
        id: makeId(),
        code: code.trim().toUpperCase(),
        success: false,
        student: null,
        error: "Network error — could not reach server",
        scannedAt,
      };
      setLastScan(record);
      setHistory((prev) => [record, ...prev].slice(0, 20));
      toast.error("Lookup request failed");
    } finally {
      setLookingUp(false);
    }
  }, []);

  const tryCode = (code: string) => {
    void handleScan(code);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setLastScan(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Barcode Scanner Test</h1>
        <p className="text-muted-foreground">
          Scan or type a FilCycle barcode to verify it matches a registered
          student in the database. You can also type a{" "}
          <strong>Student ID</strong> (e.g. 2021-10001) for testing.
        </p>
        {studentOnly && (
          <p className="mt-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Student mode: you can only verify your own barcode sticker here.
            {myBarcode && (
              <>
                {" "}
                Your code:{" "}
                <button
                  type="button"
                  className="font-mono text-primary underline"
                  onClick={() => tryCode(myBarcode)}
                >
                  {myBarcode}
                </button>
              </>
            )}
          </p>
        )}
      </div>

      {!studentOnly && samples.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registered test codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Click a code below to test lookup, or scan the printed sticker.
            </p>
            <div className="divide-y divide-border/50 rounded-xl border border-border/50">
              {samples.map((s) => (
                <div
                  key={s.studentId}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.studentId} · {s.course}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                      {s.barcodeId}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => s.barcodeId && tryCode(s.barcodeId)}
                    >
                      Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => s.barcodeId && copyCode(s.barcodeId)}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanBarcode size={18} className="text-primary" />
            Scanner input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            USB barcode scanners act like a keyboard: they type the code and
            press Enter. Click the field below, then scan — or paste/type a code
            manually and click <strong>Identify</strong>.
          </p>
          <BarcodeScanInput
            onScan={handleScan}
            disabled={lookingUp}
            placeholder="Focus here, then scan sticker or type FC code + Enter"
          />
          <p className="text-xs text-muted-foreground">
            Accepted: FilCycle barcode (
            <code className="font-mono">FC</code> + 10 chars) or Student ID (
            <code className="font-mono">2021-10001</code>)
          </p>
        </CardContent>
      </Card>

      <Card
        className={
          lookingUp
            ? "border-primary/30"
            : lastScan
              ? lastScan.success
                ? "border-primary/40 bg-primary/5"
                : "border-destructive/40 bg-destructive/5"
              : ""
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {lookingUp ? (
              <Loader2 size={18} className="animate-spin text-primary" />
            ) : lastScan?.success ? (
              <CheckCircle2 size={18} className="text-primary" />
            ) : lastScan ? (
              <XCircle size={18} className="text-destructive" />
            ) : (
              <UserCheck size={18} className="text-muted-foreground" />
            )}
            Lookup result
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lookingUp ? (
            <p className="py-8 text-center text-muted-foreground">
              Looking up in database...
            </p>
          ) : !lastScan ? (
            <p className="py-8 text-center text-muted-foreground">
              No scan yet. Scan a student barcode to see the matched identity.
            </p>
          ) : lastScan.success && lastScan.student ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Avatar className="h-16 w-16 ring-4 ring-primary/20">
                <AvatarFallback className="text-lg">
                  {getInitials(
                    lastScan.student.firstName,
                    lastScan.student.lastName
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-lg font-semibold">
                    {lastScan.student.firstName} {lastScan.student.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Registered student found in database
                  </p>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Student ID</dt>
                    <dd className="font-mono font-medium">
                      {lastScan.student.studentId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Barcode ID</dt>
                    <dd className="font-mono font-medium">
                      {lastScan.student.barcodeId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Course / Year</dt>
                    <dd>
                      {lastScan.student.course} · Year {lastScan.student.year}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Database ID</dt>
                    <dd className="truncate font-mono text-xs">
                      {lastScan.student.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Reward points</dt>
                    <dd>{lastScan.student.rewardPoints}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Bottles recycled</dt>
                    <dd>{lastScan.student.bottlesRecycled}</dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">
                  Scanned code:{" "}
                  <span className="font-mono">{lastScan.code}</span> ·{" "}
                  {formatDateTime(lastScan.scannedAt)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-4 text-center">
              <p className="font-medium text-destructive">No match found</p>
              <p className="text-sm text-muted-foreground">
                {lastScan.error ||
                  "This barcode is not registered to any active student."}
              </p>
              <p className="font-mono text-sm">{lastScan.code}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History size={18} />
            Scan history
          </CardTitle>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearHistory} className="gap-1">
              <Trash2 size={14} />
              Clear
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Recent scans will appear here (last 20).
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono">{item.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.success && item.student
                        ? `${item.student.firstName} ${item.student.lastName} (${item.student.studentId})`
                        : item.error || "Not found"}
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    {item.success ? (
                      <CheckCircle2 size={16} className="text-primary" />
                    ) : (
                      <XCircle size={16} className="text-destructive" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.scannedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
