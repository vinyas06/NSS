import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, ArrowDown, ArrowRight, Menu, X, Heart, Pause, Play, Plus, Sun, Moon, MapPin, Mail, Phone, Instagram, Linkedin, HeartHandshake, Users, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import "./Home.css";
const asset = (name) => `${process.env.PUBLIC_URL}/assets/nss/${name}`;
const photos = ["community.jpeg", "iskcon.jpeg", "candid-one.jpeg"];
export const FEATURED_EVENTS = [
  { id: "old-age-home", title: "A little time. A lot of love.", name: "Old age home visit", category: "COMMUNITY & CARE", photo: "community.jpeg", description: "A visit centred on companionship, connection and the simple joy of being there for someone.", date: "2026-09-05" },
  { id: "iskcon", title: "Together, beyond campus.", name: "ISKCON visit", category: "CULTURE & CONNECTION", photo: "iskcon.jpeg", description: "Stepping beyond the classroom to explore community, reflect on our values and share an experience together.", date: "2026-09-05" },
];
export function LandingNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  return <header className="landing-nav">
    <Link to="/" className="landing-brand" aria-label="NSS NMAMIT home"><img src={asset("logo.webp")} alt="NSS" /><span /><img src={asset("nmamit.png")} alt="NMAM Institute of Technology, Nitte" /></Link>
    <nav className={open ? "landing-links is-open" : "landing-links"} aria-label="Main navigation" id="landing-navigation">
      <Link to="/" onClick={() => setOpen(false)}>Home</Link><Link to="/explore" onClick={() => setOpen(false)}>Explore</Link><a href="/#about" onClick={() => setOpen(false)}>About</a><a href="/#events" onClick={() => setOpen(false)}>Events</a><Link to="/gallery" onClick={() => setOpen(false)}>Gallery</Link><Link to="/team" onClick={() => setOpen(false)}>Team</Link>
    </nav>
    <div className="landing-nav-actions"><button className="landing-theme-toggle" onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><Link className="landing-login" to={user ? "/profile" : "/login"}>{user ? "My profile" : "Login"}<ArrowUpRight size={15} /></Link><button className="landing-menu" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="landing-navigation" onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>{open ? <X /> : <Menu />}</button></div>
  </header>;
}
export function Reveal({ children, className = "", delay = 0 }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}
export function FeaturedEvents() {
  return <div className="landing-event-grid">{FEATURED_EVENTS.map((event, i) => <Reveal key={event.id} delay={i * 0.12}>
    <Link className="landing-event" to={`/explore#${event.id}`}><div className="event-image"><img src={asset(event.photo)} alt={`NSS NMAMIT volunteers at the ${event.name.toLowerCase()}`} loading="lazy" /><span className="event-date">05 <small>SEP 2026</small></span><span className="event-arrow"><ArrowUpRight /></span></div><div className="event-meta"><span>{event.category}</span><span>05.09.2026</span></div><h3>{event.name}</h3><p>{event.description}</p></Link>
  </Reveal>)}</div>;
}
export function LandingFooter() {
  return <footer className="nss-footer" id="contact">
    <div className="footer-topline"><span>LET’S DO SOMETHING GOOD. TOGETHER.</span><a href="mailto:NSSNMAMIT@GMAIL.COM">Say hello <ArrowUpRight size={20} /></a></div>
    <div className="footer-columns">
      <div className="footer-identity"><Link to="/" className="footer-brand"><img src={asset("logo.webp")} alt="NSS" /><span>NSS <b>NMAMIT</b><small>NOT ME, BUT YOU.</small></span></Link><p>A community of students. A shared sense of purpose. Bringing compassion to life, one small act at a time.</p><div className="footer-socials"><a href="https://www.instagram.com/nss_nmamit/" target="_blank" rel="noreferrer" aria-label="NSS NMAMIT on Instagram"><Instagram size={19} /></a><a href="https://www.linkedin.com/school/nitte-nmamit/" target="_blank" rel="noreferrer" aria-label="NMAMIT on LinkedIn"><Linkedin size={19} /></a><a href="mailto:NSSNMAMIT@GMAIL.COM" aria-label="Email NSS NMAMIT"><Mail size={19} /></a></div></div>
      <nav className="footer-link-column" aria-label="Footer navigation"><h3>Explore</h3><Link to="/">Home</Link><a href="/#about">About NSS</a><Link to="/explore">Our diary</Link><Link to="/events">Events</Link><Link to="/gallery">Gallery</Link><Link to="/team">Our team</Link><Link to="/verify">Verify certificate</Link></nav>
      <nav className="footer-link-column" aria-label="Legal and policies"><h3>Legal & policies</h3><Link to="/legal#privacy">Privacy policy</Link><Link to="/legal#terms">Terms of service</Link><Link to="/legal#refund">Refund policy</Link><Link to="/legal#shipping">Shipping policy</Link><a href="#contact">Contact us</a></nav>
      <div className="footer-contact"><h3>Find us. Reach us.</h3><a href="https://www.google.com/maps/search/?api=1&query=NMAM+Institute+of+Technology+Nitte+Karkala+Karnataka+574110" target="_blank" rel="noreferrer"><MapPin size={19} /><span>NMAM Institute of Technology,<br />Nitte, Karkala,<br />Karnataka 574110 <small>VIEW ON MAPS ↗</small></span></a><a href="mailto:NSSNMAMIT@GMAIL.COM"><Mail size={18} /><span>NSSNMAMIT@GMAIL.COM</span></a><a href="tel:+919449913588"><Phone size={18} /><span>+91 94499 13588</span></a></div>
    </div>
    <div className="footer-signoff"><span>© {new Date().getFullYear()} NSS NMAMIT. All rights reserved.</span><span>Made for the community. With purpose.</span><a href="https://nitte.edu.in/nmamit/nss.php" target="_blank" rel="noreferrer">NSS at Nitte <ArrowUpRight size={13} /></a></div>
    <div className="footer-big-type" aria-hidden="true">NOT ME. <span>BUT YOU.</span></div>
  </footer>;
}
function HeroGraphics() {
  return <div className="hero-art" aria-hidden="true"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✧</span><span className="art-dot dot-one" /><span className="art-dot dot-two" /><div className="floating-memory memory-left"><img src={asset("candid-one.jpeg")} alt="" /><span><Heart size={12} /> SMALL ACTS. BIG HEARTS.</span></div><div className="floating-memory memory-right"><img src={asset("iskcon.jpeg")} alt="" /><span><Users size={12} /> BETTER, TOGETHER.</span></div><div className="hero-art-note"><HeartHandshake size={19} /><span>ROOTED IN SERVICE.<br />CONNECTED BY PURPOSE.</span></div></div>;
}
function ServiceGraphic() {
  return <section className="service-graphic-section"><Reveal className="service-graphic-inner"><div className="service-visual" aria-hidden="true"><div className="service-ring ring-one" /><div className="service-ring ring-two" /><div className="service-ring ring-three" /><div className="service-core"><HeartHandshake size={64} strokeWidth={1.25} /></div><span className="service-node node-heart"><Heart size={23} /></span><span className="service-node node-people"><Users size={24} /></span><span className="service-node node-spark"><Sparkles size={24} /></span><span className="service-orbit-label">ONE COMMUNITY. MANY WAYS TO CARE.</span></div><div className="service-graphic-copy"><span className="section-label">THE IDEA THAT CONNECTS US</span><h2>We show up.<br />We <em>make it count.</em></h2><p>A conversation. A shared experience. A hand when it’s needed. Meaningful change begins with the willingness to care.</p><div className="service-principles"><span><Heart size={16} /> Care deeply</span><span><Users size={16} /> Work together</span><span><Sparkles size={16} /> Leave a little good</span></div><Link className="text-link" to="/register">Find your place in NSS <ArrowUpRight size={18} /></Link></div></Reveal></section>;
}
export default function Home() {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const [intro, setIntro] = useState(!reduced);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const hero = useRef(null);
  const motto = useRef(null);
  const { scrollYProgress } = useScroll({ target: hero, offset: ["start start", "end start"] });
  useEffect(() => {
    const section = hero.current;
    const heading = motto.current;
    const alignWatermark = () => {
      section.style.setProperty("--motto-center", `${heading.parentElement.offsetTop + heading.offsetTop + heading.offsetHeight / 2}px`);
    };
    alignWatermark();
    const observer = new ResizeObserver(alignWatermark);
    observer.observe(section);
    observer.observe(heading.parentElement);
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 140]);
  const pointerX = useSpring(0, { stiffness: 65, damping: 25 });
  const pointerY = useSpring(0, { stiffness: 65, damping: 25 });
  useEffect(() => { const timer = setTimeout(() => setIntro(false), reduced ? 0 : 800); return () => clearTimeout(timer); }, [reduced]);
  useEffect(() => {
    if (paused || reduced) return;
    const timer = setInterval(() => { if (!document.hidden) setSlide(s => (s + 1) % photos.length); }, 5500);
    return () => clearInterval(timer);
  }, [paused, reduced]);
  useEffect(() => { if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView(); else window.scrollTo(0, 0); }, []);
  return <div className={`nss-landing ${intro ? "is-intro" : "is-ready"}`}>
    <a href="#about" className="landing-skip">Skip to content</a><LandingNav />
    <main><section className="landing-hero" ref={hero} onPointerMove={(e) => { if (!reduced && window.innerWidth > 760 && e.pointerType === "mouse") { pointerX.set((e.clientX / window.innerWidth - 0.5) * 22); pointerY.set((e.clientY / window.innerHeight - 0.5) * 16); } }} onPointerLeave={() => { pointerX.set(0); pointerY.set(0); }}>
      <motion.div className="hero-photo-layer" style={{ y: heroY }} aria-hidden="true">{photos.map((photo, i) => <img key={photo} className={i === slide ? "active" : ""} src={asset(photo)} alt="" fetchPriority={i === 0 ? "high" : "auto"} />)}</motion.div><div className="hero-wash" /><HeroGraphics />
      <motion.div className="skeleton-position" style={{ x: pointerX, y: pointerY }}><img className="hero-skeleton" src={asset(theme === "dark" ? "skeleton-white.png" : "skeleton.png")} alt="" aria-hidden="true" /></motion.div>
      <div className="intro-indicator" role="status" aria-hidden={!intro}><span className="intro-spinner" /><span>SPIRIT OF SERVICE</span></div>
      <div className="hero-content"><div className="hero-logos landing-brand"><img src={asset("logo.webp")} alt="NSS" /><span /><img src={asset("nmamit.png")} alt="NMAM Institute of Technology, Nitte" /></div><h1 ref={motto}><span>NOT ME,</span><em>BUT YOU<span className="motto-period">.</span></em></h1><p>A little of our time. A little of our heart.<br />A world of difference, together.</p><div className="hero-brief">The student community at NMAMIT turning<br className="desktop-break" /> compassion into action, on campus and beyond.</div><Link to="/explore" className="landing-button" data-testid="hero-explore-btn">Explore our world <span><ArrowUpRight size={19} /></span></Link></div>
      <div className="hero-bottom"><a href="#about" className="scroll-cue"><span><ArrowDown size={16} /></span>SCROLL TO FEEL THE DIFFERENCE</a><div className="carousel-controls" aria-label="Hero slideshow"><span className="slide-number">0{slide + 1}<i> / 03</i></span>{photos.map((_, i) => <button key={i} className={slide === i ? "active" : ""} onClick={() => setSlide(i)} aria-label={`Show photograph ${i + 1}`} aria-pressed={slide === i} />)}<button className="carousel-pause" onClick={() => setPaused(!paused)} aria-label={paused ? "Play slideshow" : "Pause slideshow"}>{paused ? <Play size={13} /> : <Pause size={13} />}</button></div></div><span className="hero-side-note">EST. IN SERVICE · ROOTED IN COMMUNITY</span>
    </section>
    <div className="values-strip"><span>COMPASSION IN ACTION</span><Plus /><span>COMMUNITY AT HEART</span><Plus /><span>SERVICE WITH PURPOSE</span><Plus /><span>NOT ME, BUT YOU</span><Plus /></div>
    <section className="landing-section about-section" id="about"><Reveal className="section-label"><span>01 / THE HEART OF NSS</span><span>A CAMPUS. A COMMUNITY. A CALLING.</span></Reveal><div className="about-grid"><Reveal className="about-copy"><h2>More than a unit.<br />A way of <em>being.</em></h2><h3>What is NSS at NMAMIT?</h3><p>We are the National Service Scheme at NMAM Institute of Technology, Nitte — a voluntary community of students and teachers united by the belief that we grow when we give.</p><p>Through community service, we learn to listen, understand local needs and share responsibility. Every experience is a chance to become a more thoughtful leader and a more responsible citizen.</p><a className="text-link" href="https://nitte.edu.in/nmamit/nss.php" target="_blank" rel="noreferrer">Our purpose, in a little more detail <ArrowUpRight size={17} /></a></Reveal><Reveal className="about-photos" delay={0.15}><div className="about-photo-main"><img src={asset("community.jpeg")} alt="The NSS NMAMIT volunteer community gathered together" loading="lazy" /><span>THE PEOPLE BEHIND THE PURPOSE ↗</span></div><div className="about-photo-small"><img src={asset("candid-one.jpeg")} alt="A moment of connection during the old age home visit" loading="lazy" /></div><div className="about-stamp"><Heart size={22} /><span>HERE TO<br />MAKE A DIFFERENCE</span></div></Reveal></div></section>
    <section className="work-section" id="work"><div className="landing-section"><Reveal className="section-label"><span>02 / SMALL ACTS, REAL IMPACT</span><span>THIS IS HOW WE SHOW UP</span></Reveal><Reveal className="section-heading"><h2>Good intentions.<br /><em>Even better actions.</em></h2><p>Listening. Learning. Lending a hand.<br />Service takes many forms. The heart stays the same.</p></Reveal><div className="work-grid"><Reveal className="work-card work-tall"><img src={asset("candid-two.jpeg")} alt="NSS volunteers spending time with the community" loading="lazy" /><div><span>01 — CONNECT</span><h3>People first.<br />Always.</h3><p>Companionship, outreach and showing up for the people around us.</p></div></Reveal><div className="work-stack"><Reveal className="work-card work-wide"><img src={asset("iskcon.jpeg")} alt="NSS students exploring together on their ISKCON visit" loading="lazy" /><div><span>02 — DISCOVER</span><h3>Step out. Grow together.</h3><p>Shared experiences that open minds and bring us closer.</p></div></Reveal><Reveal className="work-note"><span>03 — TAKE RESPONSIBILITY</span><h3>A better tomorrow<br />starts with <em>us.</em></h3><p>Understanding community needs. Sharing responsibility. Learning to lead through service.</p><ArrowUpRight className="work-note-arrow" size={45} /></Reveal></div></div></div></section>
    <ServiceGraphic /><section className="landing-section events-section" id="events"><Reveal className="section-label"><span>03 / MOMENTS THAT MATTER</span><span>THE NSS DIARY</span></Reveal><Reveal className="section-heading"><h2>Out there.<br /><em>Making memories.</em></h2><div><p>Community visits, shared experiences,<br />and days that stay with us.</p><Link className="text-link" to="/explore">Explore the diary <ArrowUpRight size={17} /></Link></div></Reveal><FeaturedEvents /></section>
    <section className="join-section"><Reveal><span className="section-label">YOUR TIME CAN MEAN THE WORLD TO SOMEONE.</span><h2>Be a part of<br /><em>something good.</em><span className="join-star">✳</span></h2><p>You bring the heart. We’ll find a way to make a difference.</p><Link to="/register" className="landing-button">Become a volunteer <span><ArrowRight size={19} /></span></Link></Reveal></section>
    </main><LandingFooter />
  </div>;
}


