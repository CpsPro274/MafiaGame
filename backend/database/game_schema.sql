-- ============================================================================
-- 2. GAMEPLAY SCHEMA (game_schema.sql)
-- Simple tables for Challenges, Rooms, Players, Voting & Logs
-- ============================================================================

-- 1. Challenges (Buggy code problems)
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    language VARCHAR(20) DEFAULT 'python',
    buggy_code TEXT NOT NULL,
    solution_code TEXT NOT NULL,
    test_cases JSONB NOT NULL, -- Array of { "input": "...", "expected": "...", "hidden": false }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Game Rooms (Matches)
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    host_id INT REFERENCES users(id) ON DELETE SET NULL,
    challenge_id INT REFERENCES challenges(id),
    status VARCHAR(20) DEFAULT 'LOBBY', -- 'LOBBY', 'PLAYING', 'FINISHED'
    winner_team VARCHAR(20),            -- 'DEVELOPERS', 'MAFIA'
    final_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Room Players & Roles
CREATE TABLE IF NOT EXISTS room_players (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,          -- 'DEVELOPER', 'MAFIA'
    is_alive BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_room_user UNIQUE (room_id, user_id)
);

-- 4. Emergency Meeting Votes
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    voter_id INT REFERENCES users(id) ON DELETE CASCADE,
    voted_for_id INT REFERENCES users(id) ON DELETE SET NULL, -- NULL = Skip Vote
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Game Logs (For Post-Match Replay)
CREATE TABLE IF NOT EXISTS game_logs (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,   -- 'CODE_EDIT', 'RUN_TEST', 'VOTE'
    details TEXT,                       -- Details or code diff
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
