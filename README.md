# Mondesa Health

A full-stack public website and medical-practice management workspace for a Namibian general practice.

## Local setup

1. Create a Neon Postgres database, then copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to Neon's pooled connection string and `DIRECT_URL` to its direct, non-pooled connection string. Set a strong `AUTH_SECRET` as well.
3. Install dependencies with `pnpm install`.
4. Push the schema and seed the selected database with `pnpm db:setup`.
5. Start the application with `pnpm dev`.

Both `.env` and `.env.local` are ignored by Git. Keep the connection strings private and verify them before running `pnpm db:setup`, because it changes the referenced database. Do not define `DATABASE_URL` twice across those files: Next gives `.env.local` priority at runtime, while Prisma CLI commonly reads `.env`.

## Variables to configure

| Variable | Where to get it | Required |
| --- | --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string (hostname contains `-pooler`) | Yes |
| `DIRECT_URL` | Neon direct/non-pooled connection string | Yes |
| `AUTH_SECRET` | Generate with `openssl rand -base64 48`; keep identical across deployments | Yes |
| `NEXT_PUBLIC_APP_URL` | Canonical deployed URL, for example `https://mondesahealth.na` | Yes |
| `OPENAI_API_KEY` | OpenAI API credential stored only in the deployment secret manager | AI intake only |
| `OPENAI_MODEL` | OpenAI model identifier; defaults to `gpt-4o-mini` | Optional |
| `ATTACHMENT_STORAGE_LIMIT_MB` | Aggregate private claim and patient-intake image quota | Optional; defaults to 1024 MB |
| `BACKUP_ENCRYPTION_KEY` | Generate separately with `openssl rand -base64 48` | Backup only |
| `BACKUP_DIR` | Directory on an encrypted disk outside the repository | Backup only |
| `RESTORE_DATABASE_URL` | A separate disposable Neon database | Restore drill only |
| `OWNER_NAME` | Initial owner display name used by the seed | Seed only |
| `OWNER_EMAIL` | Initial owner login email used by the seed | Seed only |
| `OWNER_PASSWORD` | Strong temporary password meeting the 12-character complexity policy | Seed only |

No email-verification, SMTP, or external file-storage variable is required. Owner/admin-created accounts can sign in immediately. Optional owner-invitation delivery uses `RESEND_API_KEY` and `INVITATION_EMAIL_FROM`; it runs only when a platform operator explicitly selects the email option, and the secure invitation link remains available for manual delivery. Small profile, practice-logo, and patient-intake images are stored privately in PostgreSQL; protected medical images require an authorised dashboard session. The login email remains immutable while the display name and avatar can change.

AI-assisted symptom intake is disabled by default. The Owner must configure emergency contacts in **Settings → Emergency & AI**, approve the AI provider’s privacy terms, add the server-only AI variables through the deployment secret manager, and then enable the feature globally. Service and provider records may inherit, allow, or disable the global setting. Missing AI configuration never blocks manual booking.

The AI integration connects only to OpenAI's official `https://api.openai.com/v1/chat/completions` endpoint. Set `OPENAI_API_KEY` in the deployment secret manager. Custom endpoints and third-party provider routing are not supported.

The seed does not contain default credentials. Supply `OWNER_EMAIL` and a strong temporary `OWNER_PASSWORD` explicitly when running it.

Set `OWNER_EMAIL` and `OWNER_PASSWORD` before the first production seed. After login, create other staff under **Staff users**, assign a role, adjust its permission checklist, and give the temporary password directly to that person. The account is required to change that administrator-set password from **My profile**.

## Production security

- Production startup fails unless `AUTH_SECRET` is at least 32 characters. Never reuse the database password or backup key as this secret.
- Staff sessions expire after eight hours. Password resets, password changes, role changes, permission changes and account-status changes revoke existing sessions.
- Failed sign-ins are limited by an HMAC-hashed account key and network key. Attempted email addresses, IP addresses, passwords and session tokens are never written to application logs.
- Passwords require at least 12 characters with uppercase, lowercase, numeric and symbol characters.
- Dashboard routes are checked by the server-side Next.js proxy, and every mutating or sensitive API route performs its own database-backed permission check.
- Multi-factor authentication is not yet available in the local authentication system. Treat MFA as a pre-launch follow-up or migrate staff sign-in to a managed provider that supports it.

## Encrypted backups and restore drills

The app does not need object storage for normal operation. Database backups are separate operational files and must be stored outside this repository on encrypted media.

1. Install PostgreSQL client tools (`pg_dump` and `pg_restore`) and OpenSSL on the machine that runs backups.
2. Configure `BACKUP_ENCRYPTION_KEY` and `BACKUP_DIR`, keeping the key separate from the generated files.
3. Run `pnpm db:backup`. The command creates an AES-256 encrypted custom-format dump and verifies that `pg_restore` can read it.
4. Create a disposable Neon database, set `RESTORE_DATABASE_URL`, and run `CONFIRM_RESTORE=mondesahealth-restore-test pnpm db:restore:test -- /absolute/path/to/backup.dump.enc`.
5. Schedule `pnpm db:backup` daily using the host's scheduler. Periodically move encrypted backups to a second access-controlled location and run a restore drill at least monthly.

The restore command refuses to target the same host/database identity as `DIRECT_URL`. It uses `--clean`, so the disposable target is destructive by design. A successful backup verification is not a substitute for a successful restore drill.

## Architecture

- Next.js App Router and React Server Components
- Prisma relational data model backed by Neon Postgres
- Zod request validation, signed HTTP-only staff sessions and expiring hashed patient-action links
- Transactional bookings and a unique appointment start constraint for collision safety
- `@react-pdf/renderer` for server-generated financial documents
- Tailwind CSS plus a compact custom healthcare design system

No clinical or financial data in this repository is real. Practice registration numbers, final address, phone, email, policies and practitioner details must be confirmed in dashboard settings before launch.
