"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  bottleCount: number;
  pointsEarned: number;
  createdAt: string;
  student: { firstName: string; lastName: string; studentId: string };
  machine: { name: string } | null;
}

export default function StaffTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTransactions(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">Monitor all recycling transactions</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border/50">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {tx.student.firstName} {tx.student.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tx.student.studentId} · {formatDateTime(tx.createdAt)}
                    {tx.machine && ` · ${tx.machine.name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">+{tx.pointsEarned} pts</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {tx.type.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
              </div>
            ))}
            {!transactions.length && (
              <p className="text-center text-muted-foreground py-12">No transactions</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
