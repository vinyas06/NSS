import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Wallet, Receipt, Plus, Trash2, Loader2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATS = ["registration_fee", "sponsor", "donation", "event_expense", "equipment", "refreshments", "certificate_printing", "other"];

export default function AdminAccounts() {
  const [summary, setSummary] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type: "credit", amount: "", category: "donation", description: "", reference: "" });

  const load = () => {
    setLoading(true);
    Promise.all([api.get("/admin/accounts/summary"), api.get("/admin/transactions", { params: { type: filter || undefined } })])
      .then(([s, t]) => { setSummary(s.data); setTxns(t.data); }).finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const add = async () => {
    try {
      await api.post("/admin/transactions", { ...form, amount: Number(form.amount) });
      toast.success("Transaction added"); setModal(false);
      setForm({ type: "credit", amount: "", category: "donation", description: "", reference: "" }); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const del = async (id) => { if (!window.confirm("Delete transaction?")) return; await api.delete(`/admin/transactions/${id}`); toast.success("Deleted"); load(); };

  const cards = summary ? [
    { l: "Total Inflow", v: summary.inflow, icon: TrendingUp, c: "text-emerald-600 bg-emerald-50" },
    { l: "Total Outflow", v: summary.outflow, icon: TrendingDown, c: "text-rose-600 bg-rose-50" },
    { l: "Fund Balance", v: summary.balance, icon: Wallet, c: "text-blue-600 bg-blue-50" },
    { l: "Registration Fees", v: summary.registration_fees, icon: Receipt, c: "text-amber-600 bg-amber-50" },
  ] : [];

  return (
    <AdminLayout title="Accounts Ledger">
      {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="accounts-summary">
            {cards.map((c) => (
              <div key={c.l} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <div className={`h-10 w-10 rounded-xl grid place-items-center ${c.c} dark:bg-opacity-20`}><c.icon className="h-5 w-5" /></div>
                <div className="font-display text-2xl font-extrabold text-slate-900 dark:text-white mt-3">₹{Number(c.v).toLocaleString("en-IN")}</div>
                <div className="text-sm text-slate-400">{c.l}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-8 mb-4">
            <div className="flex gap-2">
              {["", "credit", "debit"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} data-testid={`txn-filter-${f || "all"}`}
                  className={`px-3 py-1.5 rounded-full text-sm ${filter === f ? "bg-red-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}>{f || "All"}</button>
              ))}
            </div>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => setModal(true)} data-testid="txn-add-btn"><Plus className="h-4 w-4 mr-1" />Add Transaction</Button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {txns.map((t) => (
              <div key={t.id} data-testid={`txn-row-${t.id}`} className="flex items-center justify-between px-5 py-3 border-b border-slate-50 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full grid place-items-center ${t.type === "credit" ? "bg-emerald-50 text-emerald-600" : t.type === "debit" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                    {t.type === "credit" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-900 dark:text-white">{t.description || t.category}</div>
                    <div className="text-xs text-slate-400">{t.category} · {t.created_at?.slice(0, 10)}{t.event_name ? ` · ${t.event_name}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${t.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>{t.type === "credit" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}</span>
                  <Button size="icon" variant="ghost" onClick={() => del(t.id)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                </div>
              </div>
            ))}
            {txns.length === 0 && <div className="p-10 text-center text-slate-400">No transactions.</div>}
          </div>
        </>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent data-testid="txn-modal">
          <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} data-testid="txn-type"><option value="credit">Credit</option><option value="debit">Debit</option><option value="adjustment">Adjustment</option></select></div>
              <div><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="txn-amount" /></div>
            </div>
            <div><Label>Category</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}</select></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="txn-desc" /></div>
            <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={add} data-testid="txn-submit">Add Transaction</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
