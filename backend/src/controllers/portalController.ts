import { Request, Response } from 'express';
import { Team } from '../models/Team.js';
import { QRCode } from '../models/QRCode.js';
import { ScanLog } from '../models/ScanLog.js';
import { extractQRId, getIO } from '../socket/socketManager.js';

// Helper to verify Team Leader password (phone number)
const verifyLeaderPassword = (team: any, inputPassword: string | undefined): boolean => {
  if (!inputPassword) return false;
  const leaderPhone =
    team.teamLeader?.phone ||
    team.members?.find((m: any) => m.isLeader)?.phone ||
    team.members?.[0]?.phone ||
    '';
  const cleanLeader = String(leaderPhone).replace(/\D/g, '');
  const cleanInput = String(inputPassword).replace(/\D/g, '');
  if (!cleanLeader || !cleanInput) return false;
  return cleanLeader === cleanInput || cleanLeader.slice(-10) === cleanInput.slice(-10);
};

export const getParticipantPortal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { qrId: rawInput } = req.params;
    const qrId = extractQRId(rawInput);

    if (!qrId) {
      res.status(400).json({ success: false, message: 'Invalid or missing Barcode ID' });
      return;
    }

    // Check Barcode in Pool
    const qrRecord = await QRCode.findOne({
      $or: [
        { qrId },
        { qrId: qrId.replace('BC-', 'QR-') },
        { qrId: qrId.replace('QR-', 'BC-') },
      ],
    });

    if (!qrRecord) {
      res.status(404).json({
        success: false,
        message: `Wristband Barcode "${qrId}" was not recognized. Please consult the registration desk.`,
      });
      return;
    }

    if (qrRecord.status === 'UNUSED' || !qrRecord.teamId) {
      res.status(403).json({
        success: false,
        message: `This Barcode wristband (${qrRecord.qrId}) is not yet activated. Please proceed to Registration Desk 1 or 2 for team verification and check-in.`,
      });
      return;
    }

    // Fetch Team
    const team = await Team.findById(qrRecord.teamId);
    if (!team) {
      res.status(404).json({
        success: false,
        message: 'Associated team record could not be found.',
      });
      return;
    }

    // Check password (Team Leader's Phone Number)
    const inputPassword = (req.query.password as string) || (req.headers['x-portal-password'] as string) || '';
    if (!verifyLeaderPassword(team, inputPassword)) {
      res.status(401).json({
        success: false,
        requiresPassword: true,
        message: inputPassword
          ? "Incorrect password. Please enter the Team Leader's registered phone number."
          : "Please enter the Team Leader's phone number to access team portal.",
        teamBrief: {
          teamName: team.teamName,
          collegeName: team.collegeName,
          leaderName:
            team.teamLeader?.name ||
            team.members?.find((m: any) => m.isLeader)?.name ||
            team.members?.[0]?.name,
          qrId: team.qrId,
        },
      });
      return;
    }

    // Log participant access
    await ScanLog.create({
      qrId: qrRecord.qrId,
      teamId: team._id,
      teamName: team.teamName,
      collegeName: team.collegeName,
      scanType: 'PARTICIPANT_ACCESS',
      status: 'SUCCESS',
      message: `Team "${team.teamName}" accessed participant portal via wristband ${qrRecord.qrId}`,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      team: {
        id: team._id,
        collegeName: team.collegeName,
        teamName: team.teamName,
        members: team.members,
        teamLeader: team.teamLeader,
        domain: team.domain,
        category: team.category,
        qrId: qrRecord.qrId,
        registrationStatus: team.registrationStatus,
        allocatedDesk: team.allocatedDesk,
        allocatedAt: team.allocatedAt,
        availableProblemStatements: team.availableProblemStatements,
        selectedProblemStatement: team.selectedProblemStatement,
      },
    });
  } catch (error: any) {
    console.error('[Portal] Fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error loading participant portal' });
  }
};

