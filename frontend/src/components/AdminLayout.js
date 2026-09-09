import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Image, Award, CheckSquare, Receipt, ShieldCheck, LogOut, Menu, X, Globe, Images, Contact } from "lucide-react";
import { Brand } from "@/components/Brand";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/admin", perm: null },
  { name: "Members", icon: Users, path: "/admin/members", perm: "members" },
  { name: "Events", icon: Calendar, path: "/admin/events", perm: "events" },
  { name: "Gallery", icon: Image, path: "/admin/gallery", perm: "gallery" },
  { name: "Certificates", icon: Award, path: "/admin/certificates", perm: "certificates" },
  { name: "Attendance", icon: CheckSquare, path: "/admin/attendance", perm: "attendance" },
  { name: "Accounts", icon: Receipt, path: "/admin/accounts", perm: "accounts" },
  { name: "Team", icon: Contact, path: "/admin/team", perm: null },
  { name: "Site Content", icon: Images, path: "/admin/content", perm: null },
  { name: "Super Admin", icon: ShieldCheck, path: "/admin/super", perm: "super_admin_only" },
];

export default function AdminLayout({ children, title }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [perms, setPerms] = useState([]);

  useEffect(() => { api.get("/admin/permissions").then((r) => setPerms(r.data.permissions)).catch(() => {}); }, []);

  const visible = ITEMS.filter((it) => {
    if (it.perm === null) return true;
    if (it.perm === "super_admin_only") return isSuperAdmin;
    return isSuperAdmin || perms.includes(it.perm);
  });

  const Sidebar = () => (
    <div className="w-64 bg-slate-950 text-slate-200 min-h-screen flex flex-col p-4 fixed lg:sticky top-0 h-screen z-40">
      <div className="px-2 py-3 mb-4 rounded-xl bg-white/5"><Brand dark compact /></div>
      <nav className="flex-1 space-y-1">
        {visible.map((it) => {
          const active = loc.pathname === it.path;
          return (
            <Link key={it.path} to={it.path} onClick={() => setOpen(false)} data-testid={`admin-nav-${it.name.toLowerCase().replace(/ /g, "-")}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-red-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
              <it.icon className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} /> {it.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 pt-3 space-y-1">
        <div className="px-3 py-1 text-xs text-slate-500 truncate">{user?.name} · {user?.role?.replace("_", " ")}</div>
        <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5"><Globe className="h-4 w-4" /> Public Site</Link>
        <button onClick={() => { logout(); nav("/"); }} data-testid="admin-logout" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5"><LogOut className="h-4 w-4" /> Logout</button>
      </div>
    </div>
  );

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="hidden lg:block"><Sidebar /></div>
      {open && <div className="lg:hidden"><div className="fixed inset-0 bg-black/50 z-30" onClick={() => setOpen(false)} /><Sidebar /></div>}
      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)} data-testid="admin-mobile-menu"><Menu className="h-5 w-5" /></button>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
