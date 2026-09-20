import { Request, Response } from 'express';
import * as xlsx from 'xlsx';
import { Team } from '../models/Team.js';
import { getProblemsForDomain } from '../seeds/problemStatements.js';
import { getIO } from '../socket/socketManager.js';

export const importExcelDataset = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded. Please upload an .xlsx or .csv file.' });
      return;
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      res.status(400).json({ success: false, message: 'The uploaded file contains no data rows.' });
      return;
    }

    // Map to group participants into Teams by (College Name + Team Name)
    const teamsMap = new Map<string, {
      collegeName: string;
      teamName: string;
      domain: string;
      members: Array<{ name: string; email: string; phone: string; isLeader: boolean }>;
      transactionId?: string;
    }>();

    for (const row of rawRows) {
      // Find college name across various possible column headers
      const collegeName = (
        row['College'] ||
        row['College Name'] ||
        row['college'] ||
        row['CollegeName'] ||
        'Autonomous Engineering College'
      ).toString().trim();

      // Find team name
      const teamName = (
        row['Team Name'] ||
        row['Team'] ||
        row['teamName'] ||
        row['team_name'] ||
        'Unnamed Team'
      ).toString().trim();

      if (!collegeName || !teamName) continue;

      // Find participant name
      const memberName = (
        row['Name'] ||
        row['Participant Name'] ||
        row['Member Name'] ||
        row['Student Name'] ||
        row['name']
      ).toString().trim();

      if (!memberName) continue;

      // Find email
      const email = (
        row['Email Address'] ||
        row['Mail Id'] ||
        row['Email'] ||
        row['mail_id'] ||
        ''
      ).toString().trim().toLowerCase();

      // Find phone
      const phone = (
        row['Phone number'] ||
        row['Phone'] ||
        row['Mobile'] ||
        row['phone_number'] ||
        ''
      ).toString().trim();

      // Find domain
      const domain = (
        row['Domain'] ||
        row['Track'] ||
        row['domain'] ||
        'Web development & App development'
      ).toString().trim();

      // Find transaction id
      const transactionId = (
        row['UPI transaction Id ex. 66117840xxxx Not- abcdxx@oksbi'] ||
        row['UPI transaction Id'] ||
        row['Transaction ID'] ||
        ''
      ).toString().trim();

      // Composite key to allow duplicate team names across different colleges
      const compositeKey = `${collegeName.toLowerCase()}_____${teamName.toLowerCase()}`;

      if (!teamsMap.has(compositeKey)) {
        teamsMap.set(compositeKey, {
          collegeName,
          teamName,
          domain,
          members: [],
          transactionId,
        });
      }

      const teamEntry = teamsMap.get(compositeKey)!;
      // Avoid duplicate members within the same team
      const existingMember = teamEntry.members.find(
        (m) => m.name.toLowerCase() === memberName.toLowerCase() || (email && m.email === email)
      );

      if (!existingMember) {
        teamEntry.members.push({
          name: memberName,
          email,
          phone,
          isLeader: false,
        });
      }
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const [, entry] of teamsMap.entries()) {
      const existingTeam = await Team.findOne({
        collegeName: entry.collegeName,
        teamName: entry.teamName,
      });

      if (!existingTeam) {
        const problems = getProblemsForDomain(entry.domain);
        await Team.create({
          collegeName: entry.collegeName,
          teamName: entry.teamName,
          domain: entry.domain,
          members: entry.members,
          teamLeader: null,
          availableProblemStatements: problems,
          registrationStatus: 'PENDING',
          paymentDetails: {
            transactionId: entry.transactionId || `TXN-IMP-${Date.now().toString().slice(-6)}`,
            status: 'Paid',
            amount: entry.members.length * 250,
          },
        });
        createdCount++;
      } else {
        // Merge any new members
        let modified = false;
        for (const newM of entry.members) {
          const exists = existingTeam.members.some(
            (m) => m.name.toLowerCase() === newM.name.toLowerCase()
          );
          if (!exists) {
            existingTeam.members.push(newM);
            modified = true;
          }
        }
        if (modified) {
          await existingTeam.save();
          updatedCount++;
        }
      }
    }

    try {
      const io = getIO();
      io.emit('dataset-imported', { createdCount, updatedCount, totalProcessed: teamsMap.size });
    } catch (e) {
      // socket optional
    }

    res.json({
      success: true,
      message: `Successfully processed ${rawRows.length} rows into ${teamsMap.size} distinct teams.`,
      stats: {
        totalRows: rawRows.length,
        distinctTeams: teamsMap.size,
        createdTeams: createdCount,
        updatedTeams: updatedCount,
      },
    });
  } catch (error: any) {
    console.error('[Import] Excel import error:', error);
    res.status(500).json({ success: false, message: 'Failed to import Excel dataset', error: error.message });
  }
};
