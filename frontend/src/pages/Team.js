import { useEffect, useState } from "react";
import { Loader2, User } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import api, { fileUrl } from "@/lib/api";

export default function Team() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  useEffect(() => {
    api.get("/team").then((r) => setTeam(r.data)).finally(() => setLoading(false));
    api.get("/site-content").then((r) => setBanner(r.data.team_banner)).catch(() => {});
  }, []);

  return (
    <PublicLayout>
      <div className="relative nss-hero-grad grain py-16 overflow-hidden">
        {banner && <><img src={fileUrl(banner)} alt="" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-[#0b1528]/80" /></>}
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-red-400 mb-2">Leadership</p>
          <h1 className="font-display text-4xl font-extrabold text-white">Our Team</h1>
          <p className="text-slate-300 mt-2">The dedicated people behind NSS NMAMIT.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-14">
        {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((m) => (
              <div key={m.id} data-testid={`team-member-${m.id}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center hover:shadow-lg transition-shadow">
                <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-red-500 to-blue-700 grid place-items-center overflow-hidden">
                  {m.photo ? <img src={fileUrl(m.photo)} alt={m.name} className="w-full h-full object-cover" /> : <User className="h-10 w-10 text-white" />}
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mt-4">{m.name}</h3>
                <p className="text-sm text-red-600 font-medium">{m.role}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
