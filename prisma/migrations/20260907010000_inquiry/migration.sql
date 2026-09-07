-- Inbound enquiries from the public contact form (owner, 2026-09-07: "for
-- contact us, i rather change it to a form").
--
-- Additive: two new tables, nothing existing is touched and nothing is
-- backfilled. The public page's `mailto:` becomes a form that writes here.
--
-- `readAt` is nullable and drives the red badge in the portal nav — NULL is
-- "new". A timestamp rather than a boolean so the question "when did someone
-- first look at this" stays answerable without another migration.
--
-- `submittedIp` exists for rate limiting and abuse triage and is never
-- rendered. It is the submitter's data, not the firm's.

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "submittedIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryFile" (
    "id" SERIAL NOT NULL,
    "inquiryId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inquiry_readAt_createdAt_idx" ON "Inquiry"("readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InquiryFile_key_key" ON "InquiryFile"("key");

-- CreateIndex
CREATE INDEX "InquiryFile_inquiryId_idx" ON "InquiryFile"("inquiryId");

-- AddForeignKey
ALTER TABLE "InquiryFile" ADD CONSTRAINT "InquiryFile_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
