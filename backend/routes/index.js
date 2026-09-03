import express from 'express';
import roomRoutes from './roomRoutes.js';
import challengeRoutes from './challengeRoutes.js';
import authRoutes from './authRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/challenges', challengeRoutes);

export default router;