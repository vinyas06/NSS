import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const { register, formatApiError } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success("Account created! Note: NSS event registration requires membership approval by an admin.");
      nav("/profile");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <form onSubmit={submit} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm" data-testid="register-form">
        <Link to="/" className="inline-block mb-6"><Brand /></Link>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Create Account</h2>
        <p className="text-slate-500 text-sm mt-1 mb-6">Public account for visitors. NSS membership is granted by admins.</p>
        <div className="space-y-4">
          <div><Label>Full Name</Label><Input data-testid="register-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1.5" /></div>
          <div><Label>Email</Label><Input data-testid="register-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1.5" /></div>
          <div><Label>Password</Label><Input data-testid="register-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="mt-1.5" /></div>
        </div>
        <Button type="submit" disabled={busy} data-testid="register-submit" className="w-full mt-6 bg-red-600 hover:bg-red-700 h-11">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
        </Button>
        <p className="text-center text-sm text-slate-500 mt-6">Already have an account? <Link to="/login" className="text-red-600 font-medium hover:underline">Sign in</Link></p>
      </form>
    </div>
  );
}
