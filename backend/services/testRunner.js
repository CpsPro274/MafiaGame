import { executeChallengeCode } from './codeRunner.js';
import db from './db.js'; // Your PostgreSQL client pool

export async function onRunCodeTriggered({ roomId, userId, currentEditorCode }) {
  // 1. Fetch challenge configuration tied to this room
  const roomQuery = await db.query(
    `SELECT c.test_cases, c.language 
     FROM rooms r 
     JOIN challenges c ON r.challenge_id = c.id 
     WHERE r.id = $1`,
    [roomId]
  );

  if (roomQuery.rows.length === 0) {
    throw new Error(`Room ${roomId} or associated challenge not found.`);
  }

  const { test_cases, language } = roomQuery.rows[0];

  // 2. Call the codeRunner module
  const runResult = await executeChallengeCode({
    roomId,
    userId,
    userCode: currentEditorCode,
    testCases: test_cases,
    language
  });

  // 3. Log action to game_logs matching your schema
  await db.query(
    `INSERT INTO game_logs (room_id, user_id, action_type, details) 
     VALUES ($1, $2, $3, $4)`,
    [
      runResult.gameLogEntry.room_id,
      runResult.gameLogEntry.user_id,
      runResult.gameLogEntry.action_type,
      runResult.gameLogEntry.details
    ]
  );

  // 4. Return results to your socket/HTTP layer to broadcast to players
  return runResult;
}