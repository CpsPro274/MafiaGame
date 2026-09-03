import express from "express";
import { query } from "../config/db.js";
import { getRoom } from "../services/roomManager.js";
import { getChallengeByDifficulty } from "../services/challengeService.js";

const router = express.Router();

/**
 * Get all available challenges (for lobby selection)
 * GET /api/challenges
 */
router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT id, title, description, language, created_at 
       FROM challenges 
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Challenges Error:", err);
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

/**
 * Get a single challenge by ID or Room Code with initial buggy code
 * GET /api/challenges/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const param = req.params.id;

    // Handle alphanumeric Room Code strings (e.g. "NJ86XC")
    if (isNaN(Number(param))) {
      const room = getRoom(param);
      const difficulty = room ? room.difficulty : "MEDIUM";
      const challenge = getChallengeByDifficulty(difficulty);
      return res.json(challenge);
    }

    const result = await query(
      `SELECT id, title, description, language, buggy_code, test_cases 
       FROM challenges 
       WHERE id = $1`,
      [Number(param)]
    );

    if (result.rows.length === 0) {
      // Fallback to default challenge if not found in database
      const challenge = getChallengeByDifficulty("MEDIUM");
      return res.json(challenge);
    }

    // Filter hidden test cases before sending to client during gameplay
    const challenge = result.rows[0];
    const publicTests = Array.isArray(challenge.test_cases)
      ? challenge.test_cases.filter((t) => !t.hidden)
      : challenge.test_cases;

    res.json({
      ...challenge,
      test_cases: publicTests
    });
  } catch (err) {
    console.error("Fetch Challenge Details Error:", err);
    // Graceful fallback to medium difficulty challenge on database error
    const challenge = getChallengeByDifficulty("MEDIUM");
    res.json(challenge);
  }
});

export default router;
