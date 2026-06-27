"use client";

import { useEffect, useState } from "react";
import {
  Monitor,
  Thermometer,
  Cpu,
  HardDrive,
  Wrench,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

interface Machine {
  id: string;
  name: string;
  location: string;
  status: string;
  bottleCapacity: number;
  bottlesStored: number;
  motorStatus: string;
  temperature: number;
  lastMaintenance: string | null;
  logs: { id: string; level: string; message: string; createdAt: string }[];
}

export default function MachineMonitorPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [hardware, setHardware] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/machine")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMachines(d.data.machines);
          setHardware(d.data.hardware);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetch("/api/machine", { method: "POST" }).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "text-primary";
      case "MAINTENANCE":
        return "text-yellow-500";
      default:
        return "text-destructive";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Machine Monitoring</h1>
        <p className="text-muted-foreground">IoT dashboard — simulated hardware interface</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {machines.map((machine) => {
          const capacityPercent =
            (machine.bottlesStored / machine.bottleCapacity) * 100;
          return (
            <Card key={machine.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor size={18} className="text-primary" />
                    {machine.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{machine.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      machine.status === "ONLINE"
                        ? "bg-primary animate-pulse"
                        : machine.status === "MAINTENANCE"
                          ? "bg-yellow-500"
                          : "bg-destructive"
                    }`}
                  />
                  <span className={`text-sm font-medium capitalize ${statusColor(machine.status)}`}>
                    {machine.status.toLowerCase()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-muted/20 p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <HardDrive size={14} />
                      <span className="text-xs">Storage</span>
                    </div>
                    <p className="text-lg font-bold">
                      {machine.bottlesStored}/{machine.bottleCapacity}
                    </p>
                    <Progress value={capacityPercent} className="mt-2" />
                  </div>
                  <div className="rounded-xl bg-muted/20 p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Thermometer size={14} />
                      <span className="text-xs">Temperature</span>
                    </div>
                    <p className="text-lg font-bold">{machine.temperature}°C</p>
                  </div>
                  <div className="rounded-xl bg-muted/20 p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Cpu size={14} />
                      <span className="text-xs">Motor</span>
                    </div>
                    <p className="text-lg font-bold">{machine.motorStatus}</p>
                  </div>
                  <div className="rounded-xl bg-muted/20 p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Wrench size={14} />
                      <span className="text-xs">Last Maintenance</span>
                    </div>
                    <p className="text-sm font-bold">
                      {machine.lastMaintenance
                        ? formatDateTime(machine.lastMaintenance)
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Activity size={14} />
                    Recent Logs
                  </p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {machine.logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-2 text-xs rounded-lg bg-muted/10 p-2"
                      >
                        <span
                          className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                            log.level === "ERROR" || log.level === "CRITICAL"
                              ? "bg-destructive"
                              : log.level === "WARNING"
                                ? "bg-yellow-500"
                                : "bg-primary"
                          }`}
                        />
                        <div>
                          <p>{log.message}</p>
                          <p className="text-muted-foreground">
                            {formatDateTime(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {!machine.logs.length && (
                      <p className="text-muted-foreground text-xs">No logs</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hardware && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Hardware Interface Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Simulated module ready for Arduino Mega / ESP32 integration
            </p>
            <pre className="rounded-xl bg-muted/20 p-4 text-xs overflow-x-auto">
              {JSON.stringify(hardware, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
