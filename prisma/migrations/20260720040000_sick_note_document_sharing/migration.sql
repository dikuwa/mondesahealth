ALTER TABLE "GeneratedDocument" ADD COLUMN "sickNoteId" TEXT;

CREATE INDEX "GeneratedDocument_sickNoteId_type_status_idx" ON "GeneratedDocument"("sickNoteId", "type", "status");

ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_sickNoteId_fkey" FOREIGN KEY ("sickNoteId") REFERENCES "SickNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
