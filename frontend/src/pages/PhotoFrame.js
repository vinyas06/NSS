import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Upload, Download, Frame as FrameIcon, ImageIcon } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { NSS_LOGO } from "@/components/Brand";
import { Button } from "@/components/ui/button";

const FRAMES = [
  { id: "crimson", name: "Crimson Pride", border: "#DC2626", bg: "#0b1528" },
  { id: "navy", name: "Nitte Navy", border: "#1E3A8A", bg: "#0b1528" },
  { id: "gold", name: "Service Gold", border: "#D4A017", bg: "#1a1206" },
];

export default function PhotoFrame() {
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);
  const [frame, setFrame] = useState(FRAMES[0]);
  const [logoImg, setLogoImg] = useState(null);

  useEffect(() => {
    const l = new Image();
    l.crossOrigin = "anonymous";
    l.onload = () => setLogoImg(l);
    l.src = NSS_LOGO;
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (img) draw(); }, [img, frame, logoImg]);

  const onUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const image = new Image();
      image.onload = () => setImg(image);
      image.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const draw = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    const S = 1080;
    c.width = S; c.height = S;
    // background
    ctx.fillStyle = frame.bg;
    ctx.fillRect(0, 0, S, S);
    // photo area
    const pad = 70;
    const inner = S - pad * 2 - 120; // leave bottom band
    // cover-fit photo into square inner area
    const ar = img.width / img.height;
    let dw = inner, dh = inner, sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (ar > 1) { sw = img.height; sx = (img.width - sw) / 2; }
    else { sh = img.width; sy = (img.height - sh) / 2; }
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, pad, inner, inner, 24);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, pad, pad, dw, dh);
    ctx.restore();
    // decorative border
    ctx.strokeStyle = frame.border;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.roundRect(pad - 10, pad - 10, inner + 20, inner + 20, 30);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, S - 48, S - 48);
    // logo
    if (logoImg) ctx.drawImage(logoImg, pad, S - 128, 92, 92);
    // text band
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px Sora, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("NSS · NMAMIT", pad + 108, S - 78);
    ctx.fillStyle = frame.border;
    ctx.font = "600 26px 'IBM Plex Sans', sans-serif";
    ctx.fillText("NOT ME BUT YOU", pad + 108, S - 44);
  };

  const download = () => {
    if (!img) return toast.error("Upload a photo first");
    const link = document.createElement("a");
    link.download = "nss-nmamit-frame.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    toast.success("Downloaded your NSS commemorative photo");
  };

  return (
    <PublicLayout>
      <div className="nss-hero-grad grain py-16">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-red-400 mb-2">Show Your Pride</p>
          <h1 className="font-display text-4xl font-extrabold text-white flex items-center gap-3"><FrameIcon className="h-8 w-8" /> NSS Photo Frame</h1>
          <p className="text-slate-300 mt-2">Add your photo to an official NSS NMAMIT commemorative frame and download it.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-10">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid place-items-center">
            {img ? <canvas ref={canvasRef} className="w-full h-full" /> : (
              <div className="text-center text-slate-400"><ImageIcon className="h-12 w-12 mx-auto mb-2" /><p>Your framed photo appears here</p></div>
            )}
            {!img && <canvas ref={canvasRef} className="hidden" />}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label>
              <Button variant="outline" className="w-full h-12" onClick={() => document.getElementById("pf-upload").click()} data-testid="photoframe-upload">
                <Upload className="h-4 w-4 mr-2" /> Upload Your Photo
              </Button>
              <input id="pf-upload" type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Choose a frame</p>
            <div className="grid grid-cols-3 gap-3">
              {FRAMES.map((f) => (
                <button key={f.id} onClick={() => setFrame(f)} data-testid={`frame-${f.id}`}
                  className={`rounded-xl p-4 border-2 transition-all ${frame.id === f.id ? "border-red-500 scale-105" : "border-slate-200 dark:border-slate-800"}`}
                  style={{ background: f.bg }}>
                  <div className="h-10 rounded-lg border-4" style={{ borderColor: f.border }} />
                  <div className="text-xs text-white mt-2">{f.name}</div>
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full h-12 bg-red-600 hover:bg-red-700" onClick={download} disabled={!img} data-testid="photoframe-download">
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
          <p className="text-xs text-slate-400">Tip: use a square-ish photo for best results. Everything is processed in your browser — nothing is uploaded.</p>
        </div>
      </div>
    </PublicLayout>
  );
}
