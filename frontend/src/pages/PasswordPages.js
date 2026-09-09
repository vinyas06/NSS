import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
      toast.success("If that email exists, a reset link was sent.");
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <form onSubmit={submit} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8" data-testid="forgot-form">
        <Link to="/" className="inline-block mb-6"><Brand /></Link>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Forgot Password</h2>
        <p className="text-slate-500 text-sm mt-1 mb-6">Enter your email to receive a reset link.</p>
        {sent ? (
          <p className="text-emerald-600 text-sm">Check your inbox for the reset link.</p>
        ) : (
          <>
            <Label>Email</Label>
            <Input data-testid="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
            <Button type="submit" data-testid="forgot-submit" className="w-full mt-6 bg-red-600 hover:bg-red-700">Send Reset Link</Button>
          </>
        )}
        <p className="text-center text-sm text-slate-500 mt-6"><Link to="/login" className="text-red-600">Back to login</Link></p>
      </form>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/reset-password", { token: params.get("token"), new_password: pw });
      toast.success("Password updated. Please sign in.");
      nav("/login");
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <form onSubmit={submit} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8" data-testid="reset-form">
        <Link to="/" className="inline-block mb-6"><Brand /></Link>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Reset Password</h2>
        <Label className="mt-6 block">New Password</Label>
        <Input data-testid="reset-password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required className="mt-1.5" />
        <Button type="submit" data-testid="reset-submit" className="w-full mt-6 bg-red-600 hover:bg-red-700">Update Password</Button>
      </form>
    </div>
  );
}
