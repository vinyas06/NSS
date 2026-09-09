import { useEffect, useRef } from "react";

// Liquid cursor: a soft glowing blob that trails the pointer with easing.
export default function CursorGlow() {
  const blob = useRef(null);
  const ring = useRef(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
    const move = (e) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (blob.current) blob.current.style.opacity = "1";
      if (ring.current) ring.current.style.opacity = "1";
    };
    window.addEventListener("mousemove", move);

    let raf;
    const loop = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.18;
      pos.current.y += (target.current.y - pos.current.y) * 0.18;
      ringPos.current.x += (target.current.x - ringPos.current.x) * 0.08;
      ringPos.current.y += (target.current.y - ringPos.current.y) * 0.08;
      if (blob.current) blob.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <div ref={blob} className="pointer-events-none fixed left-0 top-0 z-[200] -ml-3 -mt-3 h-6 w-6 rounded-full mix-blend-difference"
        style={{ opacity: 0, background: "radial-gradient(circle, rgba(var(--cursor-rgb, 220,38,38),0.9), rgba(var(--cursor-rgb, 220,38,38),0) 70%)" }} />
      <div ref={ring} style={{ opacity: 0 }} className="pointer-events-none fixed left-0 top-0 z-[200] -ml-5 -mt-5 h-10 w-10 rounded-full border border-red-500/40 dark:border-blue-500/40" />
    </>
  );
}


