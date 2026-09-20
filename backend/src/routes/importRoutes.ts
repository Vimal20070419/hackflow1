import { Router } from 'express';
import multer from 'multer';
import { importExcelDataset } from '../controllers/importController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/excel', requireAuth, upload.single('file'), importExcelDataset);

export default router;
