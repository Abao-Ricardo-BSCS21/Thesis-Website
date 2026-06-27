"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Gift, ClipboardList, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface Redemption {
  id: string;
  pointsUsed: number;
  status: string;
  createdAt: string;
  student: { firstName: string; lastName: string; studentId: string };
  reward: { name: string };
}

export default function StaffDashboard() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [transactions, setTransactions] = useState<unknown[]>([]);
  const [students, setStudents] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/transactions?limit=5").then((r) => r.json()),
      fetch("/api/students").then((r) => r.json()),
    ])
      .then(([txRes, studentsRes]) => {
        if (studentsRes.success) setStudents(studentsRes.data);
        if (txRes.success) setTransactions(txRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/transactions?limit=100")
      .then((r) => r.json())
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPendingRedemptions();
  }, []);

  const fetchPendingRedemptions = () => {
    fetch("/api/transactions?limit=1")
      .catch(() => {});
    // Fetch redemptions via rewards endpoint - we need a dedicated endpoint
    // For now use prisma via a custom fetch - let's add redemptions to an API
    fetch("/api/staff/redemptions")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRedemptions(d.data);
      })
      .catch(() => setRedemptions([]));
  };

  const handleApprove = async (id: string, status: "APPROVED" | "REJECTED") => {
    const res = await fetch(`/api/rewards?action=approve&id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`Redemption ${status.toLowerCase()}`);
      fetchPendingRedemptions();
    } else {
      toast.error(data.error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const pendingCount = redemptions.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Dashboard</h1>
        <p className="text-muted-foreground">Monitor operations and approve rewards</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pending Approvals" value={pendingCount} icon={Clock} />
        <StatCard title="Total Students" value={students.length as number} icon={Users} />
        <StatCard title="Recent Transactions" value={transactions.length as number} icon={ClipboardList} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift size={18} className="text-primary" />
            Pending Reward Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {redemptions
              .filter((r) => r.status === "PENDING")
              .map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{r.reward.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.student.firstName} {r.student.lastName} ({r.student.studentId})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.pointsUsed} points · {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(r.id, "APPROVED")}
                      className="gap-1"
                    >
                      <CheckCircle size={14} />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleApprove(r.id, "REJECTED")}
                      className="gap-1"
                    >
                      <XCircle size={14} />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            {!redemptions.filter((r) => r.status === "PENDING").length && (
              <p className="text-center text-muted-foreground py-8">
                No pending approvals
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
