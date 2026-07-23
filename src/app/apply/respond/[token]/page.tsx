import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ApplicantResponseForm } from "@/components/applicant-response-form";

export default async function RespondPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const infoRequest = await db.informationRequest.findUnique({
    where: { secureToken: token },
    include: {
      application: {
        select: {
          reference: true,
          practiceName: true,
          status: true,
          secureAccessTokenExpiresAt: true,
        },
      },
    },
  });

  if (!infoRequest) notFound();

  if (infoRequest.status !== "PENDING") {
    return (
      <main id="main-content" className="practice-application-page">
        <section className="practice-application-hero">
          <div className="container">
            <div className="card public-form-card application-success" role="status">
              <span className="application-success-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </span>
              <div className="eyebrow">Already responded</div>
              <h2>Thank you</h2>
              <p>Your response has been received. The platform team will continue the review.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (infoRequest.tokenExpiresAt < new Date()) {
    return (
      <main id="main-content" className="practice-application-page">
        <section className="practice-application-hero">
          <div className="container">
            <div className="card public-form-card application-success" role="status">
              <span className="application-success-icon" style={{ background: "#f7e4df", color: "#a43e32" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </span>
              <div className="eyebrow">Link expired</div>
              <h2>Response link expired</h2>
              <p>This secure link is no longer valid. Contact the platform team for assistance.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="practice-application-page">
      <section className="practice-application-hero">
        <div className="container practice-application-layout">
          <div className="practice-application-intro">
            <span className="eyebrow">Additional information requested</span>
            <h1>Respond to the platform team.</h1>
            <p className="practice-application-lead">
              The platform team needs additional information to continue reviewing
              your application.
            </p>
            <div className="practice-application-steps">
              <div>
                <span>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </span>
                <p>
                  <strong>Upload requested documents</strong>
                  <small>Provide the documents the reviewer has requested.</small>
                </p>
              </div>
              <div>
                <span>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </span>
                <p>
                  <strong>Add a message</strong>
                  <small>Include any relevant information the reviewer should know.</small>
                </p>
              </div>
              <div>
                <span>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </span>
                <p>
                  <strong>Submit and continue</strong>
                  <small>Your existing application and documents remain preserved.</small>
                </p>
              </div>
            </div>
          </div>
          <ApplicantResponseForm
            token={token}
            reference={infoRequest.application.reference || ""}
            practiceName={infoRequest.application.practiceName}
            message={infoRequest.applicantMessage}
            deadline={infoRequest.deadline?.toISOString() || ""}
            requestedCategories={JSON.parse(infoRequest.requestedCategories || "[]")}
            replacementDocumentIds={JSON.parse(infoRequest.replacementDocumentIds || "[]")}
            applicationId={infoRequest.applicationId}
          />
        </div>
      </section>
    </main>
  );
}
