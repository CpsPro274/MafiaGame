import express from 'express';
import { runCode } from '../services/codeRunner.js';
import pg from 'pg';

const router = express.Router();

// Use your existing PostgreSQL pool or import your db instance
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mafiagame'
});

/**
 * POST /api/run-code
 * Body: { roomId: 1, userId: 101, code: "def solution(...): ..." }
 */
router.post('/run-code', async (req, res) => {
  const { roomId, userId, code } = req.body;

  if (!roomId || code === undefined) {
    return res.status(400).json({ error: 'Missing required fields: roomId and code are required.' });
  }

  try {
    // 1. Fetch challenge test cases and language tied to this active room
    const query = `
      SELECT c.test_cases AS "testCases", c.language
      FROM rooms r
      JOIN challenges c ON r.challenge_id = c.id
      WHERE r.id = $1;
    `;
    const { rows } = await pool.query(query, [roomId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: `Room ${roomId} or associated challenge not found.` });
    }

    const { testCases, language } = rows[0];

    // 2. Execute code in the isolated Docker container
    const executionResult = await runCode({
      code,
      testCases: Array.isArray(testCases) ? testCases : [],
      language: language || 'python',
      timeoutSeconds: 10
    });

    // 3. Log the test execution to game_logs
    if (userId) {
      await pool.query(
        `INSERT INTO game_logs (room_id, user_id, action_type, details)
         VALUES ($1, $2, 'RUN_TEST', $3)`,
        [
          roomId,
          userId,
          JSON.stringify({
            status: executionResult.status,
            allPassed: executionResult.allPassed,
            exitCode: executionResult.exitCode,
            executionTimeMs: executionResult.executionTimeMs
          })
        ]
      );
    }

    // 4. Return structured test results to Monaco editor / frontend
    return res.status(200).json({
      status: executionResult.status,       // "passed", "failed", "timeout", or "error"
      allPassed: executionResult.allPassed, // true | false
      exitCode: executionResult.exitCode,
      output: executionResult.output,       // Raw terminal output (stdout + stderr)
      executionTimeMs: executionResult.executionTimeMs
    });

  } catch (error) {
    console.error('Error executing code in /api/run-code:', error);
    return res.status(500).json({
      status: 'error',
      allPassed: false,
      error: error.message
    });
  }
});

export default router;