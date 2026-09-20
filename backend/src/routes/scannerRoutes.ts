import { Router } from 'express';
import { createPairingSession, verifyPairing } from '../controllers/scannerController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Desk generates pairing session
router.post('/pair-session', requireAuth, createPairingSession);

// Mobile device checks pairing
router.get('/verify-session', verifyPairing);

export default router;
