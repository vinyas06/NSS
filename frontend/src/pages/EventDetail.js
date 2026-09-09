import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Calendar, MapPin, Users, IndianRupee, Clock, ArrowLeft, Loader2, Award, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import PublicLayout from "@/components/PublicLayout";
import api, { fileUrl, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function EventDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, isMember } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [terms, setTerms] = useState(false);
  const [emergency, setEmergency] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/events/${id}`).then((r) => setEvent(r.data)).catch(() => toast.error("Event not found")).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const startPayment = async () => {
    const ok = await loadRazorpay();
    if (!ok) return toast.error("Failed to load payment gateway");
    try {
      const { data } = await api.post("/payments/create-order", { event_id: id });
      const rzp = new window.Razorpay({
        key: data.key_id, amount: data.amount, currency: data.currency, order_id: data.order_id,
        name: "NSS NMAMIT", description: data.event_name, prefill: data.prefill,
        theme: { color: "#DC2626" },
        handler: async (res) => {
          try {
            const v = await api.post("/payments/verify", {
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            });
            toast.success(`Payment successful! Invoice ${v.data.invoice_number} generated.`);
            load();
          } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
        },
      });
      rzp.open();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const doRegister = async () => {
    if (!terms) return toast.error("Please accept the terms and conditions");
    setBusy(true);
    try {
      const { data } = await api.post(`/events/${id}/register`, { accepted_terms: true, emergency_contact: emergency });
      setModal(false);
      if (data.requires_payment) {
        toast.info("Registration reserved. Complete payment to confirm.");
        load();
        setTimeout(startPayment, 400);
      } else {
        toast.success("Registered successfully!");
        load();
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setBusy(false); }
  };

  if (loading) return <PublicLayout><div className="grid place-items-center py-32"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div></PublicLayout>;
  if (!event) return <PublicLayout><div className="text-center py-32 text-slate-500">Event not found.</div></PublicLayout>;

  const reg = event.my_registration;
  const needsPay = reg && reg.status === "payment_pending";

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <button onClick={() => nav("/events")} className="flex items-center gap-2 text-slate-500 hover:text-red-600 mb-6" data-testid="event-back-btn"><ArrowLeft className="h-4 w-4" /> Back to Events</button>

        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <img src={fileUrl(event.thumbnail) || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200"} alt={event.name} className="w-full h-72 object-cover" />
        </div>

        <div className="mt-8 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900 text-white uppercase">{event.status}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-600 text-white">{event.is_paid && event.fee > 0 ? `₹${event.fee}` : "FREE"}</span>
              {event.compulsory && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-600 text-white">COMPULSORY</span>}
            </div>
            <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{event.name}</h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">{event.description}</p>

            {event.rules && (
              <div className="mt-6">
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Rules & Regulations</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{event.rules}</p>
              </div>
            )}

            {event.my_certificate && (
              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-3"><Award className="h-6 w-6 text-amber-600" /><div><div className="font-semibold text-amber-900">Your Certificate</div><div className="text-xs text-amber-700">{event.my_certificate.certificate_number}</div></div></div>
                <Button size="sm" variant="outline" onClick={() => window.open(fileUrl(event.my_certificate.document_path), "_blank")} data-testid="event-cert-download">Download</Button>
              </div>
            )}

            {event.gallery && (
              <Link to={`/gallery`} className="mt-4 inline-flex items-center gap-2 text-red-600 font-medium" data-testid="event-gallery-link"><ImageIcon className="h-4 w-4" /> View Event Gallery</Link>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><Calendar className="h-4 w-4 text-red-500" />{event.event_date ? new Date(event.event_date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "TBA"}</div>
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><MapPin className="h-4 w-4 text-red-500" />{event.location}</div>
                {event.service_hours > 0 && <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><Clock className="h-4 w-4 text-red-500" />{event.service_hours} service hours</div>}
                {event.capacity > 0 && <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><Users className="h-4 w-4 text-red-500" />{event.registered_count}/{event.capacity} registered</div>}
              </div>

              <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5">
                {reg ? (
                  needsPay ? (
                    <Button className="w-full bg-red-600 hover:bg-red-700" onClick={startPayment} data-testid="event-pay-btn"><IndianRupee className="h-4 w-4 mr-1" />Complete Payment ₹{reg.fee}</Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-center py-2 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm border border-emerald-200" data-testid="event-registered-badge">✓ You are registered</div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center" data-testid="admission-pass">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Admission Pass</div>
                        <div className="bg-white p-2 rounded-lg inline-block"><QRCodeCanvas value={reg.id} size={140} level="M" /></div>
                        <div className="text-xs text-slate-500 mt-2">Show this QR at the attendance desk for a one-scan check-in.</div>
                      </div>
                    </div>
                  )
                ) : !user ? (
                  <Button className="w-full bg-slate-900 hover:bg-red-600" onClick={() => nav("/login")} data-testid="event-signin-btn">Sign in to Register</Button>
                ) : !isMember ? (
                  <div className="text-center text-sm text-slate-500 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl" data-testid="event-nonmember-msg">Only NSS members can register. Contact an admin to become a member.</div>
                ) : event.compulsory ? (
                  <div className="text-center text-sm text-purple-700 p-3 bg-purple-50 rounded-xl">Compulsory event — no registration needed.</div>
                ) : event.can_register ? (
                  <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => setModal(true)} data-testid="event-register-btn">Register Now</Button>
                ) : (
                  <div className="text-center text-sm text-slate-500 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl" data-testid="event-unavailable-msg">{event.reg_reason}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent data-testid="register-modal">
          <DialogHeader><DialogTitle className="font-display">Register for {event.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Emergency Contact (optional)</label>
              <Input value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="Phone number" className="mt-1.5" data-testid="register-emergency" />
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 max-h-32 overflow-y-auto">
              <div className="font-semibold mb-1 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Terms & Conditions</div>
              {event.terms || "I agree to abide by NSS rules and the code of conduct."}
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={terms} onCheckedChange={setTerms} data-testid="register-terms-checkbox" className="mt-0.5" />
              <span className="text-sm text-slate-600 dark:text-slate-300">I accept the terms and conditions{event.is_paid && event.fee > 0 ? ` and agree to pay ₹${event.fee}` : ""}.</span>
            </label>
            <Button className="w-full bg-red-600 hover:bg-red-700" disabled={!terms || busy} onClick={doRegister} data-testid="register-confirm-btn">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (event.is_paid && event.fee > 0 ? `Register & Pay ₹${event.fee}` : "Confirm Registration")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
