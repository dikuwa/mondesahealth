# AI-assisted patient intake operations

## Safety position

AI-assisted symptom intake is optional and disabled by default. Manual booking remains available when AI is disabled, unconfigured, rate-limited, unavailable, times out, or returns an invalid structured response.

Patient AI output organises patient-reported information. It cannot diagnose, prescribe, recommend dosages, reassure a patient that an urgent situation is safe, or replace consultation. Clinician AI output is stored only as an unsigned draft for independent review. It cannot confirm diagnoses, finalise notes, create prescriptions, or save ICD-10 codes.

## Owner setup

1. Open **Settings → Emergency & AI**.
2. Add verified emergency contacts, select no more than one active primary contact, and confirm public telephone links.
3. Review the selected AI provider's privacy, retention, regional processing, and model-training terms.
4. Configure `AI_PROVIDER`, `AI_API_URL`, `AI_MODEL`, and `AI_API_KEY` in the approved deployment secret manager. Never place the key in a repository or browser variable.
5. Enable AI intake globally only after the server configuration is verified.
6. In **Services & providers**, leave each service/provider on the global default or explicitly disable it where inappropriate.
7. Enable patient photos only after the practice approves the private PostgreSQL storage and retention process.

## Migration and recovery

Migration `20260719190000_ai_assisted_patient_intake` is additive. Existing appointments remain valid because new appointment relations are nullable. Test the migration on an isolated Neon branch, run the full test/build suite against that branch, create a verified encrypted backup, and only then run `prisma migrate deploy` through the approved production workflow.

Do not attempt to reverse the migration by dropping tables after patient intake exists. Recovery should use the encrypted backup or Neon point-in-time branch restore. If code rollback is required while retaining new data, deploy the previous application build without removing the additive tables or columns.

## Privacy and storage

- AI calls are server-side and use only the bounded intake data required for the requested task.
- Provider/model identifiers are recorded without logging prompts or conversations.
- Notifications do not contain symptom text or AI summaries.
- Patient images are re-encoded in the browser to remove ordinary image metadata, validated by file signature on the server, stored privately in PostgreSQL, and served only through a permission-protected no-store route.
- Claim attachments and intake images share `ATTACHMENT_STORAGE_LIMIT_MB`.
- Broad activity descriptions contain event metadata, not medical conversations.

## Current limitations

- The supported adapter is an approved OpenAI-compatible chat-completions endpoint. Image analysis is intentionally unavailable.
- Rate limiting is process-local; a shared distributed limiter should replace it if traffic spans many server instances.
- There is no trusted medicine interaction database. The clinical assistant explicitly does not claim interaction checking or dosage safety.
- ICD-10 assistance produces search terms only. A clinician must search the authorised dataset and explicitly save a final code in the appropriate clinical or claim workflow.
- Staff-created appointments can be assigned to any enabled service/provider. Patient AI consent and patient-approved summaries originate from the public patient workflow and are not fabricated by staff.
