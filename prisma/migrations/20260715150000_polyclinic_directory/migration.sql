ALTER TABLE "PracticeSetting"
ADD COLUMN "tagline" TEXT NOT NULL DEFAULT 'Your Health. Your Choice. Your Community.',
ADD COLUMN "publicDescription" TEXT NOT NULL DEFAULT 'Mondesa Health Polyclinic brings multiple healthcare disciplines together in one trusted community healthcare destination.',
ADD COLUMN "locationNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN "mapsUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "mapLatitude" DOUBLE PRECISION,
ADD COLUMN "mapLongitude" DOUBLE PRECISION,
ADD COLUMN "publicHours" TEXT,
ADD COLUMN "showEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showWhatsapp" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Department" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "categoryLabel" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMING_SOON',
  "public" BOOLEAN NOT NULL DEFAULT true,
  "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DepartmentService" (
  "id" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "public" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DepartmentService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Provider" (
  "id" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "practiceName" TEXT,
  "biography" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "operatingHours" TEXT,
  "public" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_slug_key" ON "Department"("slug");
CREATE INDEX "Department_public_sortOrder_idx" ON "Department"("public", "sortOrder");
CREATE INDEX "Department_status_idx" ON "Department"("status");
CREATE UNIQUE INDEX "DepartmentService_departmentId_name_key" ON "DepartmentService"("departmentId", "name");
CREATE INDEX "DepartmentService_departmentId_public_sortOrder_idx" ON "DepartmentService"("departmentId", "public", "sortOrder");
CREATE INDEX "Provider_departmentId_public_sortOrder_idx" ON "Provider"("departmentId", "public", "sortOrder");

ALTER TABLE "DepartmentService"
ADD CONSTRAINT "DepartmentService_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Provider"
ADD CONSTRAINT "Provider_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
