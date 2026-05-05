"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createUser, deleteUser, getUsers, updateUser, type ManagedUser } from "@/lib/users-api";

const PAGE_SIZE = 10;

type FormState = {
  id: number | null;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  password: string;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  email: "",
  phone: "",
  role: "Admin",
  is_active: true,
  password: "",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function roleBadgeClass(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("super")) return "bg-amber-500/10 text-amber-700 border-amber-200";
  return "bg-blue-500/10 text-blue-700 border-blue-200";
}

function statusBadgeClass(isActive: boolean) {
  return isActive
    ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
    : "bg-zinc-500/10 text-zinc-700 border-zinc-200";
}

export default function UsersView() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await getUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return users.filter((user) => {
      if (!query) return true;
      return [user.name, user.email, user.role, user.phone ?? ""].some((value) => value.toLowerCase().includes(query));
    });
  }, [search, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    { label: "TOTAL", value: users.length },
    { label: "ADMIN", value: users.filter((user) => user.role.toLowerCase() === "admin").length },
    { label: "SUPER ADMIN", value: users.filter((user) => user.role.toLowerCase().includes("super")).length },
    { label: "ACTIVE", value: users.filter((user) => user.is_active).length },
    { label: "INACTIVE", value: users.filter((user) => !user.is_active).length },
  ];

  const openCreate = () => {
    setForm(emptyForm);
    setCreatedPassword(null);
    setShowForm(true);
  };

  const openEdit = (user: ManagedUser) => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
      is_active: user.is_active,
      password: "",
    });
    setCreatedPassword(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.role.trim()) {
      setError("Name, email and role are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (form.id) {
        await updateUser(form.id, {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          role: form.role,
          is_active: form.is_active,
          password: form.password.trim() || undefined,
        });
      } else {
        const created = await createUser({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          role: form.role,
          is_active: form.is_active,
          password: form.password.trim() || undefined,
        });
        if (created) {
          setCreatedPassword(created.tempPassword ?? (form.password.trim() || "Temporary password was generated on the server."));
        }
      }

      setShowForm(false);
      setForm(emptyForm);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const deletedId = deleteTarget.id;
      // 1. Perform backend deletion
      await deleteUser(deletedId);
      
      // 2. Clear from local state immediately
      setUsers((prev) => prev.filter((user) => user.id !== deletedId));
      setDeleteTarget(null);
      
      // 3. No need to call fetchData() immediately; the local filter ensures accuracy.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    try {
      setError(null);
      await updateUser(user.id, { is_active: !user.is_active });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user status");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Super Admin can create, edit, and remove user accounts here.</p>
        </div>
        <Button size="sm" className="bg-odg-orange text-white hover:brightness-95" onClick={openCreate}>
          <Plus size={15} className="mr-2" /> Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
            <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or role"
            className="w-full pl-9 pr-4 h-9 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} /> <span className="font-medium">{error}</span>
        </div>
      )}

      {createdPassword && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          New account created. Temporary password: <span className="font-semibold">{createdPassword}</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.2fr_1.4fr_0.9fr_0.9fr_0.9fr_1fr_40px] gap-3 px-6 py-3 border-b border-border bg-muted/30">
          {["NAME", "EMAIL", "ROLE", "STATUS", "PHONE", "JOINED", ""].map((column) => (
            <span key={column} className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{column}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading users…
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          <div className="divide-y divide-border">
            {pageItems.map((user) => (
              <div key={user.id} className="hover:bg-muted/30 transition-colors">
                <div className="hidden sm:grid grid-cols-[1.2fr_1.4fr_0.9fr_0.9fr_0.9fr_1fr_40px] gap-3 items-center px-6 py-4">
                  <div>
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">ID #{user.id}</p>
                  </div>
                  <span className="text-sm text-muted-foreground truncate">{user.email}</span>
                  <Badge variant="outline" className={cn("w-fit", roleBadgeClass(user.role))}>{user.role}</Badge>
                  <Badge variant="outline" className={cn("w-fit", statusBadgeClass(user.is_active))}>{user.is_active ? "Active" : "Inactive"}</Badge>
                  <span className="text-sm text-muted-foreground truncate">{user.phone || "-"}</span>
                  <span className="text-sm text-muted-foreground">{formatDate(user.created_at)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground"><MoreHorizontal size={15} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => openEdit(user)}>
                        <Pencil size={13} className="mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handleToggleStatus(user)}>
                        {user.is_active ? "Deactivate User" : "Activate User"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteTarget(user)}>
                        <Trash2 size={13} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="sm:hidden px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("w-fit", roleBadgeClass(user.role))}>{user.role}</Badge>
                      <Badge variant="outline" className={cn("w-fit", statusBadgeClass(user.is_active))}>{user.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{user.phone || "No phone"}</span>
                    <span className="ml-auto">{formatDate(user.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage((prev) => prev - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50"><ChevronLeft size={14} /></button>
              <span className="text-xs font-semibold px-2">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((prev) => prev + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>Set the name, email, role, and optional temporary password.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Full name" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="user@company.com" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Optional phone number" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <select
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="Admin">Admin</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Account Status</Label>
              <select
                value={form.is_active ? "active" : "inactive"}
                onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.value === "active" }))}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Temporary Password</Label>
              <Input value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} placeholder="Leave blank to auto-generate" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}{form.id ? "Save Changes" : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>This account will be permanently removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? <Loader2 size={14} className="animate-spin mr-2" /> : null}Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
