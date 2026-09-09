import { useEffect, useState } from "react";
import { Loader2, ExternalLink, X, ChevronLeft, ChevronRight, Frame } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import api, { fileUrl } from "@/lib/api";

const CATS = ["All", "Blood Donation", "Swachh Bharat", "Annual Special Camp", "Health Camp", "Workshops"];

export default function Gallery() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("All");
  const [active, setActive] = useState(null); // {photos, index}
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    api.get("/galleries").then((r) => setGalleries(r.data)).finally(() => setLoading(false));
    api.get("/site-content").then((r) => setBanner(r.data.gallery_banner)).catch(() => {});
  }, []);

  const filtered = cat === "All" ? galleries : galleries.filter((g) => g.category === cat);

  const openLightbox = (photos, index) => setActive({ photos, index });
  const move = (d) => setActive((a) => ({ ...a, index: (a.index + d + a.photos.length) % a.photos.length }));

  return (
    <PublicLayout>
      <div className="relative nss-hero-grad grain py-16 overflow-hidden">
        {banner && <><img src={fileUrl(banner)} alt="" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-[#0b1528]/80" /></>}
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-red-400 mb-2">Memories</p>
          <h1 className="font-display text-4xl font-extrabold text-white">Gallery</h1>
          <p className="text-slate-300 mt-2">Relive the best moments of NSS service.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap gap-2 mb-8">
          {CATS.map((c) => (
            <button key={c} data-testid={`gallery-cat-${c.toLowerCase().replace(/ /g, "-")}`} onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${cat === c ? "bg-red-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>{c}</button>
          ))}
        </div>
        {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div> :
          filtered.length === 0 ? <p className="text-center text-slate-500 py-20">No galleries yet.</p> : (
            <div className="space-y-14">
              {filtered.map((g) => (
                <div key={g.id} data-testid={`gallery-${g.id}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{g.title}</h2>
                      <p className="text-sm text-slate-500">{g.category} · {g.year}</p>
                    </div>
                    {g.drive_link && <a href={g.drive_link} target="_blank" rel="noreferrer" className="text-sm text-red-600 flex items-center gap-1">Drive Album <ExternalLink className="h-3.5 w-3.5" /></a>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(g.photos || []).map((p, i) => (
                      <button key={i} onClick={() => openLightbox(g.photos, i)} className="relative aspect-square rounded-xl overflow-hidden group" data-testid={`gallery-photo-${g.id}-${i}`}>
                        <img src={fileUrl(p)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] bg-black/95 grid place-items-center" data-testid="gallery-lightbox" onClick={() => setActive(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white" onClick={() => setActive(null)}><X className="h-7 w-7" /></button>
          <button className="absolute left-4 sm:left-10 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); move(-1); }}><ChevronLeft className="h-9 w-9" /></button>
          <img src={fileUrl(active.photos[active.index])} alt="" className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-4 sm:right-10 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); move(1); }}><ChevronRight className="h-9 w-9" /></button>
          <div className="absolute bottom-6 flex items-center gap-2 text-white/60 text-sm"><Frame className="h-4 w-4" /> {active.index + 1} / {active.photos.length}</div>
        </div>
      )}
    </PublicLayout>
  );
}
