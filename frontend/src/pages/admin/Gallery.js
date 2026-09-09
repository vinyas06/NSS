import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Image as ImageIcon, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import api, { fileUrl, uploadFile, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATS = ["Blood Donation", "Swachh Bharat", "Annual Special Camp", "Health Camp", "Workshops"];
const EMPTY = { title: "", category: "Workshops", year: String(new Date().getFullYear()), drive_link: "", description: "", banner: null, photos: [] };

export default function AdminGallery() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => { setLoading(true); api.get("/galleries").then((r) => setGalleries(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openNew = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (g) => { setForm({ ...EMPTY, ...g }); setEditId(g.id); setModal(true); };

  const addPhotos = async (e) => {
    setBusy(true);
    const files = Array.from(e.target.files);
    const paths = [];
    for (const f of files) { const { path } = await uploadFile(f, "gallery"); paths.push(path); }
    setForm((prev) => ({ ...prev, photos: [...prev.photos, ...paths] }));
    setBusy(false); toast.success(`${paths.length} photos added`);
  };

  const setBanner = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const { path } = await uploadFile(f, "gallery"); setForm({ ...form, banner: path });
  };

  const save = async () => {
    try {
      const payload = { ...form, featured: form.photos.slice(0, 2) };
      if (editId) await api.patch(`/admin/galleries/${editId}`, payload);
      else await api.post("/admin/galleries", payload);
      toast.success(editId ? "Gallery updated" : "Gallery created"); setModal(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const del = async (id) => { if (!window.confirm("Delete gallery?")) return; await api.delete(`/admin/galleries/${id}`); toast.success("Deleted"); load(); };

  return (
    <AdminLayout title="Gallery">
      <div className="flex justify-end mb-6"><Button className="bg-red-600 hover:bg-red-700" onClick={openNew} data-testid="gallery-create-btn"><Plus className="h-4 w-4 mr-1" />Create Gallery</Button></div>
      {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleries.map((g) => (
            <div key={g.id} data-testid={`admin-gallery-${g.id}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <img src={fileUrl(g.banner) || fileUrl(g.photos?.[0])} alt="" className="h-32 w-full object-cover" />
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">{g.title}</h3>
                <div className="text-xs text-slate-400">{g.category} · {g.year} · {g.photos?.length || 0} photos</div>
                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(g)} data-testid={`gallery-edit-${g.id}`}>Edit</Button>
                  <Button size="icon" variant="ghost" onClick={() => del(g.id)} data-testid={`gallery-delete-${g.id}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="gallery-form-modal">
          <DialogHeader><DialogTitle>{editId ? "Edit Gallery" : "Create Gallery"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="gallery-form-title" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><Label>Year</Label><Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
            </div>
            <div><Label>Google Drive Album Link</Label><Input value={form.drive_link} onChange={(e) => setForm({ ...form, drive_link: e.target.value })} placeholder="https://drive.google.com/..." /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center gap-3">
              <div className="h-16 w-24 rounded-lg bg-slate-100 overflow-hidden">{form.banner && <img src={fileUrl(form.banner)} alt="" className="w-full h-full object-cover" />}</div>
              <label><Button size="sm" variant="outline" onClick={() => document.getElementById("gbanner").click()}>Banner</Button><input id="gbanner" type="file" accept="image/*" className="hidden" onChange={setBanner} /></label>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Photos ({form.photos.length})</Label>
                <label><Button size="sm" variant="outline" disabled={busy} onClick={() => document.getElementById("gphotos").click()} data-testid="gallery-add-photos">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Photos"}</Button><input id="gphotos" type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} /></label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {form.photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm({ ...form, photos: form.photos.filter((_, j) => j !== i) })} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={save} data-testid="gallery-form-submit">{editId ? "Save" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
