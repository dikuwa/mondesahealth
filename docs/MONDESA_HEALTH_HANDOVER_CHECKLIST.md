# Mondesa Health Handover and Operations Checklist

**For:** Incoming owner or practice manager

**Detailed reference:** [Mondesa Health Practice Handover Manual](./MONDESA_HEALTH_HANDOVER_MANUAL.md)

**Completion runbook:** [Mondesa Health Owner Completion Runbook](./MONDESA_HEALTH_OWNER_COMPLETION_RUNBOOK.md)
**Rule:** Do not tick an item merely because a screen exists. Tick it only after the named person has verified the result and retained appropriate evidence.

> Never record passwords, database connection strings, backup keys, patient names, membership numbers, diagnosis information, secure links, or document tokens in this checklist.

## Document control

| Item | Value |
| --- | --- |
| Handover date |  |
| Outgoing responsible person |  |
| Incoming owner/manager |  |
| Technical operator |  |
| Claims lead |  |
| Finance/reconciliation lead |  |
| Backup custodian |  |
| Approved production URL |  |
| Approved environment name |  |
| Evidence folder/reference |  |

## 1. First-day owner checklist

### Access and security

- [ ] Confirm the login page is the approved production origin.
- [ ] Rotate the owner password; do not reuse the development/evaluation password.
- [ ] Confirm the old password no longer works without repeatedly triggering login throttling.
- [ ] Confirm the new password is stored only in the approved password manager.
- [ ] Open **Profile & security** and verify owner display name, immutable login email, role, and avatar.
- [ ] Sign out and sign back in with the rotated credential.
- [ ] Confirm the session expires/revokes after an owner password change.
- [ ] List every enabled staff account and identify the real person responsible for it.
- [ ] Disable unused, duplicate, test, or departed-person accounts; preserve linked history.
- [ ] Confirm no team uses a shared owner or generic receptionist login.
- [ ] Record that multi-factor authentication is not available and assign a follow-up owner.

### Practice identity

- [ ] Open **Settings → Practice** and verify practice name, practitioner, practice number, registration, phone, WhatsApp, email, and physical address.
- [ ] Open **Settings → Documents** and verify currency, signatory, title, and VAT choice.
- [ ] Open **Settings → Public site** and verify public description, map, coordinates, opening hours, and contact visibility.
- [ ] Open **Settings → Claims** and complete claim contact name, telephone, email, postal address, and approved consent wording.
- [ ] Compare settings with approved registration and fund documentation.
- [ ] Do not use **Data reset** during handover.

### Operational orientation

- [ ] Demonstrate desktop sidebar collapse and mobile navigation.
- [ ] Demonstrate notifications, mark-read, and clear behaviour.
- [ ] Demonstrate **Open site** and confirm it opens a separate tab.
- [ ] Review the current appointment, patient, claim, batch, finance, availability, public-content, staff, and activity areas.
- [ ] Explain that email and WhatsApp controls prepare or open external messages; they do not automatically send.
- [ ] Explain that recording a payment is bookkeeping after external payment confirmation, not payment processing.

## 2. Required go-live sequence

Complete in order. Do not proceed past a failed gate without written risk acceptance from the accountable owner.

### Gate 1 — Resolve environment and database identity

- [ ] Remove conflicting or duplicate environment definitions without exposing their values.
- [ ] Establish one authoritative value for every required variable.
- [ ] Confirm application runtime resolves the approved pooled database.
- [ ] Confirm migration/backup tooling resolves the matching approved direct database.
- [ ] Confirm command-line and Next.js runtime identify the same intended database.
- [ ] Start the application and load every dashboard page without a database connection error.
- [ ] Record only a non-secret environment identifier in the evidence log.

### Gate 2 — Rotate credentials and review access

- [ ] Rotate the exposed/default owner credential.
- [ ] Review the 3 current staff accounts and their individual owners.
- [ ] Apply least-privilege roles and permission checkboxes.
- [ ] Confirm access changes revoke old sessions.
- [ ] Confirm backup and hosting credentials are held by authorised custodians only.

### Gate 3 — Confirm practice and document configuration

- [ ] Complete all practice identity and claim-contact values.
- [ ] Confirm public phone/address/map/hours and visibility choices.
- [ ] Generate a sanitised invoice PDF and compare every identity/contact field with Settings.
- [ ] Generate a sanitised claim statement and batch document where feasible.
- [ ] Stop go-live if generated documents show stale, placeholder, or hardcoded details.

