import crypto from 'crypto';
import db from '../config/db.js';

export async function createRoomRecord({ hostId, challengeId = null }) {
  // Generate unique 6-character uppercase code
  let roomCode;
  let isUnique = false;

  while (!isUnique) {
    roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const existing = await db.query('SELECT id FROM rooms WHERE room_code = $1', [roomCode]);
    if (existing.rows.length === 0) isUnique = true;
  }

  // 1. Insert room
  const insertRoomQuery = `
    INSERT INTO rooms (room_code, host_id, challenge_id, status)
    VALUES ($1, $2, $3, 'LOBBY')
    RETURNING id, room_code AS "roomCode", host_id AS "hostId", challenge_id AS "challengeId", status, created_at AS "createdAt";
  `;
  const roomRes = await db.query(insertRoomQuery, [roomCode, hostId, challengeId]);
  const room = roomRes.rows[0];

  // 2. Add host as first player
  await db.query(
    `INSERT INTO room_players (room_id, user_id, role, is_alive)
     VALUES ($1, $2, 'DEVELOPER', true)
     ON CONFLICT (room_id, user_id) DO NOTHING;`,
    [room.id, hostId]
  );

  return { ...room, playerCount: 1 };
}

export async function joinRoomRecord({ roomCode, userId }) {
  const roomRes = await db.query(
    `SELECT id, room_code AS "roomCode", status, host_id AS "hostId", challenge_id AS "challengeId"
     FROM rooms
     WHERE room_code = $1`,
    [roomCode.trim().toUpperCase()]
  );

  if (roomRes.rows.length === 0) {
    return { status: 404, error: `Room with code '${roomCode}' not found.` };
  }

  const room = roomRes.rows[0];

  if (room.status !== 'LOBBY') {
    return { status: 400, error: 'Game has already started or ended.' };
  }

  // Add joining user
  await db.query(
    `INSERT INTO room_players (room_id, user_id, role, is_alive)
     VALUES ($1, $2, 'DEVELOPER', true)
     ON CONFLICT (room_id, user_id) DO NOTHING;`,
    [room.id, userId]
  );

  const countRes = await db.query(
    `SELECT COUNT(*)::int AS "playerCount" FROM room_players WHERE room_id = $1`,
    [room.id]
  );

  return {
    room: {
      ...room,
      playerCount: countRes.rows[0].playerCount,
    },
  };
}