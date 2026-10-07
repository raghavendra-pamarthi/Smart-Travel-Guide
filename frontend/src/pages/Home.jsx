import React from "react";
import { Link } from "react-router-dom";
import BrandMark from "../components/BrandMark";

const guides = [
  { name: "Ravi Kumar", role: "Nature & Trekking Guide", rating: "4.9 (577)", tags: ["Trekking", "Nature"], image: "https://images.pexels.com/photos/33261955/pexels-photo-33261955.jpeg?cs=srgb&dl=pexels-monirulislam-33261955.jpg&fm=jpg", fallback: "/assets/guides/ravi-kumar.jpg" },
  { name: "Priya Sharma", role: "Cultural & Heritage Guide", rating: "4.9 (339)", tags: ["Heritage", "Culture"], image: "https://images.pexels.com/photos/37602129/pexels-photo-37602129.jpeg?cs=srgb&dl=pexels-upenderphotography-37602129.jpg&fm=jpg", fallback: "/assets/guides/priya-sharma.jpg" },
  { name: "Suresh", role: "Adventure Sports Guide", rating: "4.7 (275)", tags: ["Trekking", "Adventure"], image: "https://images.pexels.com/photos/36876208/pexels-photo-36876208.jpeg?cs=srgb&dl=pexels-satya-pic-339537086-36876208.jpg&fm=jpg", fallback: "/assets/guides/suresh.jpg" }
];

const regions = [
  ["bi-building", "Asia", "Adventure & Islands", "45+ Places"],
  ["bi-bank", "Europe", "History & Architecture", "38+ Places"],
  ["bi-tree", "Africa", "Wildlife & Safaris", "25+ Places"],
  ["bi-compass", "America", "Scenic Cities & Canyons", "40+ Places"],
  ["bi-brightness-high", "Oceania", "Beaches & Reefs", "30+ Places"]
];

const packageTypes = [
  ["bi-signpost-split", "Adventure Expeditions", "2–7 Days", "₹5,499"],
  ["bi-brightness-high", "Beach Getaways", "3–6 Days", "₹5,799"],
  ["bi-building", "Spiritual & Heritage", "2–10 Days", "₹5,549"],
  ["bi-buildings", "City Weekend Breaks", "1–5 Days", "₹3,999"]
];

function LoginLink({ role = "user", children, className = "" }) {
  return <a className={className} href={`/login?role=${role}`}>{children}</a>;
}

