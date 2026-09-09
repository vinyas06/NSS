import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, ShieldCheck, XCircle, Loader2, Download } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import api, { fileUrl } from "@/lib/api";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function CertResult({ cert }) {
  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-8" data-testid="cert-verified-result">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-full bg-emerald-500 grid place-items-center"><ShieldCheck className="h-7 w-7 text-white" /></div>
        <div>
          <div className="font-display text-xl font-bold text-emerald-800 dark:text-emerald-300">Verified Certificate</div>
          <div className="text-sm text-emerald-600">Authentic · Issued by NSS NMAMIT</div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        {[["Certificate No.", cert.certificate_number], ["Student Name", cert.student_name], ["USN", cert.usn], ["Event", cert.event_name], ["Issued Date", cert.issued_date]].map(([l, v]) => (
          <div key={l} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-400 uppercase tracking-wider">{l}</div>
            <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{v || "—"}</div>
          </div>
        ))}
      </div>
      {cert.document_path && (
        <Button className="mt-6 bg-emerald-600 hover:bg-emerald-700" onClick={() => window.open(fileUrl(cert.document_path), "_blank")} data-testid="cert-download-btn">
          <Download className="h-4 w-4 mr-2" /> View Certificate Document
        </Button>
      )}
    </div>
  );
}

export function Verify() {
  const [number, setNumber] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const search = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try {
      const { data } = await api.get(`/certificates/${encodeURIComponent(number.trim())}`);
      setResult(data);
    } catch {
      setError("No certificate available for this number.");
    } finally { setBusy(false); }
  };

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <div className="inline-block mb-4"><Brand /></div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">Certificate Verification</h1>
          <p className="text-slate-500 mt-2">Enter a certificate number to verify authenticity.</p>
        </div>
        <form onSubmit={search} className="flex gap-2" data-testid="verify-form">
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="NSS-NMAMIT-2025-XXXXXX" required data-testid="verify-input" />
          <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={busy} data-testid="verify-submit">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>
        <div className="mt-8">
          {result && <CertResult cert={result} />}
          {error && (
            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/20 p-8 text-center" data-testid="verify-error">
              <XCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
              <p className="font-semibold text-rose-700">{error}</p>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

export function CertificateView() {
  const { number } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/certificates/${encodeURIComponent(number)}`).then((r) => setResult(r.data)).catch(() => setError(true)).finally(() => setLoading(false));
  }, [number]);

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-8"><div className="inline-block"><Brand /></div></div>
        {loading ? <div className="grid place-items-center py-16"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> :
          error ? (
            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-8 text-center" data-testid="cert-not-found">
              <XCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
              <p className="font-semibold text-rose-700">No certificate available for {number}</p>
            </div>
          ) : <CertResult cert={result} />}
      </div>
    </PublicLayout>
  );
}