export const verifyParticipantPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { qrId: rawInput } = req.params;
    const { password } = req.body;
    const qrId = extractQRId(rawInput);

    const qrRecord = await QRCode.findOne({
      $or: [
        { qrId },
        { qrId: qrId.replace('BC-', 'QR-') },
        { qrId: qrId.replace('QR-', 'BC-') },
      ],
    });

    if (!qrRecord || !qrRecord.teamId) {
      res.status(404).json({ success: false, message: 'Invalid wristband barcode or unassigned team.' });
      return;
    }

    const team = await Team.findById(qrRecord.teamId);
    if (!team) {
      res.status(404).json({ success: false, message: 'Team record not found' });
      return;
    }

    if (!verifyLeaderPassword(team, password)) {
      res.status(401).json({
        success: false,
        message: "Incorrect password. Please enter the Team Leader's registered phone number.",
      });
      return;
    }

    res.json({
      success: true,
      message: 'Password verified successfully.',
      team,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error verifying password', error: error.message });
  }
};

export const selectProblemStatement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { qrId: rawInput } = req.params;
    const { problemId, password } = req.body;
    const qrId = extractQRId(rawInput);

    if (!problemId) {
      res.status(400).json({ success: false, message: 'Problem statement ID is required' });
      return;
    }

    const qrRecord = await QRCode.findOne({
      $or: [
        { qrId },
        { qrId: qrId.replace('BC-', 'QR-') },
        { qrId: qrId.replace('QR-', 'BC-') },
      ],
    });

    if (!qrRecord || !qrRecord.teamId) {
      res.status(404).json({ success: false, message: 'Invalid wristband barcode or unassigned team.' });
      return;
    }

    const team = await Team.findById(qrRecord.teamId);
    if (!team) {
      res.status(404).json({ success: false, message: 'Team record not found' });
      return;
    }

    // Verify Password
    const inputPassword = password || (req.headers['x-portal-password'] as string);
    if (!verifyLeaderPassword(team, inputPassword)) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized. Valid Team Leader phone number is required to lock a problem statement.',
      });
      return;
    }

    // Check if already locked
    if (team.selectedProblemStatement && team.selectedProblemStatement.id) {
      res.status(409).json({
        success: false,
        message: 'Problem statement selection is already locked and cannot be modified.',
        selectedProblemStatement: team.selectedProblemStatement,
      });
      return;
    }

    // Find the problem in available problems
    const problem = (team.availableProblemStatements || []).find((p) => p.id === problemId);
    if (!problem) {
      res.status(400).json({
        success: false,
        message: `Problem statement "${problemId}" is not available for domain "${team.domain}".`,
      });
      return;
    }

    // Lock problem
    team.selectedProblemStatement = {
      ...problem,
      selectedAt: new Date(),
    };
    await team.save();

    // Log problem lock
    await ScanLog.create({
      qrId: qrRecord.qrId,
      teamId: team._id,
      teamName: team.teamName,
      collegeName: team.collegeName,
      scanType: 'PARTICIPANT_ACCESS',
      status: 'SUCCESS',
      message: `Team "${team.teamName}" locked problem statement: [${problem.id}] ${problem.title}`,
      timestamp: new Date(),
    });

    // Notify desks
    try {
      const io = getIO();
      io.emit('problem-selected', {
        teamId: team._id,
        teamName: team.teamName,
        collegeName: team.collegeName,
        qrId: qrRecord.qrId,
        selectedProblem: team.selectedProblemStatement,
      });
    } catch (e) {
      // ignore
    }

    res.json({
      success: true,
      message: `Successfully locked problem statement [${problem.id}] for ${team.teamName}!`,
      selectedProblemStatement: team.selectedProblemStatement,
    });
  } catch (error: any) {
    console.error('[Portal] Problem statement selection error:', error);
    res.status(500).json({ success: false, message: 'Server error saving problem statement' });
  }
};
