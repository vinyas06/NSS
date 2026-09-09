import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { login, formatApiError } = useAuth();
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(identifier, password);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}!`);
      nav(u.role === "admin" || u.role === "super_admin" ? "/admin" : "/profile");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex nss-hero-grad grain relative flex-col justify-between p-12 text-white overflow-hidden">
        <Link to="/"><Brand dark /></Link>
        <div className="relative z-10">
          <p className="text-red-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Not Me But You</p>
          <h1 className="font-display text-4xl font-extrabold leading-tight">Serve. Lead.<br />Transform Lives.</h1>
          <p className="mt-4 text-slate-300 max-w-sm">Join the National Service Scheme at NMAM Institute of Technology and be part of the change.</p>
        </div>
        <div className="text-xs text-slate-400">NMAM Institute of Technology Nitte · Karkala</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="login-form">
          <div className="lg:hidden mb-8"><Link to="/"><Brand /></Link></div>
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Member Login</h2>
          <p className="text-slate-500 mt-2 mb-8">Sign in with your Email or USN.</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="identifier">Email or USN</Label>
              <Input id="identifier" data-testid="login-identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@nmamit.in or 4NM22CS089" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required className="mt-1.5" />
            </div>
          </div>

          <div className="flex justify-end mt-2">
            <Link to="/forgot-password" className="text-sm text-red-600 hover:underline" data-testid="login-forgot-link">Forgot password?</Link>
          </div>

          <Button type="submit" disabled={busy} data-testid="login-submit" className="w-full mt-6 bg-red-600 hover:bg-red-700 h-11">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
          </Button>

          <p className="text-center text-sm text-slate-500 mt-6">
            New here? <Link to="/register" className="text-red-600 font-medium hover:underline" data-testid="login-register-link">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
