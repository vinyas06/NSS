import { useEffect, useState } from "react";
import { Calendar, CalendarClock, Users, Award, Radio, ClipboardList, Loader2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import api from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/dashboard").then((r) => setStats(r.data)); }, []);

  const cards = stats ? [
    { label: "Total Events", value: stats.total_events, icon: Calendar, color: "text-blue-600 bg-blue-50" },
    { label: "Upcoming", value: stats.upcoming_events, icon: CalendarClock, color: "text-indigo-600 bg-indigo-50" },
    { label: "Live Now", value: stats.live_events, icon: Radio, color: "text-emerald-600 bg-emerald-50" },
    { label: "Volunteers", value: stats.total_members, icon: Users, color: "text-red-600 bg-red-50" },
    { label: "Core Members", value: stats.core_members, icon: Users, color: "text-purple-600 bg-purple-50" },
    { label: "Certificates", value: stats.total_certificates, icon: Award, color: "text-amber-600 bg-amber-50" },
    { label: "Registrations", value: stats.total_registrations, icon: ClipboardList, color: "text-teal-600 bg-teal-50" },
  ] : [];

  return (
    <AdminLayout title="Dashboard">
      {!stats ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="dashboard-kpis">
            {cards.map((c) => (
              <div key={c.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <div className={`h-10 w-10 rounded-xl grid place-items-center ${c.color} dark:bg-opacity-20`}><c.icon className="h-5 w-5" /></div>
                <div className="font-display text-3xl font-extrabold text-slate-900 dark:text-white mt-3">{c.value}</div>
                <div className="text-sm text-slate-400">{c.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Welcome to the NSS Admin Portal</h2>
            <p className="text-slate-500 mt-2 max-w-lg mx-auto">Use the sidebar to manage members, events, gallery, certificates, attendance and accounts. Super Admins can manage admin users and roles.</p>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
