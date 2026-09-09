import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, IndianRupee } from "lucide-react";
import { fileUrl } from "@/lib/api";

const STATUS_STYLE = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  live: "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse",
  upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  not_started: "bg-blue-50 text-blue-700 border-blue-200",
  full: "bg-amber-50 text-amber-800 border-amber-200",
  closed: "bg-slate-100 text-slate-600 border-slate-300",
  completed: "bg-slate-100 text-slate-600 border-slate-300",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  postponed: "bg-rose-50 text-rose-700 border-rose-200",
  compulsory: "bg-purple-50 text-purple-700 border-purple-200",
};

function badgeLabel(e) {
  if (e.status === "live") return "LIVE";
  if (e.compulsory) return "COMPULSORY";
  if (e.status === "completed") return "COMPLETED";
  if (e.status === "cancelled") return "CANCELLED";
  if (e.reg_state === "full") return "FULL";
  if (e.status === "upcoming") return "UPCOMING";
  return e.reg_state?.toUpperCase() || "EVENT";
}

export default function EventCard({ event }) {
  const nav = useNavigate();
  const st = event.status === "live" ? "live" : (event.compulsory ? "compulsory" : (event.reg_state || event.status));
  const pct = event.capacity > 0 ? Math.min(100, Math.round((event.registered_count / event.capacity) * 100)) : 0;

  return (
    <div data-testid={`event-card-${event.id}`}
      className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={() => nav(`/events/${event.id}`)}>
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <img src={fileUrl(event.thumbnail) || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800"} alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <span className={`absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[st] || STATUS_STYLE.upcoming}`}>
          {badgeLabel(event)}
        </span>
        <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/70 text-white backdrop-blur">
          {event.is_paid && event.fee > 0 ? <span className="flex items-center"><IndianRupee className="h-3 w-3" />{event.fee}</span> : "FREE"}
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 line-clamp-1">{event.name}</h3>
        <div className="mt-3 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-red-500" />{event.event_date ? new Date(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBA"}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-red-500" />{event.location || "TBA"}</div>
        </div>
        {event.capacity > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.registered_count}/{event.capacity}</span>
              <span>{pct}% full</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 to-red-600" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        <button data-testid={`event-card-action-${event.id}`}
          className="mt-4 w-full py-2.5 rounded-xl font-semibold text-sm bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white transition-colors">
          {event.status === "completed" ? "Explore Event" : event.can_register ? "Join Event" : "View Details"}
        </button>
      </div>
    </div>
  );
}
