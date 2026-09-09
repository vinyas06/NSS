import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import { LandingNav, LandingFooter, Reveal, FEATURED_EVENTS } from "./Home";
export default function Explore() {
  useEffect(() => { const id = window.location.hash.slice(1); if (id) document.getElementById(id)?.scrollIntoView(); else window.scrollTo(0, 0); }, []);
  return <div className="nss-landing explore-page"><LandingNav /><main className="landing-section"><Link to="/" className="text-link"><ArrowLeft size={16} /> Back to home</Link><Reveal><div className="section-label">THE NSS DIARY / 2026</div><h1>Our world.<br /><em>A little closer.</em></h1><p className="explore-intro">Meet the moments and the people that give our motto meaning.</p></Reveal><div className="explore-events">{FEATURED_EVENTS.map(event => <article id={event.id} key={event.id}><Reveal><img className="explore-event-photo" src={`${process.env.PUBLIC_URL}/assets/nss/${event.photo}`} alt={`NSS NMAMIT ${event.name}`} loading="lazy" /><div className="event-meta"><span>{event.category}</span><time dateTime={event.date}>5 SEPTEMBER 2026</time></div><h2>{event.name}</h2><h3>{event.title}</h3><p>{event.description}</p></Reveal></article>)}</div><Link className="landing-button" to="/events">Browse the events portal <span><ArrowUpRight size={18} /></span></Link></main><LandingFooter /></div>;
}
