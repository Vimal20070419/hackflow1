import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { Team } from '../models/Team.js';
import { QRCode } from '../models/QRCode.js';
import { ScanLog } from '../models/ScanLog.js';
import { getIO } from '../socket/socketManager.js';
import { normalizeCollege } from '../seeds/seedData.js';
import { getProblemsForDomain } from '../seeds/problemStatements.js';
import { extractSingleBarcode, getBarcodeVariations } from '../utils/barcodeUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface IDatasetParticipant {
  name: string;
  phone: string;
  email: string;
  collegeName: string;
  rawCollege: string;
  originalTeamName: string;
  domain: string;
  transactionId?: string;
}

let cachedDatasetParticipants: IDatasetParticipant[] | null = null;

export function loadDatasetParticipants(): IDatasetParticipant[] {
  if (cachedDatasetParticipants && cachedDatasetParticipants.length > 0) {
    return cachedDatasetParticipants;
  }

  // Attempt to find registrations.csv in seeds directory
  const possiblePaths = [
    path.join(__dirname, '../seeds/registrations.csv'),
    path.join(process.cwd(), 'src/seeds/registrations.csv'),
    path.join(process.cwd(), 'backend/src/seeds/registrations.csv'),
    path.join(process.cwd(), 'dist/seeds/registrations.csv'),
  ];

  let csvPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    console.warn('[Dataset] registrations.csv not found on disk, returning empty array');
    return [];
  }

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const workbook = XLSX.read(csvContent, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const participants: IDatasetParticipant[] = [];

    for (const r of rows) {
      const rawTeam = (r['Team Name '] || r['Team Name'] || '').trim();
      const rawCollege = (r['College '] || r['College'] || '').trim();
      const rawDomain = (r['Domain'] || 'Gen AI & AI').trim();
      const rawName = (r['Name'] || '').trim();
      const rawPhone = String(r['Phone number'] || '').trim().replace(/\s+/g, ' ');
      const rawEmail = (r['Email Address'] || r['Mail Id'] || '').trim().toLowerCase();
      const rawTxn = String(r['UPI transaction Id  ex. 66117840xxxx  Not- abcdxx@oksbi'] || '').trim().replace(/^'+/, '');

      if (!rawName) continue;

      const cleanCollege = normalizeCollege(rawCollege);
      const cleanTeam = rawTeam.replace(/\s+/g, ' ').trim();

      participants.push({
        name: rawName,
        phone: rawPhone,
        email: rawEmail,
        collegeName: cleanCollege,
        rawCollege,
        originalTeamName: cleanTeam,
        domain: rawDomain,
        transactionId: rawTxn,
      });
    }

    cachedDatasetParticipants = participants;
    return participants;
  } catch (err) {
    console.error('[Dataset] Error reading registrations.csv:', err);
    return [];
  }
}

export const searchTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, status, college, domain, page = '1', limit = '50' } = req.query;

    const filter: any = {};

    // Filter by registration status
    if (status && status !== 'ALL') {
      filter.registrationStatus = status;
    }

    // Filter by specific college
    if (college && college !== 'ALL') {
      filter.collegeName = college;
    }

    // Filter by domain
    if (domain && domain !== 'ALL') {
      filter.domain = domain;
    }

    // Search query across College Name, Team Name, and Team Member Names
    if (query && typeof query === 'string' && query.trim() !== '') {
      const q = query.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { collegeName: regex },
        { teamName: regex },
        { 'members.name': regex },
        { 'members.email': regex },
        { 'members.phone': regex },
        { qrId: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string, 10) || 200));
    const skip = (pageNum - 1) * limitNum;

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .sort({ collegeName: 1, teamName: 1 })
        .skip(skip)
        .limit(limitNum),
      Team.countDocuments(filter),
    ]);

    res.json({
      success: true,
      teams,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('[Teams] Search error:', error);
    res.status(500).json({ success: false, message: 'Failed to search teams', error: error.message });
  }
};

export const getTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }
    res.json({ success: true, team });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve team', error: error.message });
  }
};

export const setTeamLeader = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { memberName } = req.body;

    if (!memberName) {
      res.status(400).json({ success: false, message: 'Member name is required to assign as Team Leader' });
      return;
    }

    const team = await Team.findById(id);
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    // Find the target member
    const targetMember = team.members.find(
      (m) => m.name.trim().toLowerCase() === memberName.trim().toLowerCase()
    );

    if (!targetMember) {
      res.status(400).json({ success: false, message: `Member "${memberName}" not found in this team` });
      return;
    }

    // Update members isLeader status
    team.members.forEach((m) => {
      m.isLeader = m.name.trim().toLowerCase() === memberName.trim().toLowerCase();
    });

    team.teamLeader = {
      name: targetMember.name,
      email: targetMember.email,
      phone: targetMember.phone,
      isLeader: true,
    };

    await team.save();

    // Broadcast leader update via socket
    try {
      const io = getIO();
      io.emit('team-updated', {
        teamId: team._id,
        teamName: team.teamName,
        collegeName: team.collegeName,
        teamLeader: team.teamLeader,
      });
    } catch (e) {
      // socket might not be listening yet
    }

    res.json({
      success: true,
      message: `Successfully designated "${targetMember.name}" as Team Leader`,
      teamLeader: team.teamLeader,
      team,
    });
  } catch (error: any) {
    console.error('[Teams] Set leader error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign team leader', error: error.message });
  }
};

