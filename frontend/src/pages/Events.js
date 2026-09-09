import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import EventCard from "@/components/EventCard";
import api, { fileUrl } from "@/lib/api";
import { Input } from "@/components/ui/input";

const FILTERS = ["All", "Upcoming", "Live", "Completed", "Free", "Paid"];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    api.get("/events").then((r) => setEvents(r.data)).finally(() => setLoading(false));
    api.get("/site-content").then((r) => setBanner(r.data.events_banner)).catch(() => {});
  }, []);

  const filtered = events.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "All") return true;
    if (filter === "Upcoming") return e.status === "upcoming";
    if (filter === "Live") return e.status === "live";
    if (filter === "Completed") return e.status === "completed";
    if (filter === "Free") return !e.is_paid || e.fee === 0;
    if (filter === "Paid") return e.is_paid && e.fee > 0;
    return true;
  });

  return (
    <PublicLayout>
      <div className="relative nss-hero-grad grain py-16 overflow-hidden">
        {banner && <><img src={fileUrl(banner)} alt="" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-[#0b1528]/80" /></>}
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-red-400 mb-2">Discover</p>
          <h1 className="font-display text-4xl font-extrabold text-white">NSS Events</h1>
          <p className="text-slate-300 mt-2">Register, participate and earn your service hours.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f} data-testid={`event-filter-${f.toLowerCase()}`} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f ? "bg-red-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}>{f}</button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input data-testid="event-search" placeholder="Search events..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>
        {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> :
          filtered.length === 0 ? <p className="text-center text-slate-500 py-20">No events found.</p> :
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="events-grid">{filtered.map((e) => <EventCard key={e.id} event={e} />)}</div>}
      </div>
    </PublicLayout>
  );
}
