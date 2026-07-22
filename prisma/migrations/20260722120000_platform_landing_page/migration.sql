CREATE TABLE "PlatformLandingPage" (
    "id" TEXT NOT NULL DEFAULT 'platform-landing-page',
    "draftContent" JSONB NOT NULL,
    "publishedContent" JSONB,
    "draftUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformLandingPage_pkey" PRIMARY KEY ("id")
);
