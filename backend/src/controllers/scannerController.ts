import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ScannerSession } from '../models/ScannerSession.js';
import { config } from '../config/config.js';

export const createPairingSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deskNumber } = req.body;
    const deskNum = Number(deskNumber) || 1;

    // Generate unique session and easy-to-type 6-digit code
    const sessionId = uuidv4();
    const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create session record
    const session = await ScannerSession.create({
      sessionId,
      deskNumber: deskNum,
      pairingCode,
      status: 'WAITING',
    });

    // Generate LAN pairing URL for mobile device
    // If request has host header, prefer that IP/domain so phone resolves it on Wi-Fi
    const requestHost = req.headers.host ? req.headers.host.split(':')[0] : config.localIp;
    const hostToUse = requestHost === 'localhost' || requestHost === '127.0.0.1' ? config.localIp : requestHost;
    const pairingUrl = `http://${hostToUse}:5173/scanner?desk=${deskNum}&session=${sessionId}&code=${pairingCode}`;

    res.json({
      success: true,
      sessionId,
      pairingCode,
      deskNumber: deskNum,
      pairingUrl,
      session,
    });
  } catch (error: any) {
    console.error('[Scanner] Pairing session creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create scanner pairing session', error: error.message });
  }
};

export const verifyPairing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, pairingCode, deskNumber } = req.query;

    const filter: any = {};
    if (sessionId) {
      filter.sessionId = sessionId;
    } else if (pairingCode) {
      filter.pairingCode = pairingCode;
    } else {
      res.status(400).json({ success: false, message: 'Session ID or Pairing Code is required' });
      return;
    }

    if (deskNumber) {
      filter.deskNumber = Number(deskNumber);
    }

    const session = await ScannerSession.findOne(filter);
    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Scanner session not found or expired. Please generate a new pairing QR on the registration desk.',
      });
      return;
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        deskNumber: session.deskNumber,
        pairingCode: session.pairingCode,
        status: session.status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to verify pairing session', error: error.message });
  }
};
