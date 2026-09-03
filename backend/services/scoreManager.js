
const roomScores = new Map();

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

export function finalizeMatchScores(roomCode, winnerTeam) {
  const normalized = roomCode.trim().toUpperCase();
  const playerMap = roomScores.get(normalized);
  if (!playerMap) return [];

  playerMap.forEach((player) => {
    const isWinner =
      (winnerTeam === "DEVELOPERS" && player.role === "DEVELOPER") ||
      (winnerTeam === "MAFIA" && player.role === "MAFIA");

    if (isWinner) {
      const victoryBonus = player.role === "MAFIA" ? 500 : 300;
      player.xp += victoryBonus;
      player.won = true;
    } else {
      player.xp = 0;
      player.won = false;
    }
  });

  console.log(`🏁 [Scores Finalized] Room: ${normalized} (Winner: ${winnerTeam})`);
  return Array.from(playerMap.values()).sort((a, b) => b.xp - a.xp);
}

export function getLeaderboard(roomCode) {
  const normalized = roomCode.trim().toUpperCase();
  const playerMap = roomScores.get(normalized);
  if (!playerMap) return [];

  return Array.from(playerMap.values()).sort((a, b) => b.xp - a.xp);
}
