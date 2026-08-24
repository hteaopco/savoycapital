-- Fund & Users (owner, 2026-08-24).
--
-- Two additions and one column:
--   * Fund gains an inception date. NULLABLE — fund 1 already exists and this
--     repo may not invent a fund figure, which an inception date is. `DATE`
--     rather than a timestamp: an inception is a calendar day, and a time
--     component invites a timezone to move it across midnight.
--   * A Role enum and a User table — a ROSTER. Creating a row grants nothing:
--     it is not a Clerk account, not an invitation, and nothing in this app
--     reads Role to decide anything. See the schema comment.
--
-- Additive throughout. No existing row changes, and fund 1 keeps its name.

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANAGEMENT', 'INVESTOR');

-- AlterTable
ALTER TABLE "Fund" ADD COLUMN     "inceptionDate" DATE;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fundId" INTEGER NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'INVESTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_fundId_role_idx" ON "User"("fundId", "role");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
