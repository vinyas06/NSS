import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, User, Pencil } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import api, { fileUrl, uploadFile, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATS = ["Programme Officer", "Faculty", "Core Team", "Volunteer"];
const EMPTY = { name: "", role: "", category: "Core Team", photo: null, order: 99 };

export default function AdminTeam() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = () => { setLoading(true); api.get("/team").then((r) => setTeam(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openNew = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (m) => { setForm({ ...EMPTY, ...m }); setEditId(m.id); setModal(true); };

  const uploadPhoto = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const { path } = await uploadFile(f, "team"); setForm({ ...form, photo: path }); toast.success("Photo uploaded");
  };

  const save = async () => {
    try {
      const payload = { ...form, order: Number(form.order) || 99 };
      if (editId) await api.patch(`/admin/team/${editId}`, payload);
      else await api.post("/admin/team", payload);
      toast.success(editId ? "Updated" : "Added"); setModal(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const del = async (id) => { if (!window.confirm("Remove team member?")) return; await api.delete(`/admin/team/${id}`); toast.success("Removed"); load(); };

  return (
    <AdminLayout title="Team">
      <div className="flex justify-end mb-6"><Button className="bg-red-600 hover:bg-red-700" onClick={openNew} data-testid="team-add-btn"><Plus className="h-4 w-4 mr-1" />Add Team Member</Button></div>
      {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {team.map((m) => (
            <div key={m.id} data-testid={`admin-team-${m.id}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-center">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-red-500 to-blue-700 grid place-items-center overflow-hidden">
                {m.photo ? <img src={fileUrl(m.photo)} alt="" className="w-full h-full object-cover" /> : <User className="h-8 w-8 text-white" />}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mt-3">{m.name}</h3>
              <p className="text-sm text-red-600">{m.role}</p>
              <p className="text-xs text-slate-400">{m.category}</p>
              <div className="flex gap-1 justify-center mt-3">
                <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(m.id)} data-testid={`team-delete-${m.id}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
              </div>
            </div>
          ))}
          {team.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">No team members yet.</p>}
        </div>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent data-testid="team-form-modal">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Team Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-slate-100 overflow-hidden grid place-items-center">{form.photo ? <img src={fileUrl(form.photo)} alt="" className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-slate-400" />}</div>
              <label><Button size="sm" variant="outline" onClick={() => document.getElementById("tphoto").click()}>Upload Photo</Button><input id="tphoto" type="file" accept="image/*" className="hidden" onChange={uploadPhoto} /></label>
            </div>
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="team-form-name" /></div>
            <div><Label>Role / Designation *</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. NSS Programme Officer" data-testid="team-form-role" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><Label>Display Order</Label><Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></div>
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={save} data-testid="team-form-submit">{editId ? "Save" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
