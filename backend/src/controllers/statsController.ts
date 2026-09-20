import { Request, Response } from 'express';
import { Team } from '../models/Team.js';
import { QRCode } from '../models/QRCode.js';
import { ScanLog } from '../models/ScanLog.js';

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalTeams,
      confirmedTeams,
      pendingTeams,
      qrsAllocated,
      qrsRemaining,
      desk1Confirmed,
      desk2Confirmed,
      recentActivity,
    ] = await Promise.all([
      Team.countDocuments(),
      Team.countDocuments({ registrationStatus: 'CONFIRMED' }),
      Team.countDocuments({ registrationStatus: 'PENDING' }),
      QRCode.countDocuments({ status: { $in: ['ALLOCATED', 'ACTIVE'] } }),
      QRCode.countDocuments({ status: 'UNUSED' }),
      Team.countDocuments({ allocatedDesk: 1 }),
      Team.countDocuments({ allocatedDesk: 2 }),
      ScanLog.aggregate([
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: { $ifNull: ['$teamId', '$qrId'] },
            doc: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$doc' } },
        { $sort: { timestamp: -1 } },
        { $limit: 15 },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        totalTeams,
        confirmedTeams,
        pendingTeams,
        qrsAllocated,
        qrsRemaining,
        desk1Confirmed,
        desk2Confirmed,
      },
      recentActivity,
    });
  } catch (error: any) {
    console.error('[Stats] Error getting stats:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve stats', error: error.message });
  }
};
