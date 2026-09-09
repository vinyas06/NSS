import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, UserPlus, Upload, Trash2, Ban, CheckCircle, User, Loader2, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import api, { fileUrl, uploadFile, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ name: "", usn: "", email: "", branch: "", year: "", role_type: "volunteer", photo_path: null });
  const [csv, setCsv] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/members", { params: { q } }).then((r) => setMembers(r.data)).finally(() => setLoading(false));
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const addMember = async () => {
    try {
      await api.post("/admin/members", form);
      toast.success("Member added. Default password = USN");
      setAddModal(false);
      setForm({ name: "", usn: "", email: "", branch: "", year: "", role_type: "volunteer", photo_path: null });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const importCsv = async () => {
    if (!csv) return;
    const fd = new FormData();
    fd.append("file", csv);
    try {
      const { data } = await api.post("/admin/members/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Imported ${data.added}, skipped ${data.skipped}`);
      setCsv(null);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const suspend = async (id, mode) => {
    const end = mode === "temp" ? new Date(Date.now() + 30 * 864e5).toISOString() : null;
    await api.patch(`/admin/members/${id}/suspend`, { mode, end });
    toast.success("Updated");
    load();
    if (detail) openDetail(id);
  };

  const del = async (id) => {
    if (!window.confirm("Delete this member?")) return;
    await api.delete(`/admin/members/${id}`);
    toast.success("Deleted");
    load();
  };

  const openDetail = async (id) => {
    const { data } = await api.get(`/admin/members/${id}`);
    setDetail(data);
  };

  const uploadPhoto = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const { path } = await uploadFile(f, "photos");
    setForm({ ...form, photo_path: path });
    toast.success("Photo uploaded");
  };

  return (
    <AdminLayout title="Members">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name or USN..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="members-search" />
        </div>
        <label className="inline-flex">
          <Button variant="outline" asChild={false} onClick={() => document.getElementById("csv-input").click()} data-testid="members-csv-btn"><Upload className="h-4 w-4 mr-1" />CSV Import</Button>
          <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={(e) => setCsv(e.target.files[0])} />
        </label>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => setAddModal(true)} data-testid="members-add-btn"><UserPlus className="h-4 w-4 mr-1" />Add Member</Button>
      </div>

      {csv && (
        <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between" data-testid="csv-confirm">
          <span className="text-sm text-blue-800">Import <b>{csv.name}</b>? (columns: name, usn, email, branch, year)</span>
          <div className="flex gap-2"><Button size="sm" onClick={importCsv} data-testid="csv-confirm-btn">Confirm Import</Button><Button size="sm" variant="ghost" onClick={() => setCsv(null)}>Cancel</Button></div>
        </div>
      )}

      {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-3 text-sm text-slate-500 border-b border-slate-100 dark:border-slate-800">{members.length} members</div>
          {members.map((m) => (
            <div key={m.id} data-testid={`member-row-${m.id}`} className="flex items-center gap-4 px-5 py-3 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden grid place-items-center shrink-0">
                {m.photo_path ? <img src={fileUrl(m.photo_path)} alt="" className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(m.id)}>
                <div className="font-semibold text-slate-900 dark:text-white truncate">{m.name}</div>
                <div className="text-xs text-slate-400 font-mono">{m.usn || m.email}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${m.membership_status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{m.membership_status}</span>
              <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 capitalize">{m.role_type || m.role}</span>
              <div className="flex gap-1">
                {m.membership_status === "active" ? (
                  <Button size="icon" variant="ghost" onClick={() => suspend(m.id, "temp")} title="Suspend" data-testid={`member-suspend-${m.id}`}><Ban className="h-4 w-4 text-amber-500" /></Button>
                ) : (
                  <Button size="icon" variant="ghost" onClick={() => suspend(m.id, "active")} title="Reactivate" data-testid={`member-activate-${m.id}`}><CheckCircle className="h-4 w-4 text-emerald-500" /></Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => del(m.id)} data-testid={`member-delete-${m.id}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
              </div>
            </div>
          ))}
          {members.length === 0 && <div className="p-10 text-center text-slate-400">No members found.</div>}
        </div>
      )}

      {/* Add modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent data-testid="member-add-modal">
          <DialogHeader><DialogTitle>Add NSS Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-slate-100 overflow-hidden grid place-items-center">{form.photo_path ? <img src={fileUrl(form.photo_path)} alt="" className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-slate-400" />}</div>
              <label><Button size="sm" variant="outline" onClick={() => document.getElementById("mphoto").click()}>Upload Photo</Button><input id="mphoto" type="file" accept="image/*" className="hidden" onChange={uploadPhoto} /></label>
            </div>
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="member-form-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>USN *</Label><Input value={form.usn} onChange={(e) => setForm({ ...form, usn: e.target.value })} data-testid="member-form-usn" /></div>
              <div><Label>Email *</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="member-form-email" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Branch</Label><Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></div>
              <div><Label>Year</Label><Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
              <div><Label>Type</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.role_type} onChange={(e) => setForm({ ...form, role_type: e.target.value })}>
                  <option value="volunteer">Volunteer</option><option value="core">Core Member</option><option value="teacher">Teacher</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-400">Default password will be the USN. Member must change it on first login.</p>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={addMember} data-testid="member-form-submit">Add Member</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent data-testid="member-detail-modal">
          {detail && (
            <>
              <DialogHeader><DialogTitle>{detail.name}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <Info l="USN" v={detail.usn} /><Info l="Email" v={detail.email} />
                  <Info l="Branch" v={detail.branch} /><Info l="Year" v={detail.year} />
                  <Info l="Joined" v={detail.joined_year} /><Info l="Status" v={detail.membership_status} />
                </div>
                <div><div className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Events ({detail.registrations?.length || 0})</div>{(detail.registrations || []).map((r) => <div key={r.id} className="text-xs text-slate-500">• {r.event_name} — {r.status}</div>)}</div>
                <div><div className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Certificates ({detail.certificates?.length || 0})</div>{(detail.certificates || []).map((c) => <div key={c.id} className="text-xs text-slate-500">• {c.certificate_number}</div>)}</div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => suspend(detail.id, "perm")} className="text-rose-600" data-testid="member-detail-suspend-perm">Permanent Suspend</Button>
                  <Button size="sm" variant="outline" onClick={() => suspend(detail.id, "active")} data-testid="member-detail-activate">Set Active</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

const Info = ({ l, v }) => <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2"><div className="text-xs text-slate-400">{l}</div><div className="font-medium text-slate-800 dark:text-slate-200">{v || "—"}</div></div>;
