import { query } from "../config/db.js";

export async function getOrCreateUser(username) {
  const cleanUsername = username.trim();
  try {
    const existing = await query(
      "SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)",
      [cleanUsername]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    const inserted = await query(
      `INSERT INTO users (username, password)
       VALUES ($1, 'guest_password')
       RETURNING id`,
      [cleanUsername]
    );

    return inserted.rows[0].id;
  } catch (err) {
    return "mem_" + cleanUsername;
  }
}

export async function saveRoomToDb(roomCode, hostUsername) {
  try {
    const hostId = await getOrCreateUser(hostUsername);

    let challengeId = null;
    try {
      const challengeRes = await query("SELECT id FROM challenges ORDER BY id ASC LIMIT 1");
      if (challengeRes.rows.length > 0) {
        challengeId = challengeRes.rows[0].id;
      }
    } catch (_) {}

    const roomRes = await query(
      `INSERT INTO rooms (room_code, host_id, challenge_id, status)
       VALUES ($1, $2, $3, 'LOBBY')
       RETURNING id, room_code, host_id, challenge_id, status, created_at`,
      [roomCode, typeof hostId === "number" ? hostId : null, challengeId]
    );

    const dbRoom = roomRes.rows[0];

    if (hostId && dbRoom?.id) {
      await query(
        `INSERT INTO room_players (room_id, user_id, role, is_alive)
         VALUES ($1, $2, 'HOST', TRUE)
         ON CONFLICT (room_id, user_id) DO NOTHING`,
        [dbRoom.id, hostId]
      );
    }

    console.log(`💾 [DB Saved] Room "${roomCode}" (ID: ${dbRoom.id}) created by ${hostUsername}`);
    return dbRoom;
  } catch (err) {
    return null;
  }
}

export async function savePlayerJoinToDb(roomCode, username) {
  try {
    const userId = await getOrCreateUser(username);
    if (!userId || typeof userId !== "number") return null;

    const roomRes = await query("SELECT id FROM rooms WHERE room_code = $1", [roomCode]);
    if (roomRes.rows.length === 0) return null;

    const roomId = roomRes.rows[0].id;

    await query(
      `INSERT INTO room_players (room_id, user_id, role, is_alive)
       VALUES ($1, $2, 'PLAYER', TRUE)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [roomId, userId]
    );

    console.log(`💾 [DB Saved] Player "${username}" added to Room ID ${roomId}`);
    return { roomId, userId };
  } catch (err) {
    return null;
  }
}

export async function updateMatchStartInDb(roomCode, players) {
  try {
    const roomRes = await query(
      `UPDATE rooms 
       SET status = 'PLAYING' 
       WHERE room_code = $1 
       RETURNING id`,
      [roomCode]
    );

    if (roomRes.rows.length === 0) return;
    const roomId = roomRes.rows[0].id;

    for (const player of players) {
      const userId = await getOrCreateUser(player.username);
      if (userId && typeof userId === "number") {
        await query(
          `UPDATE room_players
           SET role = $1
           WHERE room_id = $2 AND user_id = $3`,
          [player.role, roomId, userId]
        );
      }
    }

    console.log(`💾 [DB Updated] Match "${roomCode}" started & roles saved.`);
  } catch (err) {
  }
}

export async function removePlayerFromDb(roomCode, username) {
  try {
    const roomRes = await query("SELECT id FROM rooms WHERE room_code = $1", [roomCode]);
    if (roomRes.rows.length === 0) return;
    const roomId = roomRes.rows[0].id;

    const userRes = await query("SELECT id FROM users WHERE LOWER(username) = LOWER($1)", [username]);
    if (userRes.rows.length === 0) return;
    const userId = userRes.rows[0].id;

    await query("DELETE FROM room_players WHERE room_id = $1 AND user_id = $2", [roomId, userId]);
  } catch (err) {
  }
}

export async function getRoomFromDb(roomCode) {
  try {
    const cleanCode = roomCode.trim().toUpperCase();
    const res = await query(
      `SELECT r.id, r.room_code, r.host_id, r.challenge_id, r.status, r.created_at, u.username as host_username
       FROM rooms r
       LEFT JOIN users u ON r.host_id = u.id
       WHERE r.room_code = $1`,
      [cleanCode]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (err) {
    return null;
  }
}