### Gate 4 — Configure claim reference data

- [ ] Review all 7 current medical-aid funds for active/public state and verified contacts.
- [ ] Add approved procedure items with verified codes, descriptions, amounts, and requirement flags.
- [ ] Confirm at least one active ICD-10 dataset and its authorised source/version.
- [ ] Complete existing claim information or explicitly classify the records as non-production demonstration data.
- [ ] Confirm consent wording has been approved by the accountable clinical/legal authority.

### Gate 5 — Validate core calculations and documents

- [ ] Verify overview counts against module-level counts.
- [x] Verify the calculated next-available message uses current scheduling rules.
- [ ] Confirm outstanding balances match invoice and payment records.
- [ ] Verify the server rejects an amount above the current outstanding invoice balance.
- [ ] Verify receipt view/download/share preparation and document the practice's manual delivery procedure.
- [ ] Confirm claim totals, batch totals, and payment allocation with sanitised values.

### Gate 6 — Prove recoverability

- [ ] Create an encrypted backup outside the repository.
- [ ] Confirm file permissions and separate key custody.
- [ ] Restore that backup into a separate disposable database.
- [ ] Validate expected record counts and representative relationships without copying evidence containing patient data.
- [ ] Record restore duration, operator, result, and cleanup.

### Gate 7 — Rehearse the full workflow

