CREATE TABLE accounts (
    cuid TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT
);

CREATE TABLE sessions (
    session_cuid TEXT PRIMARY KEY,
    account_cuid TEXT REFERENCES accounts(cuid)
);

CREATE TYPE cardCategory AS ENUM ('red', 'blue', 'bystander', 'death');

CREATE TABLE current_games (
    id TEXT PRIMARY KEY,
    owner_cuid TEXT REFERENCES accounts(cuid),
    words TEXT[25],
    categories cardCategory[25],
    revealed INT[25]
);
