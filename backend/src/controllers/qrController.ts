import { Request, Response } from 'express';
import { QRCode } from '../models/QRCode.js';
import { Team } from '../models/Team.js';
import { ScanLog } from '../models/ScanLog.js';
import { getIO } from '../socket/socketManager.js';
import { extractSingleBarcode, getBarcodeVariations } from '../utils/barcodeUtils.js';

export const verifyQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { qrId: rawInput, barcodeId, currentTeamId } = req.body;
    const input = rawInput || barcodeId;
    if (!input) {
      res.status(400).json({ success: false, message: 'Barcode ID or raw scan string is required' });
      return;
    }

    const qrId = extractSingleBarcode(input);
    const variations = getBarcodeVariations(input);
    const qrRecord = await QRCode.findOne({
      qrId: { $in: variations },
    });

    if (!qrRecord) {
      res.status(404).json({
        success: false,
        status: 'INVALID_QR',
        qrId,
        message: `Invalid Barcode: "${qrId || input}" does not exist in the pre-printed organizers pool.`,
      });
      return;
    }

    // If allocated to the same team, it's valid for update/replacement
    const isSameTeam = currentTeamId && qrRecord.teamId && qrRecord.teamId.toString() === currentTeamId.toString();

    if ((qrRecord.status === 'ALLOCATED' || qrRecord.status === 'ACTIVE') && !isSameTeam) {
      res.status(409).json({
        success: false,
        status: 'ALREADY_ALLOCATED',
        qrId: qrRecord.qrId,
        allocatedTo: {
          teamId: qrRecord.teamId,
          teamName: qrRecord.teamName,
          collegeName: qrRecord.collegeName,
          teamLeader: qrRecord.teamLeader,
          deskNumber: qrRecord.deskNumber,
          allocatedAt: qrRecord.allocatedAt,
        },
        message: `Barcode "${qrRecord.qrId}" is already allocated to "${qrRecord.teamName}" from "${qrRecord.collegeName}".`,
      });
      return;
    }

    res.json({
      success: true,
      status: 'UNUSED',
      qrId: qrRecord.qrId,
      message: `Barcode "${qrRecord.qrId}" is ready for allocation.`,
      qrRecord,
    });
  } catch (error: any) {
    console.error('[Barcode] Verify error:', error);
    res.status(500).json({ success: false, message: 'Verification error', error: error.message });
  }
};

