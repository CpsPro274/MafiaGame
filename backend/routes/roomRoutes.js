import express from 'express';
import { getRoomByCode, getRoomPlayers } from '../controllers/roomController.js';

const router = express.Router();

router.get('/:roomCode', getRoomByCode);
router.get('/:roomId/players', getRoomPlayers);

export default router;