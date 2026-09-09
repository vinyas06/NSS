import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, User, Linkedin, Instagram, Phone, Mail, Sun, Moon } from "lucide-react";
import { Brand, NSS_LOGO } from "@/components/Brand";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";

const NAV = [
  { name: "Home", path: "/" },
  { name: "Events", path: "/events" },
  { name: "Gallery", path: "/gallery" },
  { name: "Team", path: "/team" },
  { name: "Frame", path: "/photo-frame" },
  { name: "Verify", path: "/verify" },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} data-testid="theme-toggle" title="Toggle theme"
      className="h-9 w-9 rounded-lg grid place-items-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      {theme === "dark" ? <Sun className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} /> : <Moon className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} />}
    </button>
  );
}

function Header() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" data-testid="nav-home-logo"><Brand /></Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.path} to={n.path} data-testid={`nav-link-${n.name.toLowerCase()}`}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${loc.pathname === n.path ? "text-red-600 bg-red-50 dark:bg-red-950/40" : "text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
              {n.name}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              {isAdmin && (
                <Button variant="outline" size="sm" data-testid="nav-admin-btn" onClick={() => nav("/admin")}>
                  <LayoutDashboard className="h-4 w-4 mr-1" /> Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" data-testid="nav-profile-btn" onClick={() => nav("/profile")}>
                <User className="h-4 w-4 mr-1" /> {user.name?.split(" ")[0]}
              </Button>
              <Button variant="ghost" size="icon" data-testid="nav-logout-btn" onClick={() => { logout(); nav("/"); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" className="bg-red-600 hover:bg-red-700" data-testid="nav-login-btn" onClick={() => nav("/login")}>Member Login</Button>
          )}
        </div>

        <div className="lg:hidden flex items-center gap-1">
          <ThemeToggle />
          <button className="p-2" data-testid="nav-mobile-toggle" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
          {NAV.map((n) => (
            <Link key={n.path} to={n.path} onClick={() => setOpen(false)} data-testid={`mnav-${n.name.toLowerCase()}`}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">{n.name}</Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <>
                {isAdmin && <Button variant="outline" onClick={() => { nav("/admin"); setOpen(false); }}>Admin Portal</Button>}
                <Button variant="ghost" onClick={() => { nav("/profile"); setOpen(false); }}>My Profile</Button>
                <Button variant="ghost" onClick={() => { logout(); nav("/"); setOpen(false); }}>Logout</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => { nav("/login"); setOpen(false); }}>Member Login</Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0b1528] text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <img src={NSS_LOGO} alt="NSS" className="h-12 w-12" />
            <div>
              <div className="font-display font-bold text-white text-lg">NSS Unit — NMAMIT</div>
              <div className="text-xs text-slate-400">National Service Scheme · Not Me But You</div>
            </div>
          </div>
          <p className="text-sm text-slate-400 max-w-md">NMAM Institute of Technology Nitte, SH1, Karkala, Karnataka, 574110</p>
          <div className="flex gap-3 mt-5">
            {[[Linkedin, "https://www.linkedin.com/school/nitte-nmamit/"], [Instagram, "https://www.instagram.com/nss_nmamit/"], [Phone, "tel:+919449913588"], [Mail, "mailto:NSSNMAMIT@GMAIL.COM"]].map(([Icon, href], i) => (
              <a key={i} href={href} target="_blank" rel="noreferrer" data-testid={`footer-social-${i}`}
                className="h-10 w-10 rounded-full bg-white/5 hover:bg-red-600 border border-white/10 grid place-items-center transition-colors">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Navigate</h4>
          <ul className="space-y-2 text-sm">
            {NAV.slice(0, 4).map((n) => <li key={n.path}><Link to={n.path} className="hover:text-red-400">{n.name}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Legal</h4>
          <ul className="space-y-2 text-sm">
            {["Privacy", "Terms", "Refund", "Contact", "Shipping"].map((n) => <li key={n}><Link to="/legal" className="hover:text-red-400">{n}</Link></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} NSS Unit, NMAM Institute of Technology Nitte. All rights reserved.
      </div>
    </footer>
  );
}

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
