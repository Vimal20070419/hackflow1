import { Router } from 'express';
import {
  getParticipantPortal,
  selectProblemStatement,
  verifyParticipantPassword,
} from '../controllers/portalController.js';

const router = Router();

// Participant wristband scan endpoint (protected by Team Leader phone number)
router.get('/:qrId', getParticipantPortal);
router.post('/:qrId/verify-password', verifyParticipantPassword);
router.post('/:qrId/problem', selectProblemStatement);

export default router;