export const allocateQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { qrId: rawInput, barcodeId, teamId, deskNumber, allocatedBy } = req.body;
    const input = rawInput || barcodeId;

    if (!input || !teamId) {
      res.status(400).json({
        success: false,
        message: 'Both Barcode ID and Team ID are required for allocation',
      });
      return;
    }

    const qrId = extractSingleBarcode(input);
    const deskNum = deskNumber ? Number(deskNumber) : 1;

    // 1. Verify Team
    const team = await Team.findById(teamId);
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    // 2. Verify Team Leader is selected
    if (!team.teamLeader || !team.teamLeader.name) {
      res.status(400).json({
        success: false,
        message: 'Please assign a Team Leader from the team members before allocating a barcode wristband.',
      });
      return;
    }

    // 3. Find the target barcode using all variation matches
    const variations = getBarcodeVariations(input);
    const targetQR = await QRCode.findOne({
      qrId: { $in: variations },
    });

    if (!targetQR) {
      res.status(404).json({
        success: false,
        status: 'INVALID_QR',
        message: `Barcode "${qrId}" is invalid and not found in the pool.`,
      });
      return;
    }

    // If barcode was previously given to ANOTHER team, check or reassign
    if (targetQR.teamId && targetQR.teamId.toString() !== team._id.toString() && targetQR.status === 'ALLOCATED') {
      // Release it from other team if replacing
      await Team.updateOne(
        { _id: targetQR.teamId, qrId: targetQR.qrId },
        { $set: { qrId: null, registrationStatus: 'PENDING' } }
      );
    }

    // 4. If the current team already had a PREVIOUS barcode, release that old barcode back to UNUSED
    const previousBarcodeId = team.qrId;
    if (previousBarcodeId && previousBarcodeId !== targetQR.qrId) {
      await QRCode.updateOne(
        { qrId: previousBarcodeId },
        {
          $set: {
            status: 'UNUSED',
            teamId: null,
            teamName: null,
            collegeName: null,
            teamLeader: null,
            allocatedBy: null,
            deskNumber: null,
            allocatedAt: null,
          },
        }
      );
      // Remove previous barcode logs to prevent duplicate accumulated records
      await ScanLog.deleteMany({ qrId: previousBarcodeId });
    }

    // 5. Update the target barcode with current team info
    const updatedQR = await QRCode.findOneAndUpdate(
      { _id: targetQR._id },
      {
        $set: {
          status: 'ALLOCATED',
          teamId: team._id,
          teamName: team.teamName,
          collegeName: team.collegeName,
          teamLeader: team.teamLeader.name,
          deskNumber: deskNum,
          allocatedBy: allocatedBy || `Desk ${deskNum}`,
          allocatedAt: new Date(),
        },
      },
      { new: true }
    );

    // 6. Update Team record with the new single active barcode
    team.qrId = targetQR.qrId;
    team.registrationStatus = 'CONFIRMED';
    team.allocatedDesk = deskNum;
    team.allocatedAt = updatedQR?.allocatedAt || new Date();
    await team.save();

    // 7. Upsert ScanLog for this team/wristband (REPLACE previous scan record, no duplicates)
    await ScanLog.findOneAndUpdate(
      { teamId: team._id },
      {
        $set: {
          qrId: targetQR.qrId,
          teamId: team._id,
          teamName: team.teamName,
          collegeName: team.collegeName,
          deskNumber: deskNum,
          scannerDeviceId: `Desk ${deskNum}`,
          scanType: 'ALLOCATION',
          status: 'SUCCESS',
          message: `Barcode ${targetQR.qrId} active for team ${team.teamName} (${team.collegeName})`,
          timestamp: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Clean up any other scan logs with this qrId not belonging to this team
    await ScanLog.deleteMany({
      qrId: targetQR.qrId,
      teamId: { $ne: team._id },
    });

    // 8. Real-time broadcast to all registration desks
    try {
      const io = getIO();
      io.emit('registration-confirmed', {
        deskNumber: deskNum,
        teamId: team._id,
        teamName: team.teamName,
        collegeName: team.collegeName,
        teamLeader: team.teamLeader,
        qrId: targetQR.qrId,
        allocatedAt: updatedQR?.allocatedAt || new Date(),
        replacedPreviousBarcode: previousBarcodeId || null,
      });
    } catch (e) {
      console.warn('[Barcode] Socket broadcast failed (socket not initialized)');
    }

    res.json({
      success: true,
      message: `Barcode ${targetQR.qrId} successfully set as active for ${team.teamName}!`,
      qrRecord: updatedQR,
      team,
    });
  } catch (error: any) {
    console.error('[Barcode] Allocation error:', error);
    res.status(500).json({ success: false, message: 'Allocation failed', error: error.message });
  }
};

export const getQRPool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, desk } = req.query;
    const filter: any = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (desk && desk !== 'ALL') {
      filter.deskNumber = Number(desk);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { qrId: new RegExp(s, 'i') },
        { teamName: new RegExp(s, 'i') },
        { collegeName: new RegExp(s, 'i') },
      ];
    }

    const qrCodes = await QRCode.find(filter).sort({ qrId: 1 });
    const totalCount = await QRCode.countDocuments();
    const allocatedCount = await QRCode.countDocuments({ status: { $in: ['ALLOCATED', 'ACTIVE'] } });
    const unusedCount = await QRCode.countDocuments({ status: 'UNUSED' });

    res.json({
      success: true,
      qrCodes,
      summary: {
        total: totalCount,
        allocated: allocatedCount,
        unused: unusedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch barcode pool', error: error.message });
  }
};
