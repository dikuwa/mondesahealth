# Mondesa Health Owner Completion Runbook

**Purpose:** Close the owner-controlled go-live actions without exposing credentials or changing live data with invented values.
**Companions:** [Handover manual](./MONDESA_HEALTH_HANDOVER_MANUAL.md) · [Handover checklist](./MONDESA_HEALTH_HANDOVER_CHECKLIST.md)

## Current gate status

The non-sensitive audit on 19 July 2026 confirmed:

- environment validation passes and the database schema is current;
- exactly one enabled Owner exists;
- one ICD-10 dataset is active;
- claim contacts are incomplete;
- no active procedure items exist;
- all nine claims are in `NEEDS_INFORMATION`;
- the restore target is still a placeholder.

Do not proceed to claim submission or production handover until the incomplete owner-controlled gates are closed.

## Gate 1 — Rotate the existing Owner password

1. In **Staff users**, copy the exact login email for the existing Owner. The reset command now refuses to create an account or change a non-Owner.
2. Save a unique password in the approved password manager. It must be 12–100 characters and include uppercase, lowercase, a number, and a symbol.
3. From the project directory, enter it through a hidden terminal prompt:

   ```bash
   read -s "OWNER_PASSWORD?Enter the new owner password: "
   echo
   export OWNER_PASSWORD
   OWNER_EMAIL='COPY-THE-EXACT-OWNER-LOGIN' pnpm auth:reset-owner
   unset OWNER_PASSWORD
   ```

4. Continue only after `Owner login ready` appears.
5. In a private browser window, test the old password once, test the new password, sign out, and sign in again. Do not record either password as evidence.

## Gate 2 — Enter verified practice and claim data

Use official registration documents, approved fund sources, authorised tariff schedules, and approved consent wording.

1. **Settings → Practice:** verify identity, practitioner, registration, addresses, phone and email.
2. **Settings → Documents:** verify currency, VAT, signatory and title.
3. **Settings → Claims:** complete claim contact person, telephone, email, postal address and approved consent wording.
4. **Medical aid → Funds:** verify all seven fund records, their submission methods/contacts/instructions, required documents and active/public state.
5. **Medical aid → Procedure items:** add every approved item the practice will claim, including code, amount and requirement flags.
6. **Medical aid → ICD-10:** confirm the active dataset's authorised source and version; do not replace it merely to clear a warning.
7. Review all nine claims. Complete real records from evidence or formally classify demonstration records; never invent missing information.

## Gate 3 — Review documents and finance controls

1. In **Finance**, privately preview and download an existing invoice.
2. Compare practice identity, registration, contacts, currency, signatory, patient, responsibility and totals with approved records.
3. For an invoice with a receipt, test receipt view/download and share preparation without sending to a patient.
4. Confirm the UI does not offer payment for Paid/Void invoices, rejects an amount above the current balance, and offers Void only for an unpaid Draft with a reason.
5. Record only pass/fail and an internal evidence reference—not document contents.

## Gate 4 — Back up after configuration

```bash
pnpm env:check
PATH="/usr/local/opt/postgresql@18/bin:$PATH" pnpm db:backup
```

Continue only when a new encrypted `.dump.enc` file is reported as verified. Keep the backup and encryption key in separate protected locations.

## Gate 5 — Restore to an isolated Neon branch

1. In Neon, create a disposable branch with a clear restore-drill name. Prefer schema-only and configure automatic deletion where available.
2. Copy its **direct/non-pooled** connection string.
3. Enter the URL through a hidden prompt and choose the new backup:

   ```bash
   read -s "RESTORE_DATABASE_URL?Paste disposable direct database URL: "
   echo
   export RESTORE_DATABASE_URL
   BACKUP_FILE='/absolute/path/to/the-new-backup.dump.enc'
   ```

4. Run the guarded restore:

   ```bash
   CONFIRM_RESTORE='mondesahealth-restore-test' \
   PATH="/usr/local/opt/postgresql@18/bin:$PATH" \
   pnpm db:restore:test -- "$BACKUP_FILE"
   ```

5. Stop immediately if the command says the source and target identities match.

## Gate 6 — Rehearse only on the restored branch

Start an isolated local application process:

```bash
DATABASE_URL="$RESTORE_DATABASE_URL" \
DIRECT_URL="$RESTORE_DATABASE_URL" \
NEXT_PUBLIC_APP_URL="http://localhost:3011" \
pnpm exec next dev -p 3011
```

At `http://localhost:3011`, use an approved synthetic patient and practice-controlled test contacts to verify:

1. booking, notification, confirmation/reschedule and secure management link;
2. appointment completion, synthetic membership and consent;
3. claim creation, verified procedure/ICD-10 selection, validation and test batch documents;
4. invoice preview, secure-share preparation, synthetic payment and receipt;
5. reminder preparation, external-app handoff and Dismiss unless delivery really occurred;
6. Activity filters/export and a harmless approved attachment upload.

Never send to a real patient or add synthetic claim/payment records to the working database.

## Gate 7 — Close and sign off

1. Stop the isolated server with `Ctrl+C`.
2. Record non-sensitive counts, duration, pass/fail and evidence references.
3. Delete the disposable Neon branch after approval.
4. Clear the temporary variables and reconfirm the live environment:

   ```bash
   unset RESTORE_DATABASE_URL BACKUP_FILE
   pnpm env:check
   ```

5. Complete the readiness register and handover sign-off. MFA, automatic message delivery, refunds, credit notes and advanced billing remain deferred.
