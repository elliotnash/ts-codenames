-- Per-room game modes. Classic rooms keep categories/startingTeam; duet rooms
-- use the duet* columns instead (each mode's deal nulls the other's state).
ALTER TABLE "room"
  ALTER COLUMN "categories" DROP NOT NULL,
  ALTER COLUMN "startingTeam" DROP NOT NULL,
  ADD COLUMN "mode" text NOT NULL DEFAULT 'classic' CHECK ("mode" IN ('classic', 'duet')),
  -- What each player sees ('agent'|'bystander'|'assassin' x25); a guess BY side A
  -- is resolved against "duetKeyB" and vice versa.
  ADD COLUMN "duetKeyA" text[],
  ADD COLUMN "duetKeyB" text[],
  ADD COLUMN "duetAgents" integer[] NOT NULL DEFAULT '{}',
  -- Cards bystander-marked from that side's guesses (token arrow points at the guesser).
  ADD COLUMN "duetBystandersA" integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN "duetBystandersB" integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN "duetTokens" integer NOT NULL DEFAULT 9,
  ADD COLUMN "duetStatus" text CHECK ("duetStatus" IN ('playing', 'won', 'lost')),
  -- The losing guess (assassin, or a wrong guess in sudden death) and who made it.
  ADD COLUMN "duetFatalCard" integer,
  ADD COLUMN "duetFatalSide" text CHECK ("duetFatalSide" IN ('a', 'b'));
