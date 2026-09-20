import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config/config.js';
import { connectDB } from './config/db.js';
import { initSocketIO } from './socket/socketManager.js';

import authRoutes from './routes/authRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import scannerRoutes from './routes/scannerRoutes.js';
import portalRoutes from './routes/portalRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import importRoutes from './routes/importRoutes.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for audit
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/health')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/barcode', qrRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/import', importRoutes);

// Health check & network info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    localIp: config.localIp,
    port: config.port,
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  server.listen(config.port, '0.0.0.0', () => {
    console.log('\n======================================================');
    console.log(`🚀 HackFlow Backend Server running on port ${config.port}`);
    console.log(`📡 Local Access:   http://localhost:${config.port}`);
    console.log(`📶 Network Access: http://${config.localIp}:${config.port}`);
    console.log('======================================================\n');
  });
};

startServer();
