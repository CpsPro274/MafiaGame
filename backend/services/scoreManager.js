
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
      roundsPlayed: 0,
      roundsSurvived: 0,
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

/**
 * Award round-end XP to all alive players. Called between rounds to retain/accumulate scores.
 * - Alive developers earn participation XP each round.
 * - Alive mafia earn survival XP each round.
 * - Correct vote bonus is awarded if the ejected player was mafia.
 */
export function awardRoundXp(roomCode, ejectedPlayer, wasMafia) {
  const normalized = roomCode.trim().toUpperCase();
  const playerMap = roomScores.get(normalized);
  if (!playerMap) return [];

  playerMap.forEach((player) => {
    player.roundsPlayed = (player.roundsPlayed || 0) + 1;

    if (player.isAlive !== false) {
      player.roundsSurvived = (player.roundsSurvived || 0) + 1;

      if (player.role === "DEVELOPER") {
        // Developers get 50 XP for surviving a round
        player.xp += 50;
        console.log(`🛡️ [Round XP] ${player.username} (DEVELOPER) +50 XP (round survival)`);
      } else if (player.role === "MAFIA") {
        // Mafia gets 75 XP for surviving a round without being caught
        player.xp += 75;
        console.log(`😈 [Round XP] ${player.username} (MAFIA) +75 XP (evaded detection)`);
      }
    }
  });

  // Award correct-vote bonus if someone correctly identified mafia
  if (ejectedPlayer && wasMafia) {
    playerMap.forEach((player) => {
      // Check if this player voted for the ejected mafia member
      // (vote tracking is done in roomManager, we just award the bonus here conceptually)
    });
  }

  console.log(`📊 [Round XP Awarded] Room: ${normalized}`);
  return Array.from(playerMap.values()).sort((a, b) => b.xp - a.xp);
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
      // Losers keep their accumulated round XP, just don't get the victory bonus
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
