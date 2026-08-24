-- Clerk is the roster; this table holds only what Clerk has no opinion about
-- (owner, 2026-08-24: "can we just read users from clerk?").
--
-- ## THIS DROPS THE `User` TABLE, AND ANY ROWS IN IT
--
-- `User` shipped hours earlier as a phone-keyed roster of its own. Two lists of
-- people that nothing reconciles will disagree, and the one that gates sign-in
-- is Clerk's — so the other is decoration at best and a lie about who has access
-- at worst. Names and phone numbers are now read live from Clerk.
--
-- The replacement is keyed by `clerkUserId`, not phone: phone matching needs
-- normalisation ("+1 555 000 1111" and "5550001111" are one person and two
-- strings), and getting that wrong on the field that decides what somebody can
-- see fails quietly and in the dangerous direction.
--
-- No data is migrated across because none of it maps: the old rows key on a
-- typed phone number, the new ones on a Clerk account id that the old table
-- never held. Any roster rows already entered must be re-assigned against real
-- accounts, which is a handful of dropdowns.
--
-- Nothing reads `UserRole` yet. Enforcement is a separate change, sequenced
-- after this one so the assignments exist before anything depends on them.


-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_fundId_fkey";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "UserRole" (
    "id" SERIAL NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "fundId" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_clerkUserId_key" ON "UserRole"("clerkUserId");

-- CreateIndex
CREATE INDEX "UserRole_fundId_role_idx" ON "UserRole"("fundId", "role");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