- [ ] Complete the sanitised rehearsal in [section 13](#13-sanitised-end-to-end-rehearsal).
- [ ] Confirm the activity log records each material step.
- [ ] Record gaps, owner, target date, and go/no-go decision.

## 3. Pre-opening daily checklist

- [ ] Sign in using an individual account.
- [ ] Review the notification bell and unread appointment count.
- [ ] Open **Appointments → Today** and compare with the approved diary.
- [ ] Review **Requests** for new, reschedule-proposed, and reschedule-requested appointments.
- [ ] Confirm clinician availability and current blocked periods.
- [ ] Confirm no unexpected appointment overlaps or unallocated requests.
- [ ] Review incomplete patient records for today's appointments.
- [ ] Review claims requiring information and urgent fund deadlines.
- [ ] Review outstanding finance tasks and compare the calculated Practice pulse slot with Availability.
- [ ] Confirm public site and booking page are reachable.
- [ ] Record any downtime or mismatch before patients arrive.

## 4. During-the-day controls

- [ ] Record whether an appointment came from public booking, phone, walk-in, WhatsApp, or staff.
- [ ] Complete patient identity/contact data using verified information.
- [ ] Verify medical-aid membership from an appropriate source before marking it ready for claims.
- [ ] Capture consent as a new dated decision; never overwrite history.
- [ ] Mark appointments completed, no-show, or cancelled accurately.
- [ ] Review every prepared patient message before opening an external sharing application.
- [ ] Confirm the intended recipient before sharing any secure link.
- [ ] Confirm payment through the actual cash/card/bank/fund evidence before recording it.
- [ ] Do not create invented tariff, procedure, ICD-10, pre-authorisation, or membership data to pass validation.
- [ ] Keep downloaded documents off public/shared devices and screens.

## 5. End-of-day checklist

### Appointments and patients

- [ ] Every past confirmed appointment is resolved to Completed, No-show, Cancelled, or a documented exception.
- [ ] New and reschedule requests have an owner and next action.
- [ ] Resolve every `REVIEW_REQUIRED` appointment using Confirm for a future time or Complete, No-show, or Cancel for a past/current time.
- [ ] Patients created from minimal staff bookings have required demographics completed where available.
- [ ] No duplicate patient was created without review.

### Claims and finance

- [ ] Completed medical-aid consultations have a claim task or documented reason not to claim.
- [ ] Draft/needs-information claims have clear missing items.
- [ ] Submitted batches have external references and dates.
- [ ] Fund outcomes and remittances received today are recorded once.
- [ ] Patient, medical-aid, employer, and other payments match external evidence.
- [ ] No recorded payment exceeds the intended outstanding amount.
- [ ] Payment/receipt references are retained in the approved reconciliation record.

### Security and closure

- [ ] Review unusual failed logins or unexpected configuration/activity changes.
- [ ] Close patient documents and remove temporary downloads according to policy.
- [ ] Sign out of shared workstations.
- [ ] Record unresolved incidents for the next shift.

## 6. Weekly checklist

### Schedule

- [ ] Review the next four weeks of opening hours and blocked periods.
- [ ] Confirm inactive weekdays and slot durations are intentional.
- [ ] Test one future public slot without completing a real booking.
- [ ] Review pending reschedule holds before their 48-hour expiry.

### Patient and claim quality

- [ ] Review incomplete dates of birth and claim-critical demographics.
- [ ] Review historical/current membership correctness.
- [ ] Review newest consent decision for active claim patients.
- [ ] Review Needs information, Rejected, and Resubmission required claims.
- [ ] Review unbatched Ready to submit claims.
- [ ] Reconcile submitted/acknowledged claims with external fund portals or correspondence.

### Finance

- [ ] Reconcile invoice totals against patient and medical-aid payment evidence.
- [ ] Review part-paid invoices and patient/fund responsibility.
- [ ] Check for duplicate or excess payments.
- [ ] Confirm secure invoice shares are sent only to intended recipients.

### Security and backup

- [ ] Review staff accounts that are disabled or have Password change due.
- [ ] Review the latest activity entries for access, settings, exports, and deletions.
- [ ] Confirm scheduled encrypted backups exist in the approved restricted location.
- [ ] Confirm the backup key is stored separately.
- [ ] Confirm backup-monitoring failures have a named owner.

## 7. Monthly checklist

- [ ] Run the separate-database restore drill in [section 11](#11-restore-drill-checklist).
- [ ] Re-certify every staff role and permission against current duties.
- [ ] Confirm departed staff remain disabled and audit attribution is preserved.
- [ ] Review practice registration, contacts, signatory, VAT, claim contacts, and consent wording.
- [ ] Review public website wording, location, maps, hours, contact visibility, departments, services, and providers.
- [ ] Confirm each public/active medical-aid fund is still correct.
- [ ] Confirm procedure codes and amounts against authorised source material.
- [ ] Confirm active ICD-10 dataset version and import owner.
- [ ] Review claim rejection, resubmission, and payment trends.
- [ ] Review invoice/document output after any configuration or code release.
- [ ] Refresh the record-count snapshot and readiness register without including patient details.
- [ ] Review retention, export, download, and secure-disposal practices.
- [ ] Record application version/revision used for the review.

## 8. Staff onboarding checklist

- [ ] Obtain approved role and access request.
- [ ] Select the least-privilege default role.
- [ ] Review every individual permission checkbox.
- [ ] Create a unique login email for the real person.
- [ ] Generate a temporary password without placing it in email subject lines, documents, or this checklist.
- [ ] Transfer the temporary password using the approved private channel.
- [ ] Require immediate password change from **Profile & security**.
- [ ] Verify old temporary password/session is invalidated after change.
- [ ] Ask the user to demonstrate assigned workflows.
- [ ] Verify the user cannot open unrelated modules.
- [ ] Record completion and approver.

| Staff reference (non-secret) | Role | Approver | Date | Access tested |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 9. Staff role-change/offboarding checklist

### Role change

- [ ] Obtain approved duty change.
- [ ] Update role and review all explicit permissions.
- [ ] Confirm session revocation and re-login.
- [ ] Re-test allowed and forbidden modules.
- [ ] Record approver and date.

### Offboarding

- [ ] Disable the account immediately at the approved cutoff time.
- [ ] Confirm old session can no longer access the dashboard.
- [ ] Do not delete an account linked to operational or audit history.
- [ ] Reassign pending appointments, claims, finance, and backup duties outside the system.
- [ ] Review recent activity for unexpected actions.
- [ ] Rotate separately shared external credentials where applicable.
- [ ] Retain evidence of disablement without recording sensitive values.

## 10. Encrypted backup checklist

See [Backup and restore operations](./MONDESA_HEALTH_HANDOVER_MANUAL.md#10-backup-and-restore-operations).

### Before running

- [ ] Confirm operator is authorised.
- [ ] Confirm the direct connection points to the approved source environment.
- [ ] Confirm PostgreSQL client tools and OpenSSL are installed.
- [ ] Confirm backup encryption key exists and is at least 32 characters.
- [ ] Confirm destination is outside the repository, encrypted, restricted, and has sufficient capacity.
- [ ] Confirm no command or log will print secret values.

### Run and verify

- [ ] Run the repository backup command.
- [ ] Confirm an encrypted `.dump.enc` file is created.
- [ ] Confirm restrictive file permissions.
- [ ] Confirm built-in decrypt/`pg_restore --list` verification succeeds.
- [ ] Copy the encrypted backup to the approved secondary protected location.
- [ ] Keep the encryption key separate from both backup copies.
- [ ] Record non-secret metadata below.

| Backup date/time | Operator | Environment label | File reference | Verification | Secondary copy |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## 11. Restore-drill checklist

### Safety checks

- [ ] Create or identify a disposable database.
- [ ] Confirm its host/database identity is different from the source.
- [ ] Confirm no production application uses it.
- [ ] Obtain explicit restore-drill approval.
- [ ] Confirm the selected encrypted backup and matching key.
- [ ] Set the required destructive restore-test confirmation only for this command.

### Restore and validate

- [ ] Run the repository restore-test command against the disposable target.
- [ ] Confirm decryption succeeds.
- [ ] Confirm `pg_restore` completes without errors.
- [ ] Confirm expected table/model counts.
- [ ] Confirm representative relationships: patient-to-appointment, claim-to-lines, invoice-to-payment, and user-to-activity.
- [ ] Do not export restored patient records as evidence.
- [ ] Record duration and result.
- [ ] Securely destroy or restrict the disposable database after validation.

| Drill date | Backup reference | Operator | Disposable target label | Duration | Result | Cleanup confirmed |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

## 12. Incident checklist

### Any incident

- [ ] Record discovery time, reporter, affected system, and non-sensitive description.
- [ ] Assign incident lead and severity.
- [ ] Preserve logs/evidence; do not run data reset or delete affected accounts/records.
- [ ] Limit access or stop the affected workflow without expanding the incident.
- [ ] Identify whether patient, claim, financial, credential, or backup data may be affected.
- [ ] Follow approved legal/professional breach-escalation requirements.
- [ ] Record containment, recovery, communication, and lessons learned.

### Suspected staff-account compromise

- [ ] Disable account or reset password.
- [ ] Confirm session revocation.
- [ ] Review activity and exports.
- [ ] Rotate related external credentials.
- [ ] Re-enable only after owner approval.

### Database/runtime failure

- [ ] Stop uncertain write operations.
- [ ] Identify authoritative environment without printing secrets.
- [ ] Confirm runtime and tooling target the same intended database.
- [ ] Check database service health and connectivity.
- [ ] Recover through approved configuration or tested backup process.
- [ ] Validate counts and critical workflows before reopening.

### Incorrect patient/claim/financial document

- [ ] Stop sharing the document.
- [ ] Revoke/expire sharing where supported.
- [ ] Determine whether the fault is data, settings, or hardcoded template content.
- [ ] Correct only through an approved process.
- [ ] Generate and review a replacement.
- [ ] Record recipients and required follow-up without copying health data into the incident log.

## 13. Sanitised end-to-end rehearsal

Use an approved synthetic patient only. Do not reuse a real patient's phone, email, identity, membership, diagnosis, secure link, or payment details.

### Public and appointment flow

- [ ] Create/select the authorised synthetic record.
- [ ] Test live-slot or request booking according to configured mode.
- [ ] Confirm staff notification appears.
- [ ] Confirm appointment reference/status and activity entry.
- [ ] Test staff confirmation or reschedule without contacting a real person.
- [ ] Test secure patient-link behaviour using the synthetic workflow.
- [ ] Mark the synthetic appointment completed.

### Patient, membership, and consent

- [ ] Complete synthetic demographics.
- [ ] Add an explicitly synthetic membership using an approved test fund/context.
- [ ] Record synthetic granted consent and confirm append-only history.
- [ ] Confirm protected attachment rules using a harmless test file if approved.

### Claim and batch

- [ ] Create claim from completed synthetic appointment.
- [ ] Add a verified test procedure item.
- [ ] Select a valid active ICD-10 code suitable for the authorised test scenario.
- [ ] Validate and confirm Ready to submit.
- [ ] Create a test batch only in a non-production environment.
- [ ] Generate and review cover/manifest documents.
- [ ] Record a clearly synthetic external submission reference only in non-production.

### Finance and audit

- [ ] Create a synthetic invoice.
- [ ] Review PDF identity and totals.
- [ ] Test secure sharing without sending to a real recipient.
- [ ] Record a synthetic payment only in non-production.
- [ ] Confirm payment, receipt record, invoice status, and audit entries.
- [ ] Remove test data only through the approved non-production cleanup process; never reset production.

### Rehearsal acceptance

| Area | Pass/fail | Evidence reference | Gap owner | Target date |
| --- | --- | --- | --- | --- |
| Booking and notification |  |  |  |  |
| Appointment management |  |  |  |  |
| Patient/funding/consent |  |  |  |  |
| Claim validation |  |  |  |  |
| Batch documents |  |  |  |  |
| Invoice/payment |  |  |  |  |
| Audit and permissions |  |  |  |  |

## 14. Current record snapshot

This is a time-sensitive planning snapshot, not a permanent control total:

| Record | Observed count | Handover action |
| --- | ---: | --- |
| Staff accounts | 3 | Identify owner, status, and required permissions |
| Patients | 10 | Confirm demonstration versus operational status without listing identities |
| Appointments | 14 | Resolve unsupported/unfinished statuses |
| Claims | 9 | All observed claims require information |
| Claim batches | 0 | Configure and rehearse before use |
| Invoices | 3 | Reconcile and verify document output |
| Payments | 1 | Reconcile to external evidence |
| Departments | 7 | Confirm publication and content |
| Providers | 0 | Add only confirmed provider profiles |
| Medical-aid funds | 7 | Verify active/public/contact/submission settings |
| Procedure items | 0 | Configure authorised items before claim operations |

Refresh date: __________  Refreshed by: __________  Evidence reference: __________

## 15. Prioritised readiness register

### Critical blockers — close before production handover

| ID | Finding | Operational risk | Required closure evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| C-01 | Conflicting environment definitions | Writes may fail or reach the wrong environment | One authoritative `.env`; `pnpm env:check` passed; current-data counts verified before/after migration | Technical operator | Closed 2026-07-19 |
| C-02 | The default/exposed owner credential has been present in development/evaluation material | Unauthorised owner access | Credential rotated, old session revoked, owner confirms password-manager custody, and no password appears in handover files |  | Open |
| C-03 | Generated invoice identity/contact text was partly hardcoded | Incorrect legal/financial documents may be issued | Template now uses Practice settings; owner must still sign off a sanitised invoice and receipt PDF | Technical operator | Code closed; owner verification open |
| C-04 | Claim contacts are blank, procedure items are absent, no batches exist, and all observed claims require information | Claim validation/submission cannot operate reliably | Claim contacts complete, approved procedures loaded, sanitised claim validates, test batch documents reviewed |  | Open |
| C-05 | No successful end-to-end backup restore drill has been evidenced for handover | Patient, claim, finance, and attachment data may be unrecoverable | Encrypted backup plus successful restore to separate disposable database with signed drill record |  | Open |

### High-priority limitations — resolve or formally control before affected workflow

| ID | Finding | Operational risk | Required closure/control | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| H-01 | Overview claim-attention count omitted `NEEDS_INFORMATION` | Manager may underestimate queue | Count corrected and legacy state normalised | Technical operator | Closed 2026-07-19 |
| H-02 | Next available was hardcoded | Staff may quote a false time | Shared slot calculation now drives Overview and booking limits | Technical operator | Closed 2026-07-19 |
| H-03 | `REVIEW_REQUIRED` was stranded | Appointment could not be resolved | Filters, attention queue, server rules, and time-sensitive actions added | Technical operator | Closed 2026-07-19 |
| H-04 | Optional blocked reason was API-required | Valid form failed | API now stores blank as null and logs a generic summary | Technical operator | Closed 2026-07-19 |
| H-05 | Receipts had no dashboard document workflow | Receipt unavailable | View/download/share receipt workflow added; sharing remains manual | Technical operator | Closed 2026-07-19 |
| H-06 | No correction workflow | Ledger errors require control | Audited void added for unpaid draft invoices; editing, refunds, and credit notes remain deferred | Owner | Partially closed |
| H-07 | Overpayment was possible | Distorted balances | Outstanding/status checks added inside a serializable transaction | Technical operator | Closed 2026-07-19 |

### Medium-priority improvements

| ID | Finding | Impact | Recommended improvement | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| M-01 | Multi-factor authentication is unavailable | Password compromise has greater impact | Move staff authentication to an MFA-capable managed provider or add MFA |  | Open |
| M-02 | WhatsApp and email are external/manual handoffs | Delivery is not tracked and users may assume messages were sent | Add approved delivery integration or explicit sent/failed recording |  | Open |
| M-03 | Activity review was limited | Long-term review was limited | 50-row pagination, filters, and capped CSV export added | Technical operator | Closed 2026-07-19 |
| M-04 | Attachment bytes remain in PostgreSQL | Database/backup growth risk | Settings metrics plus aggregate quota added; object storage remains intentionally deferred | Owner | Controlled |
| M-05 | Invoice UI supports only one line and full patient or full medical-aid responsibility | Common split/multi-service billing may not fit | Add multi-line and split-responsibility workflow with server validation |  | Open |
| M-06 | Two lint warnings | Performance/accessibility quality debt | Dashboard avatar uses Next Image; React-PDF limitation is explicitly documented for lint | Technical operator | Closed 2026-07-19 |

## 16. Verification baseline

At the time of the workspace study:

- [x] Unit tests: 29 passed across 8 test files.
- [x] Lint: completed with 0 errors.
- [x] Lint warnings: 0 remain.
- [x] Environment/database identity: consistent; pre/post record counts matched.
- [x] Additive migration applied after verified encrypted backup; legacy claim status count is zero.
- [ ] Owner credential rotation remains a confidential owner-operated step.
- [ ] Separate-database restore drill remains open until a disposable restore target is supplied.

Re-run after remediation:

| Check | Date | Revision/environment | Result | Evidence |
| --- | --- | --- | --- | --- |
| Unit tests | 2026-07-19 | Authoritative current-data environment | Pass: 29/29 | `pnpm test` |
| Lint | 2026-07-19 | Workspace | Pass: 0 errors, 0 warnings | `pnpm lint` |
| Production build | 2026-07-19 | Authoritative current-data environment | Pass; all new routes emitted | `pnpm build` |
| Dashboard route review | 2026-07-19 | Production server smoke test | Public pages/slots 200; protected APIs 401 without session | Runtime smoke record |
| Responsive review |  |  |  |  |
| Sanitised end-to-end rehearsal |  |  |  |  |
| Backup/restore drill |  |  |  |  |

## 17. Responsibility matrix

| Responsibility | Primary owner | Backup owner | Frequency | Evidence location |
| --- | --- | --- | --- | --- |
| Staff access and credential incidents |  |  | On change / incident |  |
| Appointment queue and patient data quality |  |  | Daily |  |
| Medical-aid membership and consent |  |  | Per patient / weekly review |  |
| Claim validation and batches |  |  | Daily / submission cycle |  |
| Invoice and payment reconciliation |  |  | Daily / weekly |  |
| Practice/public configuration |  |  | Monthly / on change |  |
| Encrypted backup monitoring |  |  | Daily |  |
| Restore drill |  |  | Monthly |  |
| Activity/security review |  |  | Weekly / incident |  |
| Readiness register |  |  | Until closed / monthly |  |

## 18. Final handover sign-off

### Required confirmations

- [ ] All Critical blockers are Closed with evidence.
- [ ] Every open High item has written owner-approved control and target date.
- [ ] Owner credential is rotated and protected.
- [ ] Staff access is individually assigned and tested.
- [ ] Practice, public site, claims, funds, procedures, and documents are verified.
- [ ] Sanitised end-to-end rehearsal passed.
- [ ] Encrypted backup and separate restore drill passed.
- [ ] Daily, weekly, monthly, staff-change, backup, restore, and incident responsibilities are assigned.
- [ ] Incoming owner received the [full manual](./MONDESA_HEALTH_HANDOVER_MANUAL.md).
- [ ] No secrets or patient-identifying information are present in the handover package.

| Sign-off | Name | Signature/reference | Date |
| --- | --- | --- | --- |
| Outgoing responsible person |  |  |  |
| Incoming owner/manager |  |  |  |
| Technical operator |  |  |  |
| Claims lead |  |  |  |
| Finance/reconciliation lead |  |  |  |
| Backup/restore custodian |  |  |  |

### Outstanding items accepted at handover

| Readiness ID | Risk accepted by | Temporary control | Final owner | Target date |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
