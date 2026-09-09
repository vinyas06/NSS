import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, Trash2, Loader2, Plus, ScrollText } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MODULES = ["members", "events", "gallery", "certificates", "attendance", "accounts"];

export default function SuperAdmin() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminModal, setAdminModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin", permissions: [], phone: "", branch: "", age: "", dob: "", usn: "", designation: "Core Member" });
  const [roleForm, setRoleForm] = useState({ name: "", description: "", permissions: [] });

  const load = () => {
    setLoading(true);
    Promise.all([api.get("/super-admin/admins"), api.get("/super-admin/roles"), api.get("/super-admin/audit-logs")])
      .then(([a, r, l]) => { setAdmins(a.data); setRoles(r.data); setLogs(l.data); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const togglePerm = (list, setList, key, p) => {
    const perms = list[key].includes(p) ? list[key].filter((x) => x !== p) : [...list[key], p];
    setList({ ...list, [key]: perms });
  };

  const createAdmin = async () => {
    try {
      await api.post("/super-admin/admins", { ...form, age: form.age ? Number(form.age) : null });
      toast.success("Admin created"); setAdminModal(false);
      setForm({ name: "", email: "", password: "", role: "admin", permissions: [], phone: "", branch: "", age: "", dob: "", usn: "", designation: "Core Member" }); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const delAdmin = async (id) => { if (!window.confirm("Delete this admin?")) return; try { await api.delete(`/super-admin/admins/${id}`); toast.success("Deleted"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  const createRole = async () => {
    try { await api.post("/super-admin/roles", roleForm); toast.success("Role created"); setRoleModal(false); setRoleForm({ name: "", description: "", permissions: [] }); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const delRole = async (id) => { await api.delete(`/super-admin/roles/${id}`); toast.success("Deleted"); load(); };

  return (
    <AdminLayout title="Super Admin">
      {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> : (
        <Tabs defaultValue="admins">
          <TabsList data-testid="super-tabs">
            <TabsTrigger value="admins" data-testid="tab-admins">Admin Users</TabsTrigger>
            <TabsTrigger value="roles" data-testid="tab-roles">Roles</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="admins" className="mt-4">
            <div className="flex justify-end mb-4"><Button className="bg-red-600 hover:bg-red-700" onClick={() => setAdminModal(true)} data-testid="admin-create-btn"><UserPlus className="h-4 w-4 mr-1" />Add Admin</Button></div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {admins.map((a) => (
                <div key={a.id} data-testid={`admin-row-${a.id}`} className="flex items-center justify-between px-5 py-3 border-b border-slate-50 dark:border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full grid place-items-center ${a.role === "super_admin" ? "bg-red-600" : "bg-blue-600"} text-white`}><ShieldCheck className="h-4 w-4" /></div>
                    <div><div className="font-medium text-sm text-slate-900 dark:text-white">{a.name}</div><div className="text-xs text-slate-400">{a.email}</div></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${a.role === "super_admin" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{a.role.replace("_", " ")}</span>
                    <span className="hidden md:inline text-xs text-slate-400">{a.role === "super_admin" ? "all modules" : (a.permissions || []).join(", ") || "none"}</span>
                    {a.id !== user.id && <Button size="icon" variant="ghost" onClick={() => delAdmin(a.id)} data-testid={`admin-delete-${a.id}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <div className="flex justify-end mb-4"><Button className="bg-red-600 hover:bg-red-700" onClick={() => setRoleModal(true)} data-testid="role-create-btn"><Plus className="h-4 w-4 mr-1" />Create Role</Button></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((r) => (
                <div key={r.id} data-testid={`role-${r.id}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900 dark:text-white">{r.name}</h3><Button size="icon" variant="ghost" onClick={() => delRole(r.id)}><Trash2 className="h-4 w-4 text-rose-400" /></Button></div>
                  <p className="text-sm text-slate-400 mt-1">{r.description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">{(r.permissions || []).map((p) => <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{p}</span>)}</div>
                </div>
              ))}
              {roles.length === 0 && <p className="text-slate-400 text-sm">No roles created yet. Example: a "Media Team" role with only gallery access.</p>}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-50 dark:border-slate-800/50 text-sm">
                  <ScrollText className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-xs text-red-600">{l.action}</span>
                  <span className="text-slate-500 truncate flex-1">by {l.actor_name} → {l.target}</span>
                  <span className="text-xs text-slate-300">{l.created_at?.slice(0, 16).replace("T", " ")}</span>
                </div>
              ))}
              {logs.length === 0 && <div className="p-10 text-center text-slate-400">No audit logs yet.</div>}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Admin modal */}
      <Dialog open={adminModal} onOpenChange={setAdminModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="admin-modal">
          <DialogHeader><DialogTitle>Add Admin / Super Admin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="admin-form-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email *</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="admin-form-email" /></div>
              <div><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="admin-form-password" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Age</Label><Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
              <div><Label>DOB</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
              <div><Label>USN</Label><Input value={form.usn} onChange={(e) => setForm({ ...form, usn: e.target.value })} /></div>
              <div className="col-span-2"><Label>Branch</Label><Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></div>
            </div>
            <div><Label>Designation</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} data-testid="admin-form-designation">
                {["Programme Officer", "Faculty Coordinator", "NSS Secretary", "Core Member", "Teacher", "Student Volunteer"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><Label>Role</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="admin-form-role">
                <option value="admin">Admin</option><option value="super_admin">Super Admin</option>
              </select>
            </div>
            {form.role === "admin" && (
              <div>
                <Label>Module Permissions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {MODULES.map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm capitalize"><Checkbox checked={form.permissions.includes(m)} onCheckedChange={() => togglePerm(form, setForm, "permissions", m)} data-testid={`perm-${m}`} />{m}</label>
                  ))}
                </div>
              </div>
            )}
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={createAdmin} data-testid="admin-form-submit">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role modal */}
      <Dialog open={roleModal} onOpenChange={setRoleModal}>
        <DialogContent data-testid="role-modal">
          <DialogHeader><DialogTitle>Create Role</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Role Name *</Label><Input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g. Media Team" data-testid="role-form-name" /></div>
            <div><Label>Description</Label><Input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} /></div>
            <div>
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {MODULES.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm capitalize"><Checkbox checked={roleForm.permissions.includes(m)} onCheckedChange={() => togglePerm(roleForm, setRoleForm, "permissions", m)} data-testid={`role-perm-${m}`} />{m}</label>
                ))}
              </div>
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={createRole} data-testid="role-form-submit">Create Role</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
