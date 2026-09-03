// Points, XP & Leaderboard Score Manager

const roomScores = new Map(); // Key: roomCode, Value: Map of username -> { xp, testsFixed, sabotagesPlanted, votesCorrect, role }

/**
 * Initialize player score cards when a match starts
 */
export function initScores(roomCode, players) {
  const normalized = roomCode.trim().toUpperCase();
  const playerMap = new Map();

  players.forEach((p) => {
    playerMap.set(p.username, {
      username: p.username,
      role: p.role || "DEVELOPER",
      xp: 0,
      testsFixed: 0,
      sabotagesPlanted: 0,
      votesCorrect: 0,
      isAlive: true
    });
  });

  roomScores.set(normalized, playerMap);
  console.log(`🏆 [Scores Initialized] Room: ${normalized} with ${players.length} players`);
}

/**
 * Award XP points to a player for in-game achievements
 */
export function awardPoints(roomCode, username, points, reason) {
  const normalized = roomCode.trim().toUpperCase();
  const playerMap = roomScores.get(normalized);
  if (!playerMap) return null;

  const player = playerMap.get(username);
  if (!player) return null;

  player.xp += points;

  if (reason === "TEST_PASS") player.testsFixed += 1;
  if (reason === "SABOTAGE") player.sabotagesPlanted += 1;
  if (reason === "VOTE_CORRECT") player.votesCorrect += 1;

  console.log(`⭐ [XP Awarded] ${username} earned +${points} XP (${reason}). Total: ${player.xp} XP`);
  return { player, allScores: Array.from(playerMap.values()) };
}

/**
 * Get current room leaderboard sorted by XP
 */
export function getLeaderboard(roomCode) {
  const normalized = roomCode.trim().toUpperCase();
  const playerMap = roomScores.get(normalized);
  if (!playerMap) return [];

  return Array.from(playerMap.values()).sort((a, b) => b.xp - a.xp);
}
