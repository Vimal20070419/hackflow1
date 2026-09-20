import { Router } from 'express';
import { verifyQR, allocateQR, getQRPool } from '../controllers/qrController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/verify', requireAuth, verifyQR);
router.post('/allocate', requireAuth, allocateQR);
router.get('/pool', requireAuth, getQRPool);

export default router;
