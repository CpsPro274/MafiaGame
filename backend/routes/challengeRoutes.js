import express from "express";
import { query } from "../config/db.js";

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
 * Get a single challenge by ID with initial buggy code
 * GET /api/challenges/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const result = await query(
      `SELECT id, title, description, language, buggy_code, test_cases 
       FROM challenges 
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Challenge not found" });
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
    res.status(500).json({ error: "Failed to fetch challenge details" });
  }
});

export default router;
