"use client";

import { useEffect, useState } from "react";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { Recycle, Award, Users, Monitor } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportSummary {
  totalTransactions: number;
  bottlesRecycled: number;
  pointsDistributed: number;
  plasticCollectedKg: number;
  rewardsRedeemed: number;
  activeStudents: number;
  machinesOnline: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSummary(d.data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    if (format === "csv") {
      window.open(`/api/reports?period=${period}&format=csv`, "_blank");
      return;
    }

    if (format === "excel") {
      import("xlsx").then((XLSX) => {
        fetch(`/api/reports?period=${period}`)
          .then((r) => r.json())
          .then((d) => {
            if (!d.success) return;
            const ws = XLSX.utils.json_to_sheet(
              d.data.transactions.map(
                (t: {
                  createdAt: string;
                  student: { studentId: string; firstName: string; lastName: string };
                  bottleCount: number;
                  pointsEarned: number;
                  weightKg: number;
                }) => ({
                  Date: new Date(t.createdAt).toLocaleString(),
                  "Student ID": t.student.studentId,
                  Name: `${t.student.firstName} ${t.student.lastName}`,
                  Bottles: t.bottleCount,
                  Points: t.pointsEarned,
                  "Weight (kg)": t.weightKg ?? 0,
                })
              )
            );
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Report");
            XLSX.writeFile(wb, `filcycle-report-${period}.xlsx`);
          });
      });
      return;
    }

    if (format === "pdf") {
      import("jspdf").then(({ jsPDF }) => {
        import("jspdf-autotable").then(() => {
          fetch(`/api/reports?period=${period}`)
            .then((r) => r.json())
            .then((d) => {
              if (!d.success) return;
              const doc = new jsPDF();
              doc.setFontSize(18);
              doc.text("FilCycle Recycling Report — Filamer Christian University", 14, 20);
              doc.setFontSize(11);
              doc.text(`Period: ${period}`, 14, 30);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (doc as any).autoTable({
                startY: 40,
                head: [["Date", "Student ID", "Bottles", "Points"]],
                body: d.data.transactions.map(
                  (t: {
                    createdAt: string;
                    student: { studentId: string };
                    bottleCount: number;
                    pointsEarned: number;
                  }) => [
                    new Date(t.createdAt).toLocaleDateString(),
                    t.student.studentId,
                    t.bottleCount,
                    t.pointsEarned,
                  ]
                ),
              });
              doc.save(`filcycle-report-${period}.pdf`);
            });
        });
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and export recycling reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="gap-1">
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")} className="gap-1">
            <FileSpreadsheet size={14} /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} className="gap-1">
            <FileText size={14} /> PDF
          </Button>
        </div>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>
        <TabsContent value={period}>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : summary ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Bottles Recycled" value={summary.bottlesRecycled} icon={Recycle} />
              <StatCard title="Points Distributed" value={summary.pointsDistributed} icon={Award} />
              <StatCard title="Active Students" value={summary.activeStudents} icon={Users} />
              <StatCard title="Machines Online" value={summary.machinesOnline} icon={Monitor} />
            </div>
          ) : null}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {summary ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Plastic Collected</p>
                    <p className="text-2xl font-bold">{summary.plasticCollectedKg.toFixed(2)} kg</p>
                  </div>
                  <div className="rounded-xl bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Rewards Redeemed</p>
                    <p className="text-2xl font-bold">{summary.rewardsRedeemed}</p>
                  </div>
                  <div className="rounded-xl bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl font-bold">{summary.totalTransactions}</p>
                  </div>
                  <div className="rounded-xl bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Report Period</p>
                    <p className="text-2xl font-bold capitalize">{period}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No report data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
