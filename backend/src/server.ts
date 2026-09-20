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

// Initialize Socket.IO if in standalone server mode
try {
  initSocketIO(server);
} catch (e) {
  // socket catch for serverless
}

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure DB connected on each request (Serverless friendly)
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
  } catch (e) {
    // continue
  }
  next();
});

// Request logger for audit
app.use((req, _res, next) => {
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
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    localIp: config.localIp,
    port: config.port,
  });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server when run directly in node/local environment
if (!process.env.VERCEL) {
  connectDB().then(() => {
    server.listen(config.port, '0.0.0.0', () => {
      console.log('\n======================================================');
      console.log(`🚀 HackFlow Backend Server running on port ${config.port}`);
      console.log(`📡 Local Access:   http://localhost:${config.port}`);
      console.log(`📶 Network Access: http://${config.localIp}:${config.port}`);
      console.log('======================================================\n');
    });
  });
}

export { app, server };
export default app;
