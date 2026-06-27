"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Webhook,
  Mail,
  MessageSquare,
  Pencil,
  Trash2,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  Zap,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  WEBHOOK_CHANNEL_LABELS,
  WEBHOOK_EVENT_LABELS,
  WEBHOOK_EVENTS_BY_CHANNEL,
} from "@/lib/constants/webhooks";
import type { WebhookChannel, WebhookEvent } from "@prisma/client";

interface WebhookRecord {
  id: string;
  name: string;
  channel: WebhookChannel;
  url: string;
  secret: string | null;
  events: WebhookEvent[];
  description: string | null;
  isActive: boolean;
  isPrimary: boolean;
  lastTriggeredAt: string | null;
  lastStatus: string | null;
  createdAt: string;
  _count?: { logs: number };
}

const emptyForm = {
  name: "",
  channel: "SMS" as WebhookChannel,
  url: "",
  secret: "",
  events: [] as WebhookEvent[],
  description: "",
  isActive: true,
  isPrimary: false,
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<WebhookChannel>("SMS");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<WebhookRecord | null>(null);
  const [deleting, setDeleting] = useState<WebhookRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [testRecipient, setTestRecipient] = useState("");

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/webhooks");
      const data = await res.json();
      if (data.success) setWebhooks(data.data);
    } catch {
      toast.error("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const filtered = webhooks.filter((w) => w.channel === tab);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, channel: tab, events: ["MANUAL_TEST"] });
    setDialogOpen(true);
  };

  const openEdit = (w: WebhookRecord) => {
    setEditing(w);
    setForm({
      name: w.name,
      channel: w.channel,
      url: w.url,
      secret: w.secret ?? "",
      events: w.events,
      description: w.description ?? "",
      isActive: w.isActive,
      isPrimary: w.isPrimary,
    });
    setDialogOpen(true);
  };

  const toggleEvent = (event: WebhookEvent) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.url || form.events.length === 0) {
      toast.error("Fill in name, URL, and at least one event");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/webhooks/${editing.id}` : "/api/admin/webhooks", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      let data: { success?: boolean; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        toast.error(`Save failed (server error ${res.status}). Restart the dev server.`);
        return;
      }

      if (!res.ok || !data?.success) {
        toast.error(data?.error || `Save failed (${res.status})`);
        return;
      }

      toast.success(editing ? "Webhook updated" : "Webhook created");
      setDialogOpen(false);
      fetchWebhooks();
    } catch {
      toast.error("Network error — could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/webhooks/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Delete failed");
        return;
      }
      toast.success("Webhook deleted");
      setDeleteOpen(false);
      setDeleting(null);
      fetchWebhooks();
    } catch {
      toast.error("Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (w: WebhookRecord) => {
    setTestingId(w.id);
    try {
      const body =
        w.channel === "SMS"
          ? { recipient: testRecipient || "+639171234567" }
          : { email: testRecipient || "admin@filamer.edu" };

      const res = await fetch(`/api/admin/webhooks/${w.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const payload = data.data;
      if (!data.success) {
        toast.error(data.error || "Test failed");
        return;
      }
      if (payload?.warning || payload?.result?.workflowProcessed === false) {
        toast.warning(
          payload?.warning ||
            "n8n responded but the workflow may not have processed the payload. Check n8n Executions.",
          { duration: 8000 }
        );
      } else {
        toast.success(`Webhook "${w.name}" processed by n8n — check Executions tab`);
      }
      fetchWebhooks();
    } catch {
      toast.error("Test failed");
    } finally {
      setTestingId(null);
    }
  };

  const copyPayload = () => {
    const sample = {
      event: "OTP_SEND",
      channel: tab,
      timestamp: new Date().toISOString(),
      source: "filcycle",
      data: {
        studentId: "2021-10001",
        phoneNumber: "+639171234567",
        otp: "123456",
        purpose: "REGISTRATION",
        message: "FilCycle: Your verification code is 123456...",
        email: "student@filamer.edu",
        subject: "FilCycle Verification Code",
      },
    };
    navigator.clipboard.writeText(JSON.stringify(sample, null, 2));
    toast.success("Sample payload copied");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="text-primary" size={24} />
            n8n Webhook Organizer
          </h1>
          <p className="text-muted-foreground">
            Connect SMS &amp; email workflows to your n8n automations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyPayload}>
            <Copy size={16} />
            Sample Payload
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} />
            Add Webhook
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">How it works with n8n</p>
          <p className="mb-2 text-amber-600 dark:text-amber-400">
            OTP SMS is sent through your <strong>n8n workflow</strong>, not directly from FilCycle.
            Configure your SMS provider API key inside n8n&apos;s <strong>Send SMS</strong> node.
            After a DB reset run{" "}
            <code className="text-xs">node scripts/setup-n8n-webhook.mjs</code>.
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Import <code>n8n/filcycle-sms-email-workflow.json</code> (Webhook → Extract → Send SMS
              → Respond)
            </li>
            <li>
              Set your SMS API key in the n8n <strong>Send SMS</strong> node, then{" "}
              <strong>activate</strong> the workflow
            </li>
            <li>
              Copy the Webhook <strong>Production URL</strong> (<code>/webhook/...</code>) here — mark
              as <strong>Primary</strong>
            </li>
            <li>Click Test, then check n8n Executions for the SMS step</li>
          </ol>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as WebhookChannel)}>
        <TabsList>
          <TabsTrigger value="SMS" className="gap-2">
            <MessageSquare size={16} />
            SMS ({webhooks.filter((w) => w.channel === "SMS").length})
          </TabsTrigger>
          <TabsTrigger value="EMAIL" className="gap-2">
            <Mail size={16} />
            Email ({webhooks.filter((w) => w.channel === "EMAIL").length})
          </TabsTrigger>
        </TabsList>

        {(["SMS", "EMAIL"] as WebhookChannel[]).map((channel) => (
          <TabsContent key={channel} value={channel} className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={
                  channel === "SMS" ? "Test phone (optional) e.g. 09171234567" : "Test email (optional)"
                }
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="max-w-xs"
              />
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <Webhook className="mb-3 text-muted-foreground" size={40} />
                  <p className="font-medium">No {WEBHOOK_CHANNEL_LABELS[channel]} webhooks yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your n8n webhook URL to automate {channel.toLowerCase()} delivery
                  </p>
                  <Button onClick={openCreate}>
                    <Plus size={16} />
                    Add Webhook
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filtered.map((w) => (
                <Card key={w.id} className={!w.isActive ? "opacity-60" : undefined}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {w.name}
                          {w.isPrimary && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Primary
                            </span>
                          )}
                          {!w.isActive && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Inactive</span>
                          )}
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground break-all">{w.url}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={testingId === w.id}
                          onClick={() => handleTest(w)}
                        >
                          {testingId === w.id ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Play size={14} />
                          )}
                          Test
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(w)}>
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleting(w);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(w.events as WebhookEvent[]).map((ev) => (
                        <span
                          key={ev}
                          className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                        >
                          {WEBHOOK_EVENT_LABELS[ev]}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {w.lastTriggeredAt ? (
                        <span className="flex items-center gap-1">
                          {w.lastStatus === "success" ? (
                            <CheckCircle2 size={12} className="text-primary" />
                          ) : (
                            <XCircle size={12} className="text-destructive" />
                          )}
                          Last run: {new Date(w.lastTriggeredAt).toLocaleString()} ({w.lastStatus})
                        </span>
                      ) : (
                        <span>Never triggered</span>
                      )}
                      {w._count && <span>{w._count.logs} log entries</span>}
                    </div>
                    {w.description && (
                      <p className="text-xs text-muted-foreground">{w.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Webhook" : "Add n8n Webhook"}</DialogTitle>
            <DialogDescription>
              Paste the n8n Webhook node <strong>Production URL</strong> (contains{" "}
              <code>/webhook/</code>, not <code>/webhook-test/</code>)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. OTP SMS Workflow"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>n8n Webhook URL</Label>
              <Input
                placeholder="https://your-n8n.app/webhook/..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Secret / API Key (optional)</Label>
              <Input
                type="password"
                placeholder="Sent as x-webhook-secret and Authorization header"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="What this workflow does"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger Events</Label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS_BY_CHANNEL[form.channel].map((ev) => (
                  <label
                    key={ev}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2 text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={form.events.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="rounded"
                    />
                    {WEBHOOK_EVENT_LABELS[ev]}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPrimary}
                  onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
                />
                <span className="flex items-center gap-1">
                  <Zap size={14} className="text-primary" />
                  Primary (used to deliver OTP SMS via n8n)
                </span>
              </label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : editing ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
            <DialogDescription>
              Remove &ldquo;{deleting?.name}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
