import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Loader2, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import api, { fileUrl, uploadFile, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EMPTY = { name: "", description: "", rules: "", location: "", thumbnail: null, event_date: "", reg_start: "", reg_end: "", is_paid: false, fee: 0, capacity: 0, compulsory: false, terms: "", status: "upcoming", service_hours: 0 };
const STATUSES = ["upcoming", "live", "completed", "cancelled", "postponed"];

function dtLocal(iso) { return iso ? iso.slice(0, 16) : ""; }

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [regsFor, setRegsFor] = useState(null);
  const [regs, setRegs] = useState([]);

  const load = () => { setLoading(true); api.get("/events").then((r) => setEvents(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openNew = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (e) => {
    setForm({ ...EMPTY, ...e, event_date: dtLocal(e.event_date), reg_start: dtLocal(e.reg_start), reg_end: dtLocal(e.reg_end) });
    setEditId(e.id); setModal(true);
  };

  const save = async () => {
    const payload = { ...form, fee: Number(form.fee) || 0, capacity: Number(form.capacity) || 0, service_hours: Number(form.service_hours) || 0,
      event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
      reg_start: form.reg_start ? new Date(form.reg_start).toISOString() : null,
      reg_end: form.reg_end ? new Date(form.reg_end).toISOString() : null };
    try {
      if (editId) await api.patch(`/admin/events/${editId}`, payload);
      else await api.post("/admin/events", payload);
      toast.success(editId ? "Event updated" : "Event created");
      setModal(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const del = async (id) => { if (!window.confirm("Delete event?")) return; await api.delete(`/admin/events/${id}`); toast.success("Deleted"); load(); };

  const viewRegs = async (e) => {
    const { data } = await api.get(`/admin/events/${e.id}/registrations`);
    setRegs(data); setRegsFor(e);
  };

  const uploadThumb = async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    const { path } = await uploadFile(f, "events"); setForm({ ...form, thumbnail: path }); toast.success("Thumbnail uploaded");
  };

  return (
    <AdminLayout title="Events">
      <div className="flex justify-end mb-6"><Button className="bg-red-600 hover:bg-red-700" onClick={openNew} data-testid="event-create-btn"><Plus className="h-4 w-4 mr-1" />Create Event</Button></div>
      {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => (
            <div key={e.id} data-testid={`admin-event-${e.id}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <img src={fileUrl(e.thumbnail) || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600"} alt="" className="h-32 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 capitalize">{e.status}</span>{e.compulsory && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Compulsory</span>}<span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">{e.is_paid && e.fee > 0 ? `₹${e.fee}` : "Free"}</span></div>
                <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">{e.name}</h3>
                <div className="text-xs text-slate-400 mt-1">{e.registered_count} registered{e.capacity > 0 ? ` / ${e.capacity}` : ""}</div>
                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => viewRegs(e)} data-testid={`event-regs-${e.id}`}><Users className="h-3.5 w-3.5 mr-1" />Registrations</Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(e)} data-testid={`event-edit-${e.id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(e.id)} data-testid={`event-delete-${e.id}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="event-form-modal">
          <DialogHeader><DialogTitle>{editId ? "Edit Event" : "Create Event"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-16 w-24 rounded-lg bg-slate-100 overflow-hidden">{form.thumbnail && <img src={fileUrl(form.thumbnail)} alt="" className="w-full h-full object-cover" />}</div>
              <label><Button size="sm" variant="outline" onClick={() => document.getElementById("thumb").click()}>Upload Thumbnail</Button><input id="thumb" type="file" accept="image/*" className="hidden" onChange={uploadThumb} /></label>
            </div>
            <div><Label>Event Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="event-form-name" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Rules & Regulations</Label><Textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} /></div>
            <div><Label>Terms & Conditions</Label><Textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Status</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} data-testid="event-form-status">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><Label>Event Date</Label><Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
              <div><Label>Service Hours</Label><Input type="number" value={form.service_hours} onChange={(e) => setForm({ ...form, service_hours: e.target.value })} /></div>
              <div><Label>Registration Opens</Label><Input type="datetime-local" value={form.reg_start} onChange={(e) => setForm({ ...form, reg_start: e.target.value })} /></div>
              <div><Label>Registration Closes</Label><Input type="datetime-local" value={form.reg_end} onChange={(e) => setForm({ ...form, reg_end: e.target.value })} /></div>
              <div><Label>Capacity (0 = unlimited)</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} data-testid="event-form-capacity" /></div>
              <div><Label>Fee (₹)</Label><Input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} data-testid="event-form-fee" /></div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2"><Checkbox checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: v })} data-testid="event-form-paid" /><span className="text-sm">Paid Event</span></label>
              <label className="flex items-center gap-2"><Checkbox checked={form.compulsory} onCheckedChange={(v) => setForm({ ...form, compulsory: v })} data-testid="event-form-compulsory" /><span className="text-sm">Compulsory</span></label>
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={save} data-testid="event-form-submit">{editId ? "Save Changes" : "Create Event"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!regsFor} onOpenChange={(o) => !o && setRegsFor(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" data-testid="event-regs-modal">
          <DialogHeader><DialogTitle>Registrations — {regsFor?.name}</DialogTitle></DialogHeader>
          <div className="text-sm text-slate-500 mb-2">{regs.length} registered · {regsFor?.capacity > 0 ? `${Math.max(0, regsFor.capacity - regs.length)} slots left` : "unlimited"}</div>
          <div className="space-y-2">
            {regs.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div><div className="font-medium text-sm">{r.student_name}</div><div className="text-xs text-slate-400 font-mono">{r.usn}</div></div>
                <div className="text-right"><span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-700">{r.status}</span>{r.invoice && <div className="text-[10px] text-slate-400 mt-0.5">{r.invoice.invoice_number}</div>}</div>
              </div>
            ))}
            {regs.length === 0 && <p className="text-center text-slate-400 py-6">No registrations yet.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
