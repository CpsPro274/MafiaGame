import * as roomService from '../services/roomService.js';

export async function createRoom(req, res) {
  try {
    const hostId = req.body.hostId || req.user?.id;
    const { challengeId = null } = req.body;

    if (!hostId) {
      return res.status(400).json({ error: 'hostId is required to create a room.' });
    }

    const room = await roomService.createRoomRecord({ hostId, challengeId });
    return res.status(201).json({
      message: 'Room created successfully',
      room,
    });
  } catch (error) {
    console.error('Error in createRoom:', error);
    return res.status(500).json({ error: 'Internal server error while creating room.' });
  }
}

export async function joinRoom(req, res) {
  try {
    const userId = req.body.userId || req.user?.id;
    const { roomCode } = req.body;

    if (!roomCode || !userId) {
      return res.status(400).json({ error: 'roomCode and userId are required.' });
    }

    const result = await roomService.joinRoomRecord({ roomCode, userId });

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json({
      message: 'Joined room successfully',
      room: result.room,
    });
  } catch (error) {
    console.error('Error in joinRoom:', error);
    return res.status(500).json({ error: 'Internal server error while joining room.' });
  }
}

export async function getRoomByCode(req, res) {
  try {
    const { roomCode } = req.params;
    const room = await roomService.findRoomByCode(roomCode);

    if (!room) {
      return res.status(404).json({ error: `Room with code '${roomCode}' not found.` });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error('Error in getRoomByCode:', error);
    return res.status(500).json({ error: 'Internal server error while fetching room details.' });
  }
}

export async function getRoomPlayers(req, res) {
  try {
    const { roomId } = req.params;
    // Reads user id from query or auth middleware (req.user?.id)
    const requestingUserId = req.query.userId || req.user?.id || null;

    const players = await roomService.findPlayersByRoomId(roomId, requestingUserId);
    return res.status(200).json({ players });
  } catch (error) {
    console.error('Error in getRoomPlayers:', error);
    return res.status(500).json({ error: 'Internal server error while fetching player roster.' });
  }
}