# Multi-practice migration runbook

## Before production

1. Put booking and dashboard writes into a short maintenance window.
2. Run `pnpm db:backup` and record the encrypted backup location and checksum.
3. Restore that backup into an isolated PostgreSQL database with `pnpm db:restore:test`.
4. Run the migration against the restored database first, then run `pnpm test` and `pnpm build`.
5. Verify row counts for users, patients, appointments, claims, invoices, payments, documents and sick notes before and after migration.

## Migration behaviour

The migration creates the `mondesa-health` tenant and attaches existing operational records to it with additive `practiceId` columns. Existing primary keys and relationships remain unchanged. Existing owner users receive the explicit `PLATFORM_OWNER` platform role. No table is truncated, reset or reseeded.

## Production application

Apply through the normal Prisma deployment workflow (`prisma migrate deploy`) only after the restored-database rehearsal succeeds. Verify that the migration is listed as applied, then smoke-test login, public booking, appointment updates, finance PDFs, claims, sick notes and document downloads.

## Rollback

Application rollback is preferred: redeploy the previous application while leaving additive columns and tables in place. If the migration itself must be reversed, restore the verified pre-migration backup into a new database and switch the application connection after integrity checks. Do not drop clinical tables or columns in place during an incident.
