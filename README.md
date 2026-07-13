# Mondesa Health

A full-stack public website and medical-practice management workspace for a Namibian general practice.

## Local setup

1. Copy `.env.example` to `.env` and set a strong `AUTH_SECRET`.
2. Install dependencies with `pnpm install`.
3. Create and seed the local database with `pnpm db:setup`.
4. Start the application with `pnpm dev`.

The local seed creates an owner login for evaluation:

- Email: `owner@mondesahealth.na`
- Password: `Mondesa2026!`

Change the seed credentials before any real deployment.

## Architecture

- Next.js App Router and React Server Components
- Prisma relational data model (SQLite locally; migrate the datasource to PostgreSQL for hosted production)
- Zod request validation, signed HTTP-only staff sessions and expiring hashed patient-action links
- Transactional bookings and a unique appointment start constraint for collision safety
- `@react-pdf/renderer` for server-generated financial documents
- Tailwind CSS plus a compact custom healthcare design system

No clinical or financial data in this repository is real. Practice registration numbers, final address, phone, email, policies and practitioner details must be confirmed in dashboard settings before launch.
