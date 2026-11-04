-- Baseline Migration: 0_init
-- Description: Establishes baseline schema representing the pre-existing production PostgreSQL database

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PATIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Bengaluru',
    "state" TEXT NOT NULL DEFAULT 'Karnataka',
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "secondaryContactPhone" TEXT,
    "officialEmail" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "emergencyServices" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "operatingStatus" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "isDemoData" BOOLEAN NOT NULL DEFAULT false,
    "dataProvenance" TEXT NOT NULL DEFAULT 'DEMO',
    "lastResourceUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "assignedRole" TEXT NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BedAvailability" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'EMERGENCY_ICU',
    "totalBeds" INTEGER NOT NULL DEFAULT 0,
    "occupiedBeds" INTEGER NOT NULL DEFAULT 0,
    "availableBeds" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedByUserId" TEXT,
    "dataFreshnessNotes" TEXT,
    "dataProvenance" TEXT NOT NULL DEFAULT 'DEMO',

    CONSTRAINT "BedAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAvailability" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "staffCategory" TEXT NOT NULL,
    "scheduledOnDutyCount" INTEGER NOT NULL DEFAULT 0,
    "currentlyAvailableCount" INTEGER NOT NULL DEFAULT 0,
    "shiftStatus" TEXT NOT NULL DEFAULT 'ON_DUTY',
    "metricDefinition" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedByUserId" TEXT,
    "dataProvenance" TEXT NOT NULL DEFAULT 'DEMO',

    CONSTRAINT "StaffAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbulanceAvailability" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "registrationPlate" TEXT,
    "ambulanceType" TEXT NOT NULL DEFAULT 'ADVANCED_LIFE_SUPPORT_ALS',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "currentLocation" TEXT,
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "assignedEmergencyId" TEXT,
    "dispatchNotes" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedByUserId" TEXT,
    "dataProvenance" TEXT NOT NULL DEFAULT 'DEMO',

    CONSTRAINT "AmbulanceAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyRequest" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "patientName" TEXT,
    "contactPhone" TEXT,
    "emergencyType" TEXT NOT NULL DEFAULT 'TRAUMA_ACCIDENT',
    "severity" TEXT NOT NULL DEFAULT 'CRITICAL',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "pickupAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedAmbulanceId" TEXT,
    "dispatchNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceUpdateAudit" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "resourceCategory" TEXT NOT NULL,
    "previousState" TEXT NOT NULL,
    "newState" TEXT NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ResourceUpdateAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalAccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "hospitalAddress" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "officialEmail" TEXT NOT NULL,
    "hospitalRegNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "hospitalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "replacedByTokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_slug_key" ON "Hospital"("slug");

-- CreateIndex
CREATE INDEX "Hospital_latitude_longitude_idx" ON "Hospital"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Hospital_city_area_idx" ON "Hospital"("city", "area");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalMembership_userId_hospitalId_key" ON "HospitalMembership"("userId", "hospitalId");

-- CreateIndex
CREATE INDEX "BedAvailability_hospitalId_category_idx" ON "BedAvailability"("hospitalId", "category");

-- CreateIndex
CREATE INDEX "StaffAvailability_hospitalId_staffCategory_idx" ON "StaffAvailability"("hospitalId", "staffCategory");

-- CreateIndex
CREATE INDEX "AmbulanceAvailability_hospitalId_status_idx" ON "AmbulanceAvailability"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "EmergencyRequest_status_idx" ON "EmergencyRequest"("status");

-- CreateIndex
CREATE INDEX "EmergencyRequest_hospitalId_idx" ON "EmergencyRequest"("hospitalId");

-- CreateIndex
CREATE INDEX "ResourceUpdateAudit_hospitalId_timestamp_idx" ON "ResourceUpdateAudit"("hospitalId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_family_idx" ON "RefreshToken"("family");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "HospitalMembership" ADD CONSTRAINT "HospitalMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalMembership" ADD CONSTRAINT "HospitalMembership_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedAvailability" ADD CONSTRAINT "BedAvailability_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAvailability" ADD CONSTRAINT "StaffAvailability_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceAvailability" ADD CONSTRAINT "AmbulanceAvailability_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceAvailability" ADD CONSTRAINT "AmbulanceAvailability_assignedEmergencyId_fkey" FOREIGN KEY ("assignedEmergencyId") REFERENCES "EmergencyRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceUpdateAudit" ADD CONSTRAINT "ResourceUpdateAudit_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceUpdateAudit" ADD CONSTRAINT "ResourceUpdateAudit_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAccessRequest" ADD CONSTRAINT "HospitalAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAccessRequest" ADD CONSTRAINT "HospitalAccessRequest_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

