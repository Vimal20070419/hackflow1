import { Router } from 'express';
import {
  searchTeams,
  getTeamById,
  setTeamLeader,
  getDistinctColleges,
  getDatasetParticipants,
  manualRegisterTeam,
} from '../controllers/teamController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Registration desk staff access
router.get('/search', requireAuth, searchTeams);
router.get('/colleges', requireAuth, getDistinctColleges);
router.get('/dataset-participants', requireAuth, getDatasetParticipants);
router.post('/manual-register', requireAuth, manualRegisterTeam);
router.get('/:id', requireAuth, getTeamById);
router.post('/:id/leader', requireAuth, setTeamLeader);

export default router;
