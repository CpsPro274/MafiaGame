-- ============================================================================
-- 1. AUTH & USER SCHEMA (auth_schema.sql)
-- Simple Login & Registration Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    games_played INT DEFAULT 0,
    dev_wins INT DEFAULT 0,
    mafia_wins INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
