-- AlterTable: Add purpose column to PasswordResetToken with default
ALTER TABLE "PasswordResetToken" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'PASSWORD_RESET';

-- CreateIndex: Add index on purpose
CREATE INDEX "PasswordResetToken_purpose_idx" ON "PasswordResetToken"("purpose");

