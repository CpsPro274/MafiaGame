import express from "express";
import { query } from "../config/db.js";
import { getRoom } from "../services/roomManager.js";
import { getChallengeByDifficulty } from "../services/challengeService.js";

const router = express.Router();

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

router.get("/:id", async (req, res) => {
  try {
    const param = req.params.id;

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
      const challenge = getChallengeByDifficulty("MEDIUM");
      return res.json(challenge);
    }

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
    const challenge = getChallengeByDifficulty("MEDIUM");
    res.json(challenge);
  }
});

export default router;
