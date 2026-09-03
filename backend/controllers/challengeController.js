import * as challengeService from '../services/challengeService.js';

export async function getAllChallenges(req, res) {
  try {
    const challenges = await challengeService.findAllChallenges();
    return res.status(200).json({ challenges });
  } catch (error) {
    console.error('Error in getAllChallenges:', error);
    return res.status(500).json({ error: 'Internal server error while fetching challenges.' });
  }
}

export async function getChallengeById(req, res) {
  try {
    const { id } = req.params;
    const challenge = await challengeService.findChallengeById(id);

    if (!challenge) {
      return res.status(404).json({ error: `Challenge with ID ${id} not found.` });
    }

    return res.status(200).json({ challenge });
  } catch (error) {
    console.error('Error in getChallengeById:', error);
    return res.status(500).json({ error: 'Internal server error while fetching challenge.' });
  }
}