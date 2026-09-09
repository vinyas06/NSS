import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Check, X, Loader2, ScanLine } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import AdminLayout from "@/components/AdminLayout";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminAttendance() {
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef(null);

  useEffect(() => { api.get("/events").then((r) => setEvents(r.data)); }, []);

  const pick = async (e) => {
    setSelected(e); setLoading(true);
    const { data } = await api.get(`/admin/attendance/${e.id}`);
    setRows(data); setLoading(false);
  };

  const mark = async (user_id, status) => {
    await api.post("/admin/attendance", { event_id: selected.id, user_id, status });
    setRows((rs) => rs.map((r) => r.user_id === user_id ? { ...r, status } : r));
    toast.success(`Marked ${status}`);
  };

  const doScan = async (code) => {
    if (!selected) return toast.error("Select an event first");
    if (!code) return;
    try {
      const { data } = await api.post("/admin/attendance/scan", { code, event_id: selected.id });
      toast.success(`${data.student_name} (${data.usn || ""}) marked present${data.already_present ? " — already checked in" : ""}`);
      pick(selected);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  useEffect(() => {
    if (!scanOpen) return;
    let scanner;
    const t = setTimeout(() => {
      scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 },
        (decoded) => { scanner.pause(true); doScan(decoded); setTimeout(() => { try { scanner.resume(); } catch (e) {} }, 1800); },
        () => {}
      ).catch(() => toast.error("Camera unavailable — use manual entry below"));
    }, 200);
    return () => { clearTimeout(t); try { scannerRef.current?.stop().then(() => scannerRef.current?.clear()).catch(() => {}); } catch (e) {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanOpen]);

  return (
    <AdminLayout title="Attendance">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{selected ? `Marking: ${selected.name}` : "Select an event to begin"}</p>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => selected ? setScanOpen(true) : toast.error("Select an event first")} data-testid="attendance-scan-btn"><ScanLine className="h-4 w-4 mr-1" />Scan Pass</Button>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Select Event</h3>
          <div className="space-y-2">
            {events.map((e) => (
              <button key={e.id} data-testid={`attendance-event-${e.id}`} onClick={() => pick(e)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${selected?.id === e.id ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-300"}`}>
                <div className="font-medium text-sm text-slate-900 dark:text-white">{e.name}</div>
                <div className="text-xs text-slate-400 capitalize">{e.status} · {e.registered_count} registered</div>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {!selected ? <div className="text-center text-slate-400 py-20 border border-dashed rounded-2xl">Select an event to mark attendance.</div> :
            loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 font-semibold text-slate-900 dark:text-white">{selected.name} — {rows.length} students</div>
                {rows.map((r) => (
                  <div key={r.user_id} data-testid={`attendance-row-${r.user_id}`} className="flex items-center justify-between px-5 py-3 border-b border-slate-50 dark:border-slate-800/50">
                    <div><div className="font-medium text-sm text-slate-900 dark:text-white">{r.student_name}</div><div className="text-xs text-slate-400 font-mono">{r.usn}</div></div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "present" ? "bg-emerald-50 text-emerald-700" : r.status === "absent" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}>{r.status}</span>
                      <Button size="icon" variant="ghost" onClick={() => mark(r.user_id, "present")} data-testid={`mark-present-${r.user_id}`}><Check className="h-4 w-4 text-emerald-500" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => mark(r.user_id, "absent")} data-testid={`mark-absent-${r.user_id}`}><X className="h-4 w-4 text-rose-500" /></Button>
                    </div>
                  </div>
                ))}
                {rows.length === 0 && <div className="p-10 text-center text-slate-400">No registered students.</div>}
              </div>
            )}
        </div>
      </div>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent data-testid="scan-modal">
          <DialogHeader><DialogTitle>Scan Admission Pass — {selected?.name}</DialogTitle></DialogHeader>
          <div id="qr-reader" className="w-full rounded-xl overflow-hidden bg-slate-900" />
          <div className="mt-3">
            <p className="text-xs text-slate-400 mb-2">Camera scanning marks students present instantly. Or enter a pass code manually:</p>
            <div className="flex gap-2">
              <Input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Registration / pass code" data-testid="scan-manual-input" />
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => { doScan(manualCode.trim()); setManualCode(""); }} data-testid="scan-manual-submit">Mark</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
