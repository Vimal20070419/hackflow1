import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { QRCode } from '../models/QRCode.js';
import { Team } from '../models/Team.js';
import { ScanLog } from '../models/ScanLog.js';
import { ScannerSession } from '../models/ScannerSession.js';

import { extractSingleBarcode, getBarcodeVariations } from '../utils/barcodeUtils.js';

let io: SocketIOServer | null = null;

// Helper to extract clean Barcode ID from raw scanned text or URL
export const extractQRId = extractSingleBarcode;
export const extractBarcodeId = extractSingleBarcode;

export const initSocketIO = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Registration Desk Laptop joins its dedicated room
    socket.on('join-desk', async (data: { deskNumber: number }) => {
      const deskNumber = Number(data.deskNumber);
      const room = `desk-${deskNumber}`;
      socket.join(room);
      console.log(`[Socket] Desk ${deskNumber} joined room ${room} (Socket ID: ${socket.id})`);

      // Check if there is an active connected scanner for this desk
      const activeSession = await ScannerSession.findOne({
        deskNumber,
        status: 'CONNECTED',
      }).sort({ updatedAt: -1 });

      socket.emit('desk-status', {
        deskNumber,
        pairedScanner: activeSession
          ? {
              deviceId: activeSession.deviceId,
              connectedAt: activeSession.connectedAt,
              lastScanAt: activeSession.lastScanAt,
            }
          : null,
      });
    });

    // Mobile Phone Scanner pairs with a desk
    socket.on(
      'scanner-pair',
      async (data: {
        sessionId: string;
        deskNumber: number;
        deviceId?: string;
      }) => {
        try {
          const { sessionId, deskNumber, deviceId } = data;
          const numDesk = Number(deskNumber);
          const room = `desk-${numDesk}`;

          console.log(`[Socket] Mobile scanner pairing to ${room} with session ${sessionId}`);

          const session = await ScannerSession.findOne({ sessionId, deskNumber: numDesk });
          if (!session) {
            socket.emit('scanner-pair-error', { message: 'Invalid or expired pairing session' });
            return;
          }

          session.status = 'CONNECTED';
          session.socketId = socket.id;
          session.deviceId = deviceId || `Mobile-Phone-${socket.id.slice(0, 5)}`;
          session.connectedAt = new Date();
          await session.save();

          socket.join(room);

          // Acknowledge mobile scanner
          socket.emit('scanner-paired-success', {
            deskNumber: numDesk,
            deviceId: session.deviceId,
            message: `Successfully connected to Registration Desk ${numDesk}`,
          });

          // Notify Desk Laptop that mobile scanner is now live!
          io?.to(room).emit('scanner-connected', {
            deskNumber: numDesk,
            deviceId: session.deviceId,
            connectedAt: session.connectedAt,
          });

          console.log(`[Socket] Scanner connected to Desk ${numDesk} successfully.`);
        } catch (error) {
          console.error('[Socket] Error in scanner-pair:', error);
          socket.emit('scanner-pair-error', { message: 'Internal pairing error' });
        }
      }
    );

    // Mobile Phone Scanned a Barcode
    const handleBarcodeScan = async (data: {
      deskNumber: number;
      rawScan: string;
      deviceId?: string;
    }) => {
      try {
        const { deskNumber, rawScan, deviceId } = data;
        const numDesk = Number(deskNumber);
        const room = `desk-${numDesk}`;
        const qrId = extractBarcodeId(rawScan);

        console.log(`[Socket] Barcode scan received on Desk ${numDesk} from ${deviceId || socket.id}: "${rawScan}" -> Extracted: "${qrId}"`);

        // Verify Barcode in DB using all possible variation matches
        const variations = getBarcodeVariations(rawScan);
        const qrRecord = await QRCode.findOne({
          qrId: { $in: variations },
        });

        let scanStatus: 'SUCCESS' | 'ALREADY_ALLOCATED' | 'INVALID_QR' | 'UNASSIGNED' = 'SUCCESS';
        let payload: any = {
          qrId: qrRecord ? qrRecord.qrId : qrId,
          rawScan,
          scannedAt: new Date(),
          deskNumber: numDesk,
          deviceId: deviceId || 'Mobile Barcode Camera',
        };

        if (!qrRecord) {
          scanStatus = 'INVALID_QR';
          payload.status = 'INVALID_QR';
          payload.message = `Barcode "${qrId}" is not part of the pre-printed hackathon pool.`;
        } else if (qrRecord.status === 'ALLOCATED' || qrRecord.status === 'ACTIVE') {
          scanStatus = 'ALREADY_ALLOCATED';
          payload.status = 'ALREADY_ALLOCATED';
          payload.allocatedTo = {
            teamName: qrRecord.teamName,
            collegeName: qrRecord.collegeName,
            teamLeader: qrRecord.teamLeader,
            allocatedAt: qrRecord.allocatedAt,
            deskNumber: qrRecord.deskNumber,
          };
          payload.message = `Barcode "${qrRecord.qrId}" is ALREADY ALLOCATED to "${qrRecord.teamName}" (${qrRecord.collegeName}). It cannot be reused.`;
        } else {
          // Unused and available for allocation
          scanStatus = 'SUCCESS';
          payload.status = 'UNUSED';
          payload.message = `Barcode "${qrRecord.qrId}" is verified UNUSED and ready for team allocation.`;
        }

        // Update session last scan
        await ScannerSession.findOneAndUpdate(
          { deskNumber: numDesk, socketId: socket.id },
          { lastScanAt: new Date() }
        );

        // Upsert the scan log (replace previous scan log for this barcode, no accumulated duplicate logs)
        const targetBarcode = qrRecord ? qrRecord.qrId : qrId;
        await ScanLog.findOneAndUpdate(
          { qrId: targetBarcode },
          {
            $set: {
              qrId: targetBarcode,
              teamId: qrRecord?.teamId || null,
              teamName: qrRecord?.teamName || undefined,
              collegeName: qrRecord?.collegeName || undefined,
              deskNumber: numDesk,
              scannerDeviceId: deviceId || 'Barcode Scanner',
              scanType: 'ALLOCATION',
              status: scanStatus,
              message: payload.message,
              timestamp: new Date(),
            },
          },
          { upsert: true, new: true }
        );

        // 1. Emit to the Desk Laptop in room:desk-X
        io?.to(room).emit('qr-scan-received', payload);
        io?.to(room).emit('barcode-scan-received', payload);

        // 2. Acknowledge the Mobile Scanner with feedback (beep/vibrate payload)
        socket.emit('scan-acknowledged', {
          qrId: qrRecord ? qrRecord.qrId : qrId,
          status: scanStatus,
          message: payload.message,
          timestamp: payload.scannedAt,
        });

      } catch (error) {
        console.error('[Socket] Error in barcode-scanned handler:', error);
        socket.emit('scan-acknowledged', {
          status: 'INVALID_QR',
          message: 'Server error processing barcode scan',
        });
      }
    };

    socket.on('barcode-scanned', handleBarcodeScan);
    socket.on('qr-scanned', handleBarcodeScan);

    // Disconnect handling
    socket.on('disconnect', async () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      try {
        const session = await ScannerSession.findOne({ socketId: socket.id });
        if (session) {
          session.status = 'DISCONNECTED';
          await session.save();

          const room = `desk-${session.deskNumber}`;
          io?.to(room).emit('scanner-disconnected', {
            deskNumber: session.deskNumber,
            deviceId: session.deviceId,
            message: 'Mobile scanner has disconnected. Reconnect scanner if needed.',
          });
          console.log(`[Socket] Mobile scanner on Desk ${session.deskNumber} marked disconnected.`);
        }
      } catch (err) {
        console.error('[Socket] Disconnect cleanup error:', err);
      }
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
};