export const getDistinctColleges = async (_req: Request, res: Response): Promise<void> => {
  try {
    const colleges = await Team.aggregate([
      {
        $group: {
          _id: '$collegeName',
          teamCount: { $sum: 1 },
          confirmedCount: {
            $sum: { $cond: [{ $eq: ['$registrationStatus', 'CONFIRMED'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          collegeName: '$_id',
          teamCount: 1,
          confirmedCount: 1,
        },
      },
    ]);

    res.json({ success: true, colleges });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to get colleges list', error: error.message });
  }
};

/**
 * GET /api/teams/dataset-participants
 * Fetch participants from dataset with college filtering, domains, and existing teams
 */
export const getDatasetParticipants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { college, query } = req.query;
    const allParticipants = loadDatasetParticipants();

    // Compute distinct colleges with participant counts from dataset
    const collegeMap = new Map<string, { collegeName: string; participantCount: number; teamNames: Set<string> }>();
    for (const p of allParticipants) {
      if (!collegeMap.has(p.collegeName)) {
        collegeMap.set(p.collegeName, {
          collegeName: p.collegeName,
          participantCount: 0,
          teamNames: new Set(),
        });
      }
      const c = collegeMap.get(p.collegeName)!;
      c.participantCount += 1;
      if (p.originalTeamName) c.teamNames.add(p.originalTeamName);
    }

    const colleges = Array.from(collegeMap.values()).map((c) => ({
      collegeName: c.collegeName,
      participantCount: c.participantCount,
      teamCount: c.teamNames.size,
      teamNames: Array.from(c.teamNames),
    })).sort((a, b) => a.collegeName.localeCompare(b.collegeName));

    // Filter participants if college or query provided
    let filteredParticipants = allParticipants;
    if (college && college !== 'ALL') {
      const colStr = String(college).toLowerCase();
      filteredParticipants = filteredParticipants.filter(
        (p) => p.collegeName.toLowerCase() === colStr || normalizeCollege(p.collegeName).toLowerCase() === colStr
      );
    }

    if (query && typeof query === 'string' && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      filteredParticipants = filteredParticipants.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          p.originalTeamName.toLowerCase().includes(q) ||
          p.domain.toLowerCase().includes(q)
      );
    }

    // Retrieve existing teams in DB for this college
    let existingTeams: any[] = [];
    if (college && college !== 'ALL') {
      existingTeams = await Team.find({
        collegeName: normalizeCollege(String(college)),
      }).sort({ teamName: 1 });
    }

    // Collect distinct domains present in dataset
    const distinctDomains = Array.from(new Set(allParticipants.map((p) => p.domain).filter(Boolean)));

    res.json({
      success: true,
      colleges,
      participants: filteredParticipants,
      existingTeams,
      distinctDomains,
      totalParticipants: allParticipants.length,
    });
  } catch (error: any) {
    console.error('[Dataset] Participants fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dataset participants', error: error.message });
  }
};

/**
 * POST /api/teams/manual-register
 * Manual registration: selects college, team name, team members from dataset,
 * automatically locks domain to the leader's registered domain in the dataset,
 * and allows instant barcode wristband allocation.
 */
export const manualRegisterTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      collegeName,
      teamName,
      members,
      leaderName,
      barcode,
      deskNumber = 1,
      selectedDomain,
    } = req.body;

    if (!collegeName || !collegeName.trim()) {
      res.status(400).json({ success: false, message: 'College name is required.' });
      return;
    }

    if (!teamName || !teamName.trim()) {
      res.status(400).json({ success: false, message: 'Team name is required.' });
      return;
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      res.status(400).json({ success: false, message: 'At least one team member must be selected.' });
      return;
    }

    const cleanCollege = normalizeCollege(collegeName);
    const cleanTeamName = teamName.trim();
    const chosenLeaderName = (leaderName || members.find((m: any) => m.isLeader)?.name || members[0].name || '').trim();

    // CRITICAL: Look up leader's domain in dataset
    const allDataset = loadDatasetParticipants();
    const leaderDatasetEntry = allDataset.find(
      (p) =>
        p.name.trim().toLowerCase() === chosenLeaderName.toLowerCase() &&
        (normalizeCollege(p.collegeName).toLowerCase() === cleanCollege.toLowerCase() ||
         p.collegeName.toLowerCase().includes(cleanCollege.toLowerCase()))
    ) || allDataset.find((p) => p.name.trim().toLowerCase() === chosenLeaderName.toLowerCase());

    // Domain strictly determined by leader's domain in the dataset
    const effectiveDomain = leaderDatasetEntry?.domain || selectedDomain || 'Gen AI & AI';
    const problemStatements = getProblemsForDomain(effectiveDomain);

    // Format members
    const formattedMembers = members.map((m: any) => ({
      name: (m.name || '').trim(),
      email: (m.email || '').trim().toLowerCase(),
      phone: (m.phone || '').trim(),
      isLeader: (m.name || '').trim().toLowerCase() === chosenLeaderName.toLowerCase(),
    }));

    const leaderMember = formattedMembers.find((m: any) => m.isLeader) || formattedMembers[0];
    leaderMember.isLeader = true;

    const deskNum = Number(deskNumber) || 1;
    const cleanBarcode = barcode ? extractSingleBarcode(barcode) : null;

    // Check if team already exists by team name and college (case-insensitive)
    let team = await Team.findOne({
      collegeName: cleanCollege,
      teamName: { $regex: new RegExp(`^${cleanTeamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (!team) {
      team = new Team({
        collegeName: cleanCollege,
        teamName: cleanTeamName,
        members: formattedMembers,
        teamLeader: leaderMember,
        domain: effectiveDomain,
        availableProblemStatements: problemStatements,
        registrationStatus: cleanBarcode ? 'CONFIRMED' : 'PENDING',
        allocatedDesk: cleanBarcode ? deskNum : null,
        allocatedAt: cleanBarcode ? new Date() : null,
        qrId: cleanBarcode || null,
      });
    } else {
      team.members = formattedMembers;
      team.teamLeader = leaderMember;
      team.domain = effectiveDomain;
      team.availableProblemStatements = problemStatements;
      if (cleanBarcode) {
        team.registrationStatus = 'CONFIRMED';
        team.allocatedDesk = deskNum;
        team.allocatedAt = new Date();
        team.qrId = cleanBarcode;
      }
    }

    await team.save();

    // Barcode allocation handling
    if (cleanBarcode) {
      const variations = getBarcodeVariations(cleanBarcode);
      let qrRecord = await QRCode.findOne({ qrId: { $in: variations } });

      if (!qrRecord) {
        qrRecord = new QRCode({
          qrId: cleanBarcode,
          status: 'ALLOCATED',
          teamId: team._id,
          teamName: team.teamName,
          collegeName: team.collegeName,
          teamLeader: team.teamLeader?.name || chosenLeaderName,
          allocatedBy: (req as any).user?.name || `Registration Desk ${deskNum}`,
          deskNumber: deskNum,
          allocatedAt: new Date(),
        });
      } else {
        // If this barcode was assigned to another team, release that team
        if (qrRecord.teamId && qrRecord.teamId.toString() !== team._id.toString()) {
          await Team.findByIdAndUpdate(qrRecord.teamId, {
            qrId: null,
            registrationStatus: 'PENDING',
            allocatedDesk: null,
            allocatedAt: null,
          });
        }

        qrRecord.status = 'ALLOCATED';
        qrRecord.teamId = team._id;
        qrRecord.teamName = team.teamName;
        qrRecord.collegeName = team.collegeName;
        qrRecord.teamLeader = team.teamLeader?.name || chosenLeaderName;
        qrRecord.allocatedBy = (req as any).user?.name || `Registration Desk ${deskNum}`;
        qrRecord.deskNumber = deskNum;
        qrRecord.allocatedAt = new Date();
      }

      await qrRecord.save();

      // Upsert single ScanLog
      await ScanLog.deleteMany({
        $or: [
          { teamId: team._id },
          { qrId: cleanBarcode },
          { teamName: team.teamName, collegeName: team.collegeName },
        ],
      });

      await ScanLog.create({
        qrId: cleanBarcode,
        teamId: team._id,
        teamName: team.teamName,
        collegeName: team.collegeName,
        deskNumber: deskNum,
        scanType: 'ALLOCATION',
        action: 'MANUAL_REGISTRATION_CHECKIN',
        operator: (req as any).user?.name || `Registration Desk ${deskNum}`,
        status: 'SUCCESS',
        message: `Manual check-in confirmed with barcode ${cleanBarcode}. Domain set by leader: ${effectiveDomain}`,
        timestamp: new Date(),
      });
    }

    // Socket.io real-time broadcast
    try {
      const io = getIO();
      io.emit('team-updated', {
        teamId: team._id,
        teamName: team.teamName,
        collegeName: team.collegeName,
        domain: team.domain,
        members: team.members,
        teamLeader: team.teamLeader,
        qrId: team.qrId,
        registrationStatus: team.registrationStatus,
        allocatedDesk: team.allocatedDesk,
        allocatedAt: team.allocatedAt,
      });

      if (cleanBarcode) {
        io.emit('qr-allocated', {
          qrId: cleanBarcode,
          teamId: team._id,
          teamName: team.teamName,
          collegeName: team.collegeName,
          teamLeader: team.teamLeader?.name,
          deskNumber: deskNum,
          allocatedAt: new Date(),
        });
      }
    } catch (e) {
      // socket catch
    }

    res.json({
      success: true,
      message: `Manual registration confirmed for "${team.teamName}". Domain locked to Leader (${chosenLeaderName}): "${effectiveDomain}".`,
      team,
      leaderDomain: effectiveDomain,
      isLeaderInDataset: Boolean(leaderDatasetEntry),
    });
  } catch (error: any) {
    console.error('[Manual Register] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete manual registration', error: error.message });
  }
};
