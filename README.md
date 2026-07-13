# Mondesa Health

A full-stack public website and medical-practice management workspace for a Namibian general practice.

## Local setup

1. Create a Neon Postgres database, then copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to Neon's pooled connection string and `DIRECT_URL` to its direct, non-pooled connection string. Set a strong `AUTH_SECRET` as well.
3. Install dependencies with `pnpm install`.
4. Push the schema and seed the selected database with `pnpm db:setup`.
5. Start the application with `pnpm dev`.

Both `.env` and `.env.local` are ignored by Git. Keep the connection strings private and verify them before running `pnpm db:setup`, because it changes the referenced database.

The local seed creates an owner login for evaluation:

- Email: `owner@mondesahealth.na`
- Password: `Mondesa2026!`

Change the seed credentials before any real deployment.

## Architecture

- Next.js App Router and React Server Components
- Prisma relational data model backed by Neon Postgres
- Zod request validation, signed HTTP-only staff sessions and expiring hashed patient-action links
- Transactional bookings and a unique appointment start constraint for collision safety
- `@react-pdf/renderer` for server-generated financial documents
- Tailwind CSS plus a compact custom healthcare design system

No clinical or financial data in this repository is real. Practice registration numbers, final address, phone, email, policies and practitioner details must be confirmed in dashboard settings before launch.
