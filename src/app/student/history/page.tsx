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
  weightKg: number | null;
  status: string;
  createdAt: string;
  machine: { name: string; location: string } | null;
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions?limit=50")
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
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">Your complete recycling activity log</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border/50">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium capitalize">
                    {tx.type.replace(/_/g, " ").toLowerCase()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(tx.createdAt)}
                    {tx.machine && ` · ${tx.machine.name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      tx.pointsEarned >= 0 ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {tx.pointsEarned >= 0 ? "+" : ""}
                    {tx.pointsEarned} pts
                  </p>
                  {tx.bottleCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {tx.bottleCount} bottle(s)
                    </p>
                  )}
                </div>
              </div>
            ))}
            {!transactions.length && (
              <p className="text-center text-muted-foreground py-12">
                No transactions yet
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
