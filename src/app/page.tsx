import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock3,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

const care = [
  "General consultations",
  "Routine check-ups",
  "Minor illnesses",
  "Chronic condition follow-ups",
  "Preventative care",
  "Prescription follow-ups",
  "Medical examinations",
  "Referrals where necessary",
];

export default function Home() {
  return (
    <main>
      <section
        className="hero-section"
        style={{
          background:
            "linear-gradient(100deg,#f7f4ed 0%,#f7f4ed 46%,#dcece6 100%)",
          overflow: "hidden",
        }}
      >
        <div
          className="container hero-grid"
          style={{
            alignItems: "center",
          }}
        >
          <div
            className="reveal"
            style={{ padding: "70px 0", position: "relative", zIndex: 2 }}
          >
            <div className="eyebrow">General medical practice · Mondesa</div>
            <h1
              className="display"
              style={{
                fontSize: "clamp(3.15rem,6vw,5.45rem)",
                margin: "22px 0 24px",
                maxWidth: 600,
              }}
            >
              Good care begins with being heard.
            </h1>
            <p
              style={{
                fontSize: 19,
                lineHeight: 1.65,
                color: "#49645d",
                maxWidth: 550,
              }}
            >
              Thoughtful, practical healthcare for individuals and families in
              Mondesa and greater Swakopmund.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/book">
                Book an appointment <ArrowRight size={17} />
              </Link>
              <a className="btn btn-light" href="https://wa.me/264810000000" target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} /> WhatsApp us
              </a>
            </div>
            <div className="hero-trust">
              <span className="hero-trust-item">
                <Check
                  size={15}
                  aria-hidden="true"
                />
                <span>No patient account needed</span>
              </span>
              <span className="hero-trust-item">
                <Check
                  size={15}
                  aria-hidden="true"
                />
                <span>Medical aid &amp; private patients</span>
              </span>
            </div>
          </div>
          <div
            className="hero-media"
            style={{
              position: "relative",
              borderRadius: "30px 30px 0 30px",
              overflow: "hidden",
              boxShadow: "0 30px 80px #173e3240",
            }}
          >
            <Image
              src="/images/mondesa-doctor-hero.jpg"
              alt="Doctor speaking with a patient in a welcoming consultation room"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 55vw"
              style={{ objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                right: 20,
                background: "rgba(255,255,255,.94)",
                borderRadius: 15,
                padding: "15px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <b style={{ display: "block" }}>Need an appointment?</b>
                <span style={{ fontSize: 13, color: "#60736d" }}>
                  Choose an available time online.
                </span>
              </div>
              <CalendarCheck color="#1f5a4c" />
            </div>
          </div>
        </div>
      </section>
      <section className="home-info-strip" style={{ borderBottom: "1px solid #e1e8e4" }}>
        <div
          className="container home-info-grid"
        >
          {[
            [Clock3, "Open weekdays", "08:00–17:00 Mon–Thu · 16:00 Fri"],
            [Phone, "Speak to our team", "+264 81 000 0000"],
            [MapPin, "Conveniently local", "Mondesa, Swakopmund"],
          ].map(([Icon, title, text]) => (
            <div
              key={String(title)}
              style={{
                background: "white",
                padding: "25px 28px",
                display: "flex",
                gap: 16,
              }}
            >
              <Icon color="#8c6526" />
              <div>
                <b>{String(title)}</b>
                <div style={{ fontSize: 13, color: "#657a73", marginTop: 4 }}>
                  {String(text)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="about" className="section">
        <div className="container about-grid">
          <div
            className="about-feature"
            style={{
              background: "#dcece6",
              borderRadius: 24,
              padding: 38,
              minHeight: 410,
              display: "grid",
              alignContent: "space-between",
            }}
          >
            <Stethoscope size={42} />
            <div>
              <div className="eyebrow">About the practice</div>
              <h2
                className="display"
                style={{ fontSize: 43, margin: "14px 0" }}
              >
                Professional care, grounded in community.
              </h2>
            </div>
          </div>
          <div className="about-copy">
            <p style={{ fontSize: 20, lineHeight: 1.65 }}>
              Mondesa Health is a general medical practice built around careful
              listening, clear explanations and dependable follow-through.
            </p>
            <p style={{ lineHeight: 1.8, color: "#5d706a" }}>
              We care for everyday health needs—from check-ups and minor
              illnesses to ongoing support for chronic conditions. Our approach
              is patient-centred, confidential and practical. Professional
              qualifications and practitioner registration details can be
              maintained by the practice owner in dashboard settings.
            </p>
            <div className="about-values">
              {[
                [
                  HeartHandshake,
                  "Human first",
                  "Respectful care without rushing.",
                ],
                [
                  ShieldCheck,
                  "Private & secure",
                  "Your information is handled carefully.",
                ],
              ].map(([Icon, t, d]) => (
                <div className="card" key={String(t)} style={{ padding: 20 }}>
                  <Icon color="#1f5a4c" />
                  <b style={{ display: "block", margin: "12px 0 6px" }}>
                    {String(t)}
                  </b>
                  <span style={{ fontSize: 14, color: "#63766f" }}>
                    {String(d)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section id="care" className="section" style={{ background: "#f7f4ed" }}>
        <div className="container">
          <div style={{ maxWidth: 690 }}>
            <div className="eyebrow">What we help with</div>
            <h2
              className="display"
              style={{
                fontSize: "clamp(2.5rem,5vw,4.4rem)",
                margin: "14px 0 18px",
              }}
            >
              Start with a conversation, not a diagnosis.
            </h2>
            <p style={{ color: "#5d706a", lineHeight: 1.7 }}>
              You do not need to select a service or diagnose yourself before
              booking. Tell us briefly what brings you in and your doctor will
              guide the consultation.
            </p>
          </div>
          <div className="care-grid">
            {care.map((item, i) => (
              <div
                className="card"
                key={item}
                style={{ padding: 22, minHeight: 120 }}
              >
                <span style={{ color: "#a27936", fontSize: 13 }}>0{i + 1}</span>
                <b style={{ display: "block", marginTop: 18, lineHeight: 1.4 }}>
                  {item}
                </b>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="visit" className="section">
        <div className="container visit-grid">
          <div className="visit-intro">
            <div className="eyebrow">Your appointment</div>
            <h2
              className="display"
              style={{ fontSize: 50, margin: "15px 0 24px" }}
            >
              Simple to arrange. Easy to prepare for.
            </h2>
            <Link className="btn btn-primary" href="/book">
              View available times
            </Link>
          </div>
          <div className="visit-steps">
            {[
              [
                "01",
                "Book online",
                "Choose a date and available time. No account is required.",
              ],
              [
                "02",
                "Receive confirmation",
                "We’ll send your booking details by your preferred method.",
              ],
              [
                "03",
                "Come prepared",
                "Bring identification, relevant medication and your medical aid card if applicable.",
              ],
            ].map(([n, t, d]) => (
              <div className="visit-step" key={n}>
                <span style={{ color: "#a27936", fontWeight: 800 }}>{n}</span>
                <div>
                  <b>{t}</b>
                  <p
                    style={{
                      margin: "7px 0",
                      color: "#62756f",
                      lineHeight: 1.6,
                    }}
                  >
                    {d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
<section
        id="contact"
        className="section"
        style={{ background: "#dcece6" }}
      >
        <div className="container contact-grid">
          <div className="contact-copy">
            <div className="eyebrow">Contact & location</div>
            <h2
              className="display"
              style={{ fontSize: 48, margin: "16px 0" }}
            >
              Care close to home.
            </h2>
            <p style={{ lineHeight: 1.75, color: "#60736d" }}>
              Mondesa, Swakopmund, Namibia. Exact directions and parking
              details can be configured by the practice team.
            </p>
            <div className="contact-actions">
              <a className="btn btn-primary" href="tel:+264810000000">
                <Phone size={17} /> Call
              </a>
              <a className="btn btn-light" href="https://wa.me/264810000000" target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} /> WhatsApp
              </a>
            </div>
          </div>
          <div className="opening-hours">
            <b>Opening hours</b>
            <dl className="opening-hours-list">
              <div><dt>Monday – Thursday</dt><dd>08:00–17:00</dd></div>
              <div><dt>Friday</dt><dd>08:00–16:00</dd></div>
              <div><dt>Weekends</dt><dd>Closed</dd></div>
            </dl>
            <p
              style={{
                fontSize: 12,
                borderTop: "1px solid #ded8cd",
                paddingTop: 13,
                color: "#7a6d59",
              }}
            >
              For a medical emergency, call 112 or go to the nearest emergency
              department. Online booking is not an emergency service.
            </p>
          </div>
        </div>
      </section>
      <section className="section">
        <div
          className="container"
          style={{ textAlign: "center", maxWidth: 760 }}
        >
          <div className="eyebrow">Ready when you are</div>
          <h2
            className="display"
            style={{
              fontSize: "clamp(2.6rem,6vw,5rem)",
              margin: "17px 0 28px",
            }}
          >
            Let’s take care of what’s worrying you.
          </h2>
          <Link className="btn btn-primary" href="/book">
            Book an appointment <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
