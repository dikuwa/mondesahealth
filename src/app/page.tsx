import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgePlus,
  Building2,
  CalendarCheck,
  Check,
  Clock3,
  Eye,
  FlaskConical,
  MapPin,
  MapPinned,
  Phone,
  Pill,
  ScanLine,
  ShieldCheck,
  Smile,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { getPublicDepartments, getPublicSiteConfig } from "@/lib/public-site";

const departmentIcons = {
  "general-practice": Stethoscope,
  "dental-practice": Smile,
  "laboratory-services": FlaskConical,
  "eye-clinic": Eye,
  pharmacy: Pill,
  radiology: ScanLine,
  "php-health-plan": BadgePlus,
} as const;

export default async function Home() {
  const [site, departments] = await Promise.all([
    getPublicSiteConfig(),
    getPublicDepartments(),
  ]);
  const active = departments.find((department) => department.bookingEnabled);
  const upcoming = departments.filter((department) => !department.bookingEnabled);
  const telephoneHref = `tel:${site.phone.replace(/[^\d+]/g, "")}`;
  const embedUrl =
    site.mapLatitude !== null && site.mapLongitude !== null
      ? `https://www.google.com/maps?q=${site.mapLatitude},${site.mapLongitude}&z=17&output=embed`
      : null;

  return (
    <main>
      <section className="hero-section polyclinic-hero">
        <div className="container hero-grid">
          <div className="reveal hero-copy">
            <div className="eyebrow">Integrated community healthcare</div>
            <h1 className="display">{site.tagline}</h1>
            <p>{site.publicDescription}</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/book">
                Book GP appointment <ArrowRight size={17} />
              </Link>
              <Link className="btn btn-light" href="/services">
                Explore services
              </Link>
            </div>
            <div className="hero-trust">
              <span className="hero-trust-item">
                <Check size={15} aria-hidden="true" />
                <span>No patient account needed</span>
              </span>
              <span className="hero-trust-item">
                <Check size={15} aria-hidden="true" />
                <span>More healthcare services as we grow</span>
              </span>
            </div>
          </div>
          <div className="hero-media">
            <Image
              src="/images/mondesa-doctor-hero.jpg"
              alt="A doctor listening to a patient during a consultation"
              fill
              priority
              sizes="(max-width: 960px) calc(100vw - 28px), 55vw"
              style={{ objectFit: "cover" }}
            />
            <div className="hero-media-note">
              <div>
                <b>General Practice is open</b>
                <span>Choose an available appointment online.</span>
              </div>
              <CalendarCheck aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section className="home-info-strip">
        <div className="container home-info-grid">
          {[
            [Clock3, "GP appointments", "Live available times online"],
            [Phone, "Speak to our team", site.phone],
            [MapPin, "Find the Polyclinic", site.locationNote || site.address],
          ].map(([Icon, title, text]) => (
            <div className="home-info-item" key={String(title)}>
              <Icon aria-hidden="true" />
              <div>
                <b>{String(title)}</b>
                <span>{String(text)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="section polyclinic-about">
        <div className="container about-grid">
          <div className="about-feature">
            <Building2 size={42} aria-hidden="true" />
            <div>
              <div className="eyebrow">One trusted destination</div>
              <h2 className="display">Healthcare that grows with your community.</h2>
            </div>
          </div>
          <div className="about-copy">
            <p className="about-lead">
              Mondesa Health Polyclinic is becoming an integrated healthcare
              destination where patients can discover services and connect with
              the right healthcare team.
            </p>
            <p>
              General Practice is available now. Dental, laboratory, optometry,
              pharmacy, imaging and PHP healthcare access services will be added
              carefully as each department becomes ready.
            </p>
            <div className="about-values">
              <div className="value-item">
                <UsersRound aria-hidden="true" />
                <div><b>Your choice</b><span>Clear routes to the care you need.</span></div>
              </div>
              <div className="value-item">
                <ShieldCheck aria-hidden="true" />
                <div><b>Trusted care</b><span>Private, respectful and community-centred.</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="care" className="section directory-section">
        <div className="container">
          <div className="directory-heading">
            <div>
              <div className="eyebrow">Find your healthcare provider</div>
              <h2 className="display">Start with the service you need.</h2>
            </div>
            <Link className="directory-all-link" href="/services">
              View all services <ArrowRight size={16} />
            </Link>
          </div>

          {active && (
            <article className="directory-featured">
              <div className="directory-icon"><Stethoscope aria-hidden="true" /></div>
              <div>
                <span className="service-status is-active">Available now</span>
                <p className="eyebrow">{active.categoryLabel}</p>
                <h3>{active.name}</h3>
                <p>{active.summary}</p>
              </div>
              <div className="directory-featured-actions">
                <Link className="btn btn-primary" href="/book">Book appointment</Link>
                <Link className="btn btn-light" href={`/services/${active.slug}`}>View GP services</Link>
              </div>
            </article>
          )}

          <div className="directory-upcoming" aria-label="Planned healthcare services">
            {upcoming.map((department) => {
              const Icon = departmentIcons[department.slug as keyof typeof departmentIcons] || Building2;
              return (
                <Link className="directory-row" href={`/services/${department.slug}`} key={department.id}>
                  <span className="directory-row-icon"><Icon aria-hidden="true" /></span>
                  <span className="directory-row-copy">
                    <b>{department.name}</b>
                    <small>{department.summary}</small>
                  </span>
                  <span className="service-status">
                    {department.status === "FUTURE" ? "Future feature" : "Coming soon"}
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="visit" className="section">
        <div className="container visit-grid">
          <div className="visit-intro">
            <div className="eyebrow">Your appointment</div>
            <h2 className="display">Simple to arrange. Easy to prepare for.</h2>
            <Link className="btn btn-primary" href="/book">View GP appointment times</Link>
          </div>
          <div className="visit-steps">
            {[
              ["01", "Choose General Practice", "GP appointments are available now. Other departments will open as their teams and services are confirmed."],
              ["02", "Book an available time", "Choose a date and time online. No patient account is required."],
              ["03", "Keep your secure link", "Use your private link if you need to review or manage your appointment."],
            ].map(([number, title, text]) => (
              <div className="visit-step" key={number}>
                <span>{number}</span>
                <div><b>{title}</b><p>{text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="section contact-section">
        <div className="container contact-grid">
          <div className="contact-copy">
            <div className="eyebrow">Contact & location</div>
            <h2 className="display">Healthcare close to home.</h2>
            <address>
              {site.address}
              {site.locationNote && <span>{site.locationNote}</span>}
            </address>
            <div className="contact-actions">
              <a className="btn btn-primary" href={telephoneHref}><Phone size={17} /> Call {site.phone}</a>
              {site.mapsUrl && <a className="btn btn-light" href={site.mapsUrl} target="_blank" rel="noopener noreferrer"><MapPinned size={17} /> Get directions</a>}
            </div>
            {site.publicHours && (
              <div className="public-hours"><b>Opening hours</b><p>{site.publicHours}</p></div>
            )}
          </div>
          <div className="map-frame">
            {embedUrl ? (
              <iframe
                title="Mondesa Health Polyclinic location"
                src={embedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="map-fallback"><MapPinned size={34} /><p>Map location will be available soon.</p></div>
            )}
          </div>
        </div>
      </section>

      <section className="section closing-cta">
        <div className="container">
          <div className="eyebrow">General Practice is available</div>
          <h2 className="display">Start with care that listens.</h2>
          <Link className="btn btn-primary" href="/book">Book GP appointment <ArrowRight size={17} /></Link>
        </div>
      </section>
    </main>
  );
}
