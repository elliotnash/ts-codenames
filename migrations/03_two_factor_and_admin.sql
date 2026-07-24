-- two-factor plugin
ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" boolean;

CREATE TABLE "twoFactor" (
  "id" text NOT NULL PRIMARY KEY,
  "secret" text NOT NULL,
  "backupCodes" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "verified" boolean,
  "failedVerificationCount" integer,
  "lockedUntil" timestamp
);

CREATE INDEX "twoFactor_userId_idx" ON "twoFactor" ("userId");
CREATE INDEX "twoFactor_secret_idx" ON "twoFactor" ("secret");

-- admin plugin
ALTER TABLE "user" ADD COLUMN "role" text;
ALTER TABLE "user" ADD COLUMN "banned" boolean;
ALTER TABLE "user" ADD COLUMN "banReason" text;
ALTER TABLE "user" ADD COLUMN "banExpires" timestamp;
ALTER TABLE "session" ADD COLUMN "impersonatedBy" text;

-- existing accounts predate email verification; grandfather them in
UPDATE "user" SET "emailVerified" = true;
