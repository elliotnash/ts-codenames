DROP TABLE "current_games";
DROP TYPE cardCategory;

CREATE TABLE "word_bucket" (
  "id" text PRIMARY KEY,
  "ownerId" text REFERENCES "user"("id") ON DELETE CASCADE,
  "systemKey" text UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "language" text,
  "author" text,
  "words" text[] NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  -- system buckets have a systemKey and no owner; user buckets the inverse
  CHECK (("ownerId" IS NULL) = ("systemKey" IS NOT NULL))
);
CREATE INDEX word_bucket_owner_idx ON "word_bucket" ("ownerId");

CREATE TABLE "room" (
  "id" text PRIMARY KEY,
  "code" text NOT NULL UNIQUE CHECK ("code" = lower("code")),
  "ownerId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "passwordHash" text,
  "passwordGeneration" integer NOT NULL DEFAULT 0,
  "words" text[] NOT NULL,
  "categories" text[] NOT NULL,
  "revealed" integer[] NOT NULL DEFAULT '{}',
  "deal" integer NOT NULL DEFAULT 1,
  "startingTeam" text NOT NULL CHECK ("startingTeam" IN ('red', 'blue')),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX room_owner_idx ON "room" ("ownerId");

CREATE TABLE "room_bucket" (
  "roomId" text NOT NULL REFERENCES "room"("id") ON DELETE CASCADE,
  "bucketId" text NOT NULL REFERENCES "word_bucket"("id") ON DELETE CASCADE,
  PRIMARY KEY ("roomId", "bucketId")
);