export default function Home() {
  return (
    <main className="story-landing">
      {/* 1. HERO SECTION */}
      <section className="story-hero" id="home">
        <div className="story-hero-container">
          <div className="story-hero-copy">
            <span className="story-kicker">
              <i className="bi bi-shield-check" /> Verified Tourism &amp; Local Guide Platform
            </span>
            <h1>
              Your Journey.<br />
              <span className="story-hero-accent">Our Guidance.</span>
            </h1>
            <p>
              Discover authentic destinations, book verified local guides, and explore handpicked travel
              packages across India with complete peace of mind.
            </p>
            <div className="story-actions">
              <LoginLink className="story-btn story-btn-primary">
                Start Exploring <i className="bi bi-arrow-right" />
              </LoginLink>
              <LoginLink className="story-btn story-btn-ghost">
                <i className="bi bi-compass" /> Explore Places to Go
              </LoginLink>
            </div>
            <div className="story-hero-perks">
              <span><i className="bi bi-patch-check-fill" /> 100% Vetted Guides</span>
              <span><i className="bi bi-cash-stack" /> Transparent Pricing</span>
              <span><i className="bi bi-headset" /> 24/7 Traveler Care</span>
            </div>
            <a className="story-scroll" href="#beginning">
              <i className="bi bi-arrow-down-circle" /> Explore Destinations
            </a>
          </div>


        </div>
      </section>

      {/* 2. THE BEGINNING / CURATED DESTINATIONS */}
      <section className="story-section story-beginning" id="beginning">
        <div className="story-beginning-container">
          <div className="story-copy">
            <span className="story-section-kicker">
              <i className="bi bi-compass-fill" /> CURATED DESTINATIONS
            </span>
            <h2>Find Your Next Escape.</h2>
            <p>
              Not sure where to begin? Explore iconic sights, coastal hideaways, and high-altitude
              treks handpicked by local insiders.
            </p>
            <LoginLink className="story-btn story-btn-primary">
              Explore Places to Go <i className="bi bi-arrow-right" />
            </LoginLink>
          </div>

          <div className="story-destination-visuals" aria-label="Featured tourist destinations">
            <div className="destination-photo destination-photo-back"><img src="/assets/manali.jpg" alt="Scenic mountain tourist destination" /></div>
            <div className="destination-photo destination-photo-front"><img src="/assets/agra.jpg" alt="Taj Mahal tourist destination" /></div>
          </div>
        </div>
        <div className="story-beginning-foot">
          <LoginLink className="story-view-all">
            View all Curated Places <i className="bi bi-arrow-right" />
          </LoginLink>
        </div>
      </section>

      {/* 3. POPULAR PLACES TO GO */}
      <section className="story-section story-regions" id="destinations">
        <div className="section-head-center">
          <span className="story-section-kicker">
            <i className="bi bi-globe-americas" /> GLOBAL &amp; REGIONAL EXPEDITIONS
          </span>
          <h2>Explore Destinations by Region</h2>
          <p>Browse signature travels categorized by continent, landscape, and trip vibe.</p>
        </div>
        <div className="region-grid">
          {regions.map(([icon, name, sub, count]) => (
            <div className="region-item-card" key={name}>
              <div className="region-icon-box">
                <i className={`bi ${icon}`} />
              </div>
              <div className="region-card-info">
                <strong>{name}</strong>
                <small>{sub}</small>
                <span className="region-count-badge">{count}</span>
              </div>
              <span className="region-explore-arrow"><i className="bi bi-chevron-right" /></span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. LOCAL GUIDES */}
      <section className="story-section story-guides" id="guides">
        <div className="story-copy">
          <span className="story-section-kicker">
            <i className="bi bi-person-badge-fill" /> LOCAL EXPERTISE
          </span>
          <h2>Go Beyond the Map.</h2>
          <p>
            Meet background-checked local guides who know the culture, secret trails, and untold
            histories of every place you visit.
          </p>
          <LoginLink className="story-btn story-btn-primary">
            Find Local Guides <i className="bi bi-arrow-right" />
          </LoginLink>
        </div>
        <div className="guide-story-list">
          {guides.map(g => (
            <div className="guide-story-card" key={g.name}>
              <div className="guide-avatar-wrap">
                <img src={g.image} alt={`${g.name} local guide`} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = g.fallback; }} />
                <span className="guide-badge-verified" title="Verified Guide">
                  <i className="bi bi-patch-check-fill" />
                </span>
              </div>
              <div className="guide-card-details">
                <strong>{g.name}</strong>
                <span className="guide-card-role">{g.role}</span>
                <span className="guide-rating">
                  <i className="bi bi-star-fill" /> {g.rating}
                </span>
                <div className="guide-tags">
                  {g.tags.map(t => <span key={t} className="guide-tag">{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. TRAVEL PACKAGES */}
      <section className="story-section story-packages" id="packages">
        <div className="story-copy">
          <span className="story-section-kicker">
            <i className="bi bi-box-seam-fill" /> HANDPICKED EXPERIENCES
          </span>
          <h2>Make the Journey Yours.</h2>
          <p>
            All-inclusive packages tailored for solo travelers, couples, and groups. Verified
            itineraries with transparent upfront pricing.
          </p>
          <LoginLink className="story-btn story-btn-primary">
            Explore Packages <i className="bi bi-arrow-right" />
          </LoginLink>
        </div>
        <div className="package-story-list">
          {packageTypes.map(([icon, name, days, price]) => (
            <div className="package-story-card" key={name}>
              <div className="package-card-top">
                <span className="package-icon-wrap"><i className={`bi ${icon}`} /></span>
                <span className="package-duration-chip"><i className="bi bi-clock-history" /> {days}</span>
              </div>
              <div className="package-card-body">
                <strong>{name}</strong>
                <small className="package-inclusion">Guide + Stay Included</small>
                <div className="package-price-wrap">
                  <small>Starting from</small>
                  <b>{price}</b>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. TRUST & VERIFICATION */}
      <section className="story-section story-trust" id="trust">
        <div className="story-copy">
          <span className="story-section-kicker">
            <i className="bi bi-shield-check" /> TRUST &amp; SAFETY GUARANTEE
          </span>
          <h2>Travel With Complete Confidence.</h2>
          <p>
            We take the uncertainty out of travel through comprehensive vetting, secure payment protection,
            and dedicated 24/7 on-trip assistance.
          </p>
        </div>
        <div className="trust-list">
          <div className="trust-item-card">
            <span className="trust-icon-wrap"><i className="bi bi-shield-check" /></span>
            <div className="trust-card-text">
              <strong>Verified Places</strong>
              <small>Only authentic, physically checked destinations with real photos and verified reviews.</small>
            </div>
          </div>
          <div className="trust-item-card">
            <span className="trust-icon-wrap"><i className="bi bi-person-check-fill" /></span>
            <div className="trust-card-text">
              <strong>Verified Guides</strong>
              <small>Government ID &amp; background-checked local guides committed to safety and quality.</small>
            </div>
          </div>
          <div className="trust-item-card">
            <span className="trust-icon-wrap"><i className="bi bi-patch-check-fill" /></span>
            <div className="trust-card-text">
              <strong>Protected Bookings</strong>
              <small>Transparent pricing with zero hidden charges and flexible cancellation policies.</small>
            </div>
          </div>
          <div className="trust-seal-card">
            <i className="bi bi-shield-lock-fill" />
            <strong>STG Protection</strong>
            <small>Safe &amp; Trusted</small>
          </div>
        </div>
      </section>

      {/* 7. HOW IT WORKS */}
      <section className="story-section story-how" id="how-it-works">
        <div className="story-copy">
          <span className="story-section-kicker">
            <i className="bi bi-signpost-2-fill" /> SEAMLESS PLANNING
          </span>
          <h2>How Smart Travel Guide Works</h2>
          <p>From initial curiosity to unforgettable memories, here is how we bring your trip together.</p>
        </div>
        <div className="journey-flow">
          {[
            ['bi-search', 'Search', 'Find curated places', '01'],
            ['bi-map', 'Discover', 'Explore local insights', '02'],
            ['bi-people', 'Connect', 'Match with trusted guides', '03'],
            ['bi-calendar-check', 'Plan', 'Customize your package', '04'],
            ['bi-airplane', 'Travel', 'Create lasting memories', '05']
          ].map(([icon, title, text, stepNum], i) => (
            <React.Fragment key={title}>
              <div className="journey-step-card">
                <span className="journey-step-number">{stepNum}</span>
                <span className="journey-icon-wrap"><i className={`bi ${icon}`} /></span>
                <strong>{title}</strong>
                <small>{text}</small>
              </div>
              {i < 4 && <div className="journey-arrow-divider"><i className="bi bi-arrow-right" /></div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 8. FINAL CALL TO ACTION */}
      <section className="story-final" id="about">
        <div className="story-final-inner">
          <span className="story-section-kicker">
            <i className="bi bi-geo-alt-fill" /> YOUR NEXT JOURNEY AWAITS
          </span>
          <h2>Where will your curiosity take you?</h2>
          <p>Join over 50,000+ travelers discovering authentic destinations and trusted local guides across India.</p>
          <div className="story-actions">
            <LoginLink className="story-btn story-btn-primary">
              Start Your Journey <i className="bi bi-arrow-right" />
            </LoginLink>
            <LoginLink className="story-btn story-btn-ghost">
              <i className="bi bi-compass" /> Explore Places to Go
            </LoginLink>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="story-footer">
        <div className="footer-brand">
          <BrandMark className="big story-footer-logo"/>
          <div>
            <strong>Smart Travel Guide</strong>
            <small>Plan Smart, Travel Better</small>
          </div>
        </div>
        <div className="footer-col">
          <strong>Explore</strong>
          <LoginLink>Discover Places</LoginLink>
          <LoginLink>Find Local Guides</LoginLink>
          <LoginLink>Explore Packages</LoginLink>
          <LoginLink>Plan Trips</LoginLink>
        </div>
        <div className="footer-col">
          <strong>Help Desk</strong>
          <span>Support Center</span>
          <span>Traveler FAQs</span>
          <span>Safety Guidelines</span>
          <span>Contact Us</span>
        </div>
        <div className="footer-col">
          <strong>Follow Us</strong>
          <div className="footer-social">
            <a href="#" aria-label="Instagram"><i className="bi bi-instagram" /></a>
            <a href="#" aria-label="Facebook"><i className="bi bi-facebook" /></a>
            <a href="#" aria-label="Twitter"><i className="bi bi-twitter-x" /></a>
            <a href="#" aria-label="LinkedIn"><i className="bi bi-linkedin" /></a>
          </div>
          <small>Connecting travelers with genuine local stories.</small>
        </div>
        <div className="footer-copy">© 2025 Smart Travel Guide. All rights reserved. • Built for authentic journeys.</div>
      </footer>
    </main>
  );
}
