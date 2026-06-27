"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, getInitials } from "@/lib/utils";
import { toast } from "sonner";

interface UserRecord {
  id: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  role: { name: "STUDENT" | "STAFF" | "ADMINISTRATOR" };
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    course: string;
    year: number;
    rewardPoints: number;
    bottlesRecycled: number;
  } | null;
}

type TabRole = "all" | "STUDENT" | "STAFF" | "ADMINISTRATOR";

const emptyStudentForm = {
  role: "STUDENT" as const,
  studentId: "",
  firstName: "",
  lastName: "",
  email: "",
  course: "",
  year: 1,
  password: "student123",
};

const emptyStaffForm = {
  role: "STAFF" as "STAFF" | "ADMINISTRATOR",
  email: "",
  password: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabRole>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [formMode, setFormMode] = useState<"STUDENT" | "STAFF">("STUDENT");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = (mode: "STUDENT" | "STAFF") => {
    setEditingUser(null);
    setFormMode(mode);
    setStudentForm(emptyStudentForm);
    setStaffForm({ ...emptyStaffForm, role: mode === "STAFF" ? "STAFF" : "STAFF" });
    setDialogOpen(true);
  };

  const openEdit = (user: UserRecord) => {
    setEditingUser(user);
    if (user.role.name === "STUDENT" && user.student) {
      setFormMode("STUDENT");
      setStudentForm({
        role: "STUDENT",
        studentId: user.student.studentId,
        firstName: user.student.firstName,
        lastName: user.student.lastName,
        email: user.email ?? "",
        course: user.student.course,
        year: user.student.year,
        password: "",
      });
    } else {
      setFormMode("STAFF");
      setStaffForm({
        role: user.role.name as "STAFF" | "ADMINISTRATOR",
        email: user.email ?? "",
        password: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const isEdit = !!editingUser;
      const url = isEdit ? `/api/users/${editingUser.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      let body: Record<string, unknown>;

      if (formMode === "STUDENT") {
        body = isEdit
          ? {
              studentId: studentForm.studentId,
              firstName: studentForm.firstName,
              lastName: studentForm.lastName,
              email: studentForm.email || null,
              course: studentForm.course,
              year: studentForm.year,
              ...(studentForm.password ? { password: studentForm.password } : {}),
            }
          : { ...studentForm, email: studentForm.email || undefined };
      } else {
        body = isEdit
          ? {
              email: staffForm.email,
              role: staffForm.role,
              ...(staffForm.password ? { password: staffForm.password } : {}),
            }
          : staffForm;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(isEdit ? "User updated" : "User created");
        setDialogOpen(false);
        fetchUsers();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: UserRecord) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(user.isActive ? "User deactivated" : "User activated");
      fetchUsers();
    } else {
      toast.error(data.error);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("User deleted");
        setDeleteDialogOpen(false);
        setDeletingUser(null);
        fetchUsers();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchesTab = tab === "all" || u.role.name === tab;
    const q = search.toLowerCase();
    const name = u.student
      ? `${u.student.firstName} ${u.student.lastName}`.toLowerCase()
      : "";
    const matchesSearch =
      !q ||
      name.includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.student?.studentId.includes(q) ||
      u.role.name.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      STUDENT: "bg-primary/10 text-primary",
      STAFF: "bg-blue-500/10 text-blue-400",
      ADMINISTRATOR: "bg-yellow-500/10 text-yellow-400",
    };
    return (
      <span
        className={cn(
          "rounded-lg px-2 py-0.5 text-xs font-medium capitalize",
          styles[role] ?? "bg-muted/30"
        )}
      >
        {role.toLowerCase()}
      </span>
    );
  };

  const displayName = (user: UserRecord) =>
    user.student
      ? `${user.student.firstName} ${user.student.lastName}`
      : user.email ?? "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">{users.length} total users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate("STUDENT")} className="gap-2">
            <GraduationCap size={16} />
            Add Student
          </Button>
          <Button onClick={() => openCreate("STAFF")} className="gap-2">
            <Plus size={16} />
            Add Staff/Admin
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabRole)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="STUDENT">Students</TabsTrigger>
            <TabsTrigger value="STAFF">Staff</TabsTrigger>
            <TabsTrigger value="ADMINISTRATOR">Admins</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {filtered.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">No users found</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filtered.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar>
                            <AvatarFallback>
                              {user.student
                                ? getInitials(user.student.firstName, user.student.lastName)
                                : user.email?.charAt(0).toUpperCase() ?? "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium truncate">{displayName(user)}</p>
                              {roleBadge(user.role.name)}
                              {!user.isActive && (
                                <span className="rounded-lg bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {user.student
                                ? `${user.student.studentId} · ${user.student.course} · Year ${user.student.year}`
                                : user.email}
                            </p>
                            {user.student && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {user.student.bottlesRecycled} bottles · {user.student.rewardPoints} pts
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 sm:shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(user)}
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(user)}
                            title={user.isActive ? "Deactivate" : "Activate"}
                          >
                            {user.isActive ? (
                              <UserX size={16} className="text-muted-foreground" />
                            ) : (
                              <UserCheck size={16} className="text-primary" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingUser(user);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : formMode === "STUDENT" ? "Add Student" : "Add Staff / Admin"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user details below."
                : "Fill in the details to create a new account."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {formMode === "STUDENT" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Student ID</Label>
                    <Input
                      value={studentForm.studentId}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, studentId: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={studentForm.firstName}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, firstName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={studentForm.lastName}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, lastName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <Input
                      value={studentForm.course}
                      onChange={(e) => setStudentForm({ ...studentForm, course: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      min={1}
                      max={6}
                      value={studentForm.year}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, year: parseInt(e.target.value) || 1 })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{editingUser ? "New Password (optional)" : "Password"}</Label>
                  <Input
                    type="password"
                    value={studentForm.password}
                    onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                    placeholder={editingUser ? "Leave blank to keep current" : "Min. 6 characters"}
                    required={!editingUser}
                    minLength={editingUser ? undefined : 6}
                  />
                </div>
              </>
            ) : (
              <>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      value={staffForm.role}
                      onChange={(e) =>
                        setStaffForm({
                          ...staffForm,
                          role: e.target.value as "STAFF" | "ADMINISTRATOR",
                        })
                      }
                    >
                      <option value="STAFF">Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>
                )}
                {editingUser && editingUser.role.name !== "STUDENT" && (
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      value={staffForm.role}
                      onChange={(e) =>
                        setStaffForm({
                          ...staffForm,
                          role: e.target.value as "STAFF" | "ADMINISTRATOR",
                        })
                      }
                    >
                      <option value="STAFF">Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{editingUser ? "New Password (optional)" : "Password"}</Label>
                  <Input
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    placeholder={editingUser ? "Leave blank to keep current" : "Min. 6 characters"}
                    required={!editingUser}
                    minLength={editingUser ? undefined : 6}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : editingUser ? (
                  "Save Changes"
                ) : (
                  "Create User"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingUser ? displayName(deletingUser) : ""}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
