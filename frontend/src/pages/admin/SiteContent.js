import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, Save, Image as ImageIcon } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import api, { fileUrl, uploadFile, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AdminSiteContent() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => { api.get("/site-content").then((r) => setContent(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const save = async (updated) => {
    setBusy(true);
    try {
      const { data } = await api.put("/admin/site-content", updated);
      setContent(data);
      toast.success("Site content updated");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const addCarousel = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setBusy(true);
    const paths = [];
    for (const f of files) { const { path } = await uploadFile(f, "carousel"); paths.push(path); }
    save({ home_carousel: [...(content.home_carousel || []), ...paths] });
  };

  const removeCarousel = (idx) => save({ home_carousel: content.home_carousel.filter((_, i) => i !== idx) });

  const setBanner = async (key, e) => {
    const f = e.target.files[0]; if (!f) return;
    const { path } = await uploadFile(f, "banners");
    save({ [key]: path });
  };

  if (loading) return <AdminLayout title="Site Content"><div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div></AdminLayout>;

  return (
    <AdminLayout title="Site Content">
      <div className="space-y-8 max-w-4xl">
        {/* Home carousel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-display font-bold text-slate-900 dark:text-white">Home Carousel</h3><p className="text-sm text-slate-400">Images shown in the home page hero slideshow.</p></div>
            <label><Button variant="outline" disabled={busy} onClick={() => document.getElementById("car-up").click()} data-testid="carousel-add"><Upload className="h-4 w-4 mr-1" />Add Images</Button><input id="car-up" type="file" accept="image/*" multiple className="hidden" onChange={addCarousel} /></label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(content.home_carousel || []).map((p, i) => (
              <div key={i} className="relative aspect-video rounded-xl overflow-hidden group" data-testid={`carousel-item-${i}`}>
                <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeCarousel(i)} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100" data-testid={`carousel-remove-${i}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {(content.home_carousel || []).length === 0 && <div className="col-span-full text-center text-slate-400 py-8"><ImageIcon className="h-8 w-8 mx-auto mb-1" />No carousel images</div>}
          </div>
        </div>

        {/* Page banners */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[["events_banner", "Events Banner"], ["gallery_banner", "Gallery Banner"], ["team_banner", "Team Banner"]].map(([key, label]) => (
            <div key={key} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <h4 className="font-medium text-sm text-slate-700 dark:text-slate-200 mb-2">{label}</h4>
              <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3">{content[key] && <img src={fileUrl(content[key])} alt="" className="w-full h-full object-cover" />}</div>
              <label><Button size="sm" variant="outline" className="w-full" onClick={() => document.getElementById(`ban-${key}`).click()} data-testid={`banner-${key}`}><Upload className="h-3.5 w-3.5 mr-1" />Change</Button><input id={`ban-${key}`} type="file" accept="image/*" className="hidden" onChange={(e) => setBanner(key, e)} /></label>
            </div>
          ))}
        </div>

        {/* Default theme */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-display font-bold text-slate-900 dark:text-white mb-1">Default Theme</h3>
          <p className="text-sm text-slate-400 mb-4">Preferred default appearance for new visitors.</p>
          <div className="flex gap-3">
            {["light", "dark"].map((t) => (
              <button key={t} onClick={() => save({ theme: t })} data-testid={`theme-${t}`}
                className={`px-5 py-2.5 rounded-xl border-2 capitalize text-sm font-medium ${content.theme === t ? "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
