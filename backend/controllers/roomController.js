import * as roomService from '../services/roomService.js';

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