import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Award, Upload, Trash2, Loader2, ExternalLink, CheckCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import api, { fileUrl, uploadFile, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AdminCertificates() {
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(null);

  useEffect(() => { api.get("/events").then((r) => setEvents(r.data.filter((e) => e.status === "completed" || e.status === "live"))); }, []);

  const pick = async (e) => {
    setSelected(e); setLoading(true);
    const { data } = await api.get(`/admin/certificates/participants/${e.id}`);
    setParticipants(data); setLoading(false);
  };

  const issue = async (userId, file) => {
    if (!file) return;
    setUploading(userId);
    try {
      const { path } = await uploadFile(file, "certificates");
      await api.post("/admin/certificates", { event_id: selected.id, user_id: userId, document_path: path });
      toast.success("Certificate issued with verification number");
      pick(selected);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setUploading(null); }
  };

  const del = async (certId) => {
    if (!window.confirm("Delete certificate? This invalidates the verification link.")) return;
    await api.delete(`/admin/certificates/${certId}`);
    toast.success("Deleted and verification link invalidated");
    pick(selected);
  };

  return (
    <AdminLayout title="Certificates">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Completed / Live Events</h3>
          <div className="space-y-2">
            {events.map((e) => (
              <button key={e.id} data-testid={`cert-event-${e.id}`} onClick={() => pick(e)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${selected?.id === e.id ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-300"}`}>
                <div className="font-medium text-sm text-slate-900 dark:text-white">{e.name}</div>
                <div className="text-xs text-slate-400 capitalize">{e.status}</div>
              </button>
            ))}
            {events.length === 0 && <p className="text-sm text-slate-400">No completed events yet.</p>}
          </div>
        </div>
        <div className="lg:col-span-2">
          {!selected ? <div className="text-center text-slate-400 py-20 border border-dashed rounded-2xl">Select an event to issue certificates.</div> :
            loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 font-semibold text-slate-900 dark:text-white">{selected.name} — Participants</div>
                {participants.map((p) => (
                  <div key={p.id} data-testid={`cert-participant-${p.user_id}`} className="flex items-center justify-between px-5 py-3 border-b border-slate-50 dark:border-slate-800/50">
                    <div><div className="font-medium text-sm text-slate-900 dark:text-white">{p.student_name}</div><div className="text-xs text-slate-400 font-mono">{p.usn}</div></div>
                    {p.certificate ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />{p.certificate.certificate_number}</span>
                        <Button size="icon" variant="ghost" onClick={() => window.open(`/certificate/${p.certificate.certificate_number}`, "_blank")}><ExternalLink className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => del(p.certificate.id)} data-testid={`cert-delete-${p.user_id}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                      </div>
                    ) : (
                      <label>
                        <Button size="sm" variant="outline" disabled={uploading === p.user_id} onClick={() => document.getElementById(`certup-${p.user_id}`).click()} data-testid={`cert-upload-${p.user_id}`}>
                          {uploading === p.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-3.5 w-3.5 mr-1" />Issue</>}
                        </Button>
                        <input id={`certup-${p.user_id}`} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => issue(p.user_id, e.target.files[0])} />
                      </label>
                    )}
                  </div>
                ))}
                {participants.length === 0 && <div className="p-10 text-center text-slate-400">No participants.</div>}
              </div>
            )}
        </div>
      </div>
    </AdminLayout>
  );
}
