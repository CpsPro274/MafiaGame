import express from 'express';
import { getAllChallenges, getChallengeById } from '../controllers/challengeController.js';

const router = express.Router();

router.get('/', getAllChallenges);
router.get('/:id', getChallengeById);

export default router;