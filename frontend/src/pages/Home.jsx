import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPlaces } from "../utils/placeApi";
import BrandMark from "../components/BrandMark";

const guides = [
  { name: "Ravi Kumar", role: "Nature Guide", rating: "4.9 (577)", tags: ["Trekking", "Nature"], image: "/assets/guides/ravi-kumar.jpg" },
  { name: "Priya Sharma", role: "Cultural Guide", rating: "4.9 (339)", tags: ["Heritage", "Culture"], image: "/assets/guides/priya-sharma.jpg" },
  { name: "Suresh", role: "Adventure Guide", rating: "4.7 (275)", tags: ["Trekking", "Adventure"], image: "/assets/guides/suresh.jpg" }
];

const regions = [
  ["bi-building", "Asia", "Adventure - Islands"],
  ["bi-bank", "Europe", "History - Architecture"],
  ["bi-tree", "Africa", "Wildlife - Nature"],
  ["bi-mountain", "America", "Cities - Clives"],
  ["bi-brightness-high", "Oceania", "Beaches - Islands"]
];

const packageTypes = [
  ["bi-signpost-split", "Adventure", "2–7 Days", "From ₹5499"],
  ["bi-brightness-high", "Beach Getaway", "3–6 Days", "From ₹5799"],
  ["bi-building", "Spiritual Trip", "2–10 Days", "From ₹5549"],
  ["bi-buildings", "City Break", "1–5 Days", "From ₹3999"]
];

function LoginLink({ role = "user", children, className = "" }) {
  return <a className={className} href={`/login?role=${role}`}>{children}</a>;
}

export default function Home() {
  const [destinations, setDestinations] = useState([]);
  useEffect(() => { fetchPlaces({ limit: 12 }).then(setDestinations).catch(() => {}); }, []);

  const placeImages = destinations.slice(0, 2).map(x => x.image).filter(Boolean);

  return (
    <main className="story-landing">
      <section className="story-hero" id="home">
        <div className="story-hero-copy">
          <span className="story-kicker"><i className="bi bi-geo-alt-fill" /> Your Journey, Our Guidance</span>
          <h1>Your Journey.<br /><span>Our Guidance.</span></h1>
          <p>Discover beautiful destinations, trusted local guides,<br className="desktop-only" /> and affordable travel packages across India.</p>
          <div className="story-actions">
            <LoginLink className="story-btn story-btn-primary">Start Exploring <i className="bi bi-arrow-right" /></LoginLink>
            <LoginLink className="story-btn story-btn-ghost">Explore Places to Go <i className="bi bi-map" /></LoginLink>
          </div>
          <a className="story-scroll" href="#beginning"><i className="bi bi-arrow-down-circle" /> Scroll Down</a>
        </div>
        <div className="story-sky-route"><span className="route-line" /><i className="bi bi-airplane-fill" /><i className="bi bi-geo-alt-fill pin-one" /><i className="bi bi-geo-alt-fill pin-two" /></div>
        <div className="story-sun-note">Good<br />Vibes<br />Only <span>♡</span></div>
      </section>

      <section className="story-section story-beginning" id="beginning">
        <div className="story-copy">
          <span className="story-section-kicker"><i className="bi bi-geo-alt-fill" /> THE BEGINNING</span>
          <h2>Find Your Next Place.</h2>
          <p>Not sure where to go?<br />Discover places down the journey.</p>
          <LoginLink className="story-btn story-btn-primary">Explore Places to Go <i className="bi bi-arrow-right" /></LoginLink>
        </div>
        <div className="story-polaroids">
          <div className="story-photo-card one"><img src={placeImages[0] || "/assets/goa.jpg"} alt="Destination" /></div>
          <div className="story-photo-card two"><img src={placeImages[1] || "/assets/manali.jpg"} alt="Destination" /></div>
        </div>
        <LoginLink className="story-view-all">View all Places to Go <i className="bi bi-arrow-right" /></LoginLink>
        <div className="story-side-note">New places<br />New stories<br />Same you <span>♡</span></div>
      </section>

      <section className="story-section story-regions" id="destinations">
        <div className="story-section-kicker"><i className="bi bi-globe2" /> POPULAR PLACES TO GO</div>
        <div className="region-grid">
          {regions.map(([icon, name, sub]) => <div className="region-item" key={name}><span><i className={`bi ${icon}`} /></span><strong>{name}</strong><small>{sub}</small></div>)}
        </div>
      </section>

      <section className="story-section story-guides" id="guides">
        <div className="story-copy">
          <span className="story-section-kicker"><i className="bi bi-geo-alt-fill" /> LOCAL GUIDES</span>
          <h2>Go Beyond the Map.</h2>
          <p>Meet locals. Discover more. Experience<br />the place.</p>
          <LoginLink className="story-btn story-btn-primary">Find Local Guides <i className="bi bi-arrow-right" /></LoginLink>
        </div>
        <div className="guide-story-list">
          {guides.map(g => <div className="guide-story-card" key={g.name}>
            <img src={g.image} alt={`${g.name} local guide`} />
            <strong>{g.name}</strong><small>{g.role}</small><span className="guide-rating"><i className="bi bi-star-fill" /> {g.rating}</span>
            <div>{g.tags.map(t => <em key={t}>{t}</em>)}</div>
          </div>)}
        </div>
      </section>

      <section className="story-section story-packages" id="packages">
        <div className="story-copy">
          <span className="story-section-kicker"><i className="bi bi-box-seam" /> TRAVEL PACKAGES</span>
          <h2>Make the Journey Yours.</h2>
          <p>Choose an experience that fits your time<br />and budget.</p>
          <LoginLink className="story-btn story-btn-primary">Explore Packages <i className="bi bi-arrow-right" /></LoginLink>
        </div>
        <div className="package-story-list">
          {packageTypes.map(([icon, name, days, price]) => <div className="package-story-card" key={name}><span><i className={`bi ${icon}`} /></span><strong>{name}</strong><small>{days}</small><b>{price}</b></div>)}
        </div>
      </section>

      <section className="story-section story-trust" id="trust">
        <div className="story-copy">
          <span className="story-section-kicker"><i className="bi bi-shield-check" /> TRUST &amp; VERIFICATION</span>
          <h2>Travel With Confidence.</h2>
          <p>Verified places. Trusted guides. Better journeys.</p>
        </div>
        <div className="trust-list">
          {[['bi-shield-check', 'Verified Places', 'Only authentic & trusted places.'], ['bi-person-check', 'Verified Guides', 'Background checked local guides.'], ['bi-patch-check', 'Verified Packages', 'Verified experiences & safe bookings.']].map(([icon, title, text]) => <div key={title}><span><i className={`bi ${icon}`} /></span><strong>{title}</strong><small>{text}</small></div>)}
          <div className="trust-shield"><i className="bi bi-shield-fill-check" /></div>
        </div>
      </section>

      <section className="story-section story-how" id="how-it-works">
        <div className="story-copy">
          <span className="story-section-kicker"><i className="bi bi-signpost-2-fill" /> HOW IT WORKS</span>
          <h2>The STG Journey</h2>
          <p>One place to bring your journey together.</p>
        </div>
        <div className="journey-flow">
          {[['bi-search', 'Search', 'Find your best'], ['bi-map', 'Discover', 'Explore places'], ['bi-people', 'Connect', 'Choose places'], ['bi-calendar-check', 'Plan', 'Choose options'], ['bi-airplane', 'Travel', 'Create memories']].map(([icon, title, text], i) => <React.Fragment key={title}><div className="journey-step"><span><i className={`bi ${icon}`} /></span><strong>{title}</strong><small>{text}</small></div>{i < 4 && <b className="journey-arrow">→</b>}</React.Fragment>)}
        </div>
      </section>

      <section className="story-final" id="about">
        <div>
          <span className="story-section-kicker"><i className="bi bi-geo-alt-fill" /> YOUR NEXT JOURNEY AWAITS</span>
          <h2>Where will you go?</h2>
          <p>You bring the curiosity. We bring the possibilities.</p>
          <div className="story-actions"><LoginLink className="story-btn story-btn-primary">Start Your journey <i className="bi bi-arrow-right" /></LoginLink><LoginLink className="story-btn story-btn-ghost">Explore Places to Go</LoginLink></div>
        </div>
      </section>

      <footer className="story-footer">
        <div className="footer-brand"><BrandMark className="big story-footer-logo"/><div><strong>Smart Travel Guide</strong><small>Plan Smart, Travel Better</small></div></div>
        <div><strong>Quick Links</strong><LoginLink>Discover Places</LoginLink><LoginLink>Find Local Guides</LoginLink><LoginLink>Explore Packages</LoginLink><LoginLink>Plan Trips</LoginLink><LoginLink>Save Experiences</LoginLink></div>
        <div><strong>Help Desk</strong><span>Support</span><span>FAQ</span><span>Contact Us</span></div>
        <div><strong>Follow Us</strong><span className="footer-social"><i className="bi bi-instagram" /><i className="bi bi-facebook" /><i className="bi bi-twitter-x" /><i className="bi bi-linkedin" /></span><small>Explore more inspiration.</small></div>
        <div className="footer-copy">© 2025 Smart Travel Guide. All rights reserved.</div>
      </footer>
    </main>
  );
}
