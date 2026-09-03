import express from 'express';
import {
  createRoom,
  joinRoom,
  getRoomByCode,
  getRoomPlayers,
} from '../controllers/roomController.js';

const router = express.Router();

router.post('/create-room', createRoom);
router.post('/join-room', joinRoom);
router.get('/:roomCode', getRoomByCode);
router.get('/:roomId/players', getRoomPlayers);

export default router;