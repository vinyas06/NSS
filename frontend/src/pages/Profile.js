import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, Award, Calendar, Receipt, Clock, LogOut, Lock, Camera, Instagram, Linkedin, Github, Loader2, Download, ShieldAlert } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import api, { fileUrl, uploadFile, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Profile() {
  const { user, setUser, logout, isMember } = useAuth();
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [certs, setCerts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [restricted, setRestricted] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "" });
  const [social, setSocial] = useState(user?.social_links || {});

  useEffect(() => {
    api.get("/users/me/events").then((r) => setEvents(r.data)).catch(() => {});
    api.get("/users/me/invoices").then((r) => setInvoices(r.data)).catch(() => {});
    if (isMember) {
      api.get("/users/me/certificates").then((r) => setCerts(r.data)).catch(() => {});
      api.get("/users/me/attendance").then((r) => setAttendance(r.data)).catch(() => {});
    } else {
      setRestricted(true);
    }
  }, [isMember]);

  const totalHours = attendance.reduce((s, a) => s + (a.service_hours || 0), 0);

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { path } = await uploadFile(file, "photos");
      const { data } = await api.patch("/users/me", { photo_path: path });
      setUser(data);
      toast.success("Photo updated");
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };

  const saveSocial = async () => {
    try {
      const { data } = await api.patch("/users/me", { social_links: social });
      setUser(data);
      toast.success("Social links saved");
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };

  const changePw = async () => {
    try {
      await api.post("/auth/change-password", pwForm);
      toast.success("Password changed");
      setPwModal(false);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };

  if (!user) return null;

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header card */}
        <div className="rounded-2xl nss-hero-grad grain relative overflow-hidden p-8 text-white">
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl bg-white/10 border border-white/20 overflow-hidden grid place-items-center">
                {user.photo_path ? <img src={fileUrl(user.photo_path)} alt="" className="w-full h-full object-cover" /> : <User className="h-10 w-10 text-white/70" />}
              </div>
              <label className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-red-600 grid place-items-center cursor-pointer" data-testid="profile-photo-upload">
                <Camera className="h-4 w-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
              </label>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="font-display text-2xl font-extrabold">{user.name}</h1>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                {user.usn && <span className="text-xs font-mono px-2 py-1 rounded bg-white/10 border border-white/20">{user.usn}</span>}
                <span className="text-xs px-2 py-1 rounded bg-red-600 capitalize">{user.role === "user" ? "Visitor" : user.role.replace("_", " ")}</span>
                {user.joined_year && <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20">Since {user.joined_year}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-transparent border-white/30 text-white hover:bg-white/10" onClick={() => setPwModal(true)} data-testid="profile-changepw-btn"><Lock className="h-4 w-4 mr-1" />Password</Button>
              <Button variant="outline" size="sm" className="bg-transparent border-white/30 text-white hover:bg-white/10" onClick={() => { logout(); nav("/"); }} data-testid="profile-logout-btn"><LogOut className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        {isMember && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[[Calendar, events.length, "Events"], [Clock, `${totalHours}/120`, "Service Hours"], [Award, certs.length, "Certificates"]].map(([Icon, v, l], i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                <Icon className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <div className="font-display text-xl font-bold text-slate-900 dark:text-white">{v}</div>
                <div className="text-xs text-slate-400">{l}</div>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="events" className="mt-8">
          <TabsList data-testid="profile-tabs">
            <TabsTrigger value="events" data-testid="tab-events">My Events</TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-certificates">Certificates</TabsTrigger>
            <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
            <TabsTrigger value="social" data-testid="tab-social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            {events.length === 0 ? <Empty text="No event registrations yet." /> : (
              <div className="space-y-3">{events.map((e) => (
                <div key={e.id} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4" data-testid={`profile-event-${e.id}`}>
                  <div><div className="font-semibold text-slate-900 dark:text-white">{e.event_name}</div><div className="text-xs text-slate-400">{e.created_at?.slice(0, 10)}</div></div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${e.status === "paid" || e.status === "registered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{e.status}</span>
                </div>
              ))}</div>
            )}
          </TabsContent>

          <TabsContent value="attendance" className="mt-4">
            {restricted ? <MemberOnly /> : attendance.length === 0 ? <Empty text="No confirmed attendance yet. Attendance appears after admin approval." /> : (
              <div className="space-y-3">{attendance.map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <div><div className="font-semibold text-slate-900 dark:text-white">{a.event_name}</div><div className="text-xs text-slate-400">{a.event_date?.slice(0, 10)}</div></div>
                  <span className="text-xs font-semibold text-emerald-700">{a.service_hours} hrs · Present</span>
                </div>
              ))}</div>
            )}
          </TabsContent>

          <TabsContent value="certificates" className="mt-4">
            {restricted ? <MemberOnly /> : certs.length === 0 ? <Empty text="No certificates issued yet." /> : (
              <div className="grid sm:grid-cols-2 gap-4">{certs.map((c) => (
                <div key={c.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4" data-testid={`profile-cert-${c.id}`}>
                  <div className="flex items-center gap-2 mb-2"><Award className="h-5 w-5 text-amber-500" /><span className="font-semibold text-slate-900 dark:text-white text-sm">{c.event_name}</span></div>
                  <div className="text-xs font-mono text-slate-400">{c.certificate_number}</div>
                  <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => window.open(fileUrl(c.document_path), "_blank")}><Download className="h-3.5 w-3.5 mr-1" />Download</Button>
                </div>
              ))}</div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            {invoices.length === 0 ? <Empty text="No invoices yet." /> : (
              <div className="space-y-3">{invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4" data-testid={`profile-invoice-${inv.id}`}>
                  <div className="flex items-center gap-3"><Receipt className="h-5 w-5 text-red-500" /><div><div className="font-semibold text-slate-900 dark:text-white text-sm">{inv.invoice_number}</div><div className="text-xs text-slate-400">{inv.event_name} · ₹{inv.amount}</div></div></div>
                  {inv.pdf_path && <Button size="sm" variant="outline" onClick={() => window.open(fileUrl(inv.pdf_path), "_blank")}><Download className="h-3.5 w-3.5 mr-1" />PDF</Button>}
                </div>
              ))}</div>
            )}
          </TabsContent>

          <TabsContent value="social" className="mt-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg space-y-4">
              {[[Instagram, "instagram"], [Linkedin, "linkedin"], [Github, "github"]].map(([Icon, key]) => (
                <div key={key} className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-slate-400" />
                  <Input value={social[key] || ""} onChange={(e) => setSocial({ ...social, [key]: e.target.value })} placeholder={`${key} URL`} data-testid={`social-${key}`} />
                </div>
              ))}
              <Button onClick={saveSocial} className="bg-red-600 hover:bg-red-700" data-testid="social-save-btn">Save Links</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={pwModal} onOpenChange={setPwModal}>
        <DialogContent data-testid="changepw-modal">
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input type="password" placeholder="Current password" value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} data-testid="changepw-current" />
            <Input type="password" placeholder="New password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} data-testid="changepw-new" />
            <Button onClick={changePw} className="w-full bg-red-600 hover:bg-red-700" data-testid="changepw-submit">Update Password</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}

const Empty = ({ text }) => <div className="text-center text-slate-400 py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">{text}</div>;
const MemberOnly = () => (
  <div className="text-center py-12 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200" data-testid="member-only-msg">
    <ShieldAlert className="h-8 w-8 text-amber-500 mx-auto mb-2" />
    <p className="font-semibold text-amber-800 dark:text-amber-300">This feature is only available to NSS members.</p>
    <p className="text-sm text-amber-600 mt-1">Contact an NSS admin to become a member.</p>
  </div>
);
