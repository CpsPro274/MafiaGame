-- ============================================================================
-- CODE MAFIA: Multiplayer Collaborative Debugging Challenge
-- PostgreSQL Database Schema
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. AUTHENTICATION & USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,                  -- NULL for quick guest accounts
    password_hash VARCHAR(255),                 -- NULL for OAuth or Guest accounts
    avatar_url VARCHAR(500),
    is_guest BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,

    -- Player Stats & Rating
    rating INT DEFAULT 1000,                    -- Elo / MMR ranking
    games_played INT DEFAULT 0,
    dev_wins INT DEFAULT 0,
    mafia_wins INT DEFAULT 0,
    bugs_fixed INT DEFAULT 0,
    sabotages_successful INT DEFAULT 0,

    -- Security & Auditing
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,              -- 'github', 'google'
    provider_user_id VARCHAR(255) NOT NULL,     -- Provider's unique user ID
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_account UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    is_revoked BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    token_type VARCHAR(30) NOT NULL,            -- 'PASSWORD_RESET', 'EMAIL_VERIFICATION'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. CHALLENGE REPOSITORY & TEST SUITES
-- ============================================================================

CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    language VARCHAR(30) NOT NULL,              -- 'javascript', 'python', 'typescript'
    difficulty VARCHAR(20) DEFAULT 'MEDIUM',    -- 'EASY', 'MEDIUM', 'HARD'
    initial_flawed_code TEXT NOT NULL,          -- The buggy starting project code
    solution_code TEXT,                         -- Clean reference solution
    bug_manifesto JSONB,                        -- Summary of intentional bugs (revealed post-game)
    time_limit_seconds INT DEFAULT 600,         -- Default match timer (e.g. 10 mins)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    input TEXT,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,            -- Hidden tests prevent hardcoded hacks
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. MATCHES & MULTIPLAYER LOBBIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) UNIQUE NOT NULL,      -- 6-character room code (e.g. 'MAFIA9')
    host_id UUID REFERENCES users(id) ON DELETE SET NULL,
    challenge_id UUID NOT NULL REFERENCES challenges(id),
    status VARCHAR(30) NOT NULL DEFAULT 'LOBBY', -- 'LOBBY', 'IN_PROGRESS', 'VOTING', 'COMPLETED', 'ABORTED'
    winner_team VARCHAR(20),                    -- 'DEVELOPERS', 'MAFIA', 'DRAW'
    end_reason VARCHAR(50),                     -- 'ALL_TESTS_PASSED', 'MAFIA_VOTED_OUT', 'TIMEOUT_TESTS_FAILED', 'DEV_ELIMINATION'
    final_code TEXT,                            -- The state of code when match concluded
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    player_name VARCHAR(50) NOT NULL,           -- Fallback for guest players
    role VARCHAR(20) NOT NULL,                  -- 'DEVELOPER', 'MAFIA', 'OBSERVER'
    status VARCHAR(20) DEFAULT 'ALIVE',         -- 'ALIVE', 'ELIMINATED', 'DISCONNECTED'
    lines_added INT DEFAULT 0,
    lines_deleted INT DEFAULT 0,
    tests_triggered INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_match_player UNIQUE (match_id, user_id)
);

-- ============================================================================
-- 4. EMERGENCY MEETINGS & VOTING SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS voting_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    initiated_by UUID REFERENCES match_players(id) ON DELETE SET NULL,
    eliminated_player_id UUID REFERENCES match_players(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voting_round_id UUID NOT NULL REFERENCES voting_rounds(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES match_players(id) ON DELETE CASCADE,
    target_id UUID REFERENCES match_players(id) ON DELETE SET NULL, -- NULL = Skip Vote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_vote_per_round UNIQUE (voting_round_id, voter_id)
);

-- ============================================================================
-- 5. AUDIT LOGS & POST-GAME REPLAY SCRUBBER
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES match_players(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,            -- 'CODE_CHANGE', 'TEST_RUN', 'TEST_PASS', 'TEST_FAIL', 'MEETING_CALLED'
    event_data JSONB NOT NULL,                  -- Stored diffs, test outputs, execution ms
    match_time_offset_ms INT NOT NULL,          -- Milliseconds elapsed since match start
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS code_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    snapshot_index INT NOT NULL,
    code_content TEXT NOT NULL,
    match_time_offset_ms INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_lookup ON oauth_accounts(provider, provider_user_id);

CREATE INDEX IF NOT EXISTS idx_matches_room_code ON matches(room_code);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_user ON match_players(user_id);

CREATE INDEX IF NOT EXISTS idx_voting_rounds_match ON voting_rounds(match_id);
CREATE INDEX IF NOT EXISTS idx_votes_round ON votes(voting_round_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_replay ON audit_logs(match_id, match_time_offset_ms ASC);
CREATE INDEX IF NOT EXISTS idx_code_snapshots_replay ON code_snapshots(match_id, snapshot_index ASC);

-- ============================================================================
-- 7. TRIGGER FUNCTIONS (Auto-updated timestamp)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trigger_matches_updated_at ON matches;
CREATE TRIGGER trigger_matches_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trigger_challenges_updated_at ON challenges;
CREATE TRIGGER trigger_challenges_updated_at
BEFORE UPDATE ON challenges
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();
