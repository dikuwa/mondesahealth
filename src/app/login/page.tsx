import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return <main id="main-content" className="portal-chooser">
    <section className="portal-chooser-card">
      <p className="eyebrow">Choose your workspace</p>
      <h1 className="display">Where do you need to sign in?</h1>
      <p className="muted">Platform Administration and each independent Practice Portal use separate sessions.</p>
      <div className="portal-choice-grid">
        <Link className="portal-choice" href="/platform/login">
          <ShieldCheck size={28}/><strong>Platform Administration</strong>
          <span>Review applications, manage the directory and guide handovers.</span>
        </Link>
        <Link className="portal-choice" href="/practices">
          <Building2 size={28}/><strong>Practice Portal</strong>
          <span>Choose your practice first, then sign in to its private workspace.</span>
        </Link>
      </div>
    </section>
  </main>;
}
