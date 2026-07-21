# Patient records and multi-practice migration runbook

## Before production

1. Create a provider-native point-in-time restore checkpoint or database branch from the production primary.
2. Record counts for users, patients, appointments, claims, invoices, payments, documents, services and availability records.
3. Run `npx prisma migrate status` and confirm that only the reviewed multi-practice migration is pending.
4. Apply the migration during a monitored release window with `npx prisma migrate deploy`.
5. Do not run `prisma db push`, reset, seed or bootstrap commands against production.

## Verification

After deployment, confirm that the original Mondesa practice exists and that all legacy operational records have its `practiceId`. Compare the pre-migration counts, then verify login, booking, patient history, clinical records, medical aid, claims, finance, sick notes, document downloads and sharing. Run the tenant-isolation integration test against a production-like branch, not the production primary.

## Rollback

Application rollback is the first response: redeploy the prior application build while leaving the additive columns and tables in place. The prior build does not depend on the new structures. Do not drop clinical or tenant data to roll back application code.

If the migration itself fails before Prisma records it as complete, inspect the failed statement and restore the provider checkpoint or branch. If it succeeds but data verification fails, stop writes, preserve the failed database for audit, restore the checkpoint to a new primary, and redeploy the prior application build. Any bookings accepted after the checkpoint must be reconciled explicitly before reopening writes.
