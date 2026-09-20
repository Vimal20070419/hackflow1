import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { config } from '../config/config.js';
import { User } from '../models/User.js';
import { QRCode } from '../models/QRCode.js';
import { Team } from '../models/Team.js';
import { ScannerSession } from '../models/ScannerSession.js';
import { ScanLog } from '../models/ScanLog.js';
import { getProblemsForDomain } from './problemStatements.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function normalizeCollege(c: string): string {
  const s = (c || '').replace(/\./g, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = s.toLowerCase();
  if (lower.includes('jj college') || lower.includes('j j college')) return 'JJ College of Engineering and Technology';
  if (lower.includes('rangasamy')) return 'K S Rangasamy College of Technology';
  if (lower.includes('erode sengunthar') || lower.includes('esec') || lower.includes('eses') || lower.includes('eroud sengunthar') || lower.includes('erode sengundhar') || lower.includes('erode sunguthar') || lower.includes('erode senguthar')) return 'Erode Sengunthar Engineering College';
  if (lower.includes('adoor')) return 'College of Engineering Adoor';
  if (lower.includes('kamaraj')) return 'Kamaraj College of Engineering and Technology';
  if (lower.includes('nandha engineering') || lower.includes('nandha college of engineering') || lower.includes('nec')) return 'Nandha Engineering College, Erode';
  if (lower.includes('nandha college of technology')) return 'Nandha College of Technology';
  if (lower.includes('manakula')) return 'Sri Manakula Vinayagar Engineering College';
  if (lower.includes('mit') || lower.includes('madras institute')) return 'Madras Institute of Technology, Anna University';
  if (lower.includes('knowledge institute') || lower.includes('kiot')) return 'Knowledge Institute of Technology, Salem';
  if (lower.includes('srm valliammai')) return 'SRM Valliammai Engineering College';
  if (lower.includes('excel')) return 'Excel Engineering College (Autonomous)';
  if (lower.includes('kongu')) return 'Kongu Engineering College';
  if (lower.includes('sns college of engineering') || lower.includes('snsce')) return 'SNS College of Engineering';
  if (lower.includes('sns college of technology')) return 'SNS College of Technology';
  if (lower.includes('chettinad')) return 'Chettinad College of Engineering and Technology';
  if (lower.includes('jp college') || lower.includes('j p college')) return 'J.P. College of Engineering';
  if (lower.includes('kumarasamy') || lower.includes('kumarsamy') || lower.includes('kumararasamy')) return 'M. Kumarasamy College of Engineering';
  if (lower.includes('npr')) return 'NPR College of Engineering and Technology';
  if (lower.includes('sastra')) return 'SASTRA Deemed University';
  if (lower.includes('gnanamani')) return 'Gnanamani College of Technology';
  if (lower.includes('nehru institute')) return 'Nehru Institute of Technology';
  if (lower.includes('ramakrishnan') || lower.includes('krce')) return 'K. Ramakrishnan College of Engineering';
  if (lower.includes('kangeyam') || lower.includes('kanageyam') || lower.includes('kangayem')) return 'Kangeyam Institute of Technology';
  if (lower.includes('kpr') || lower.includes('kpriet')) return 'KPR Institute of Engineering and Technology';
  if (lower.includes('vivekanandha')) return 'Vivekanandha College of Engineering for Women';
  if (lower.includes('velalar')) return 'Velalar College of Engineering and Technology';
  if (lower.includes('arjun')) return 'Arjun College of Technology, Coimbatore';
  if (lower.includes('sri shakthi') || lower.includes('sri shakti')) return 'Sri Shakthi Institute of Engineering and Technology';
  if (lower.includes('hindusthan') || lower.includes('hindustan')) return 'Hindusthan College of Arts & Science';
  if (lower.includes('coimbatore institute of technology') || lower.includes('cit')) return 'Coimbatore Institute of Technology';
  if (lower.includes('coimbatore institute of engineering') || lower.includes('ciet')) return 'Coimbatore Institute of Engineering and Technology';
  if (lower.includes('vsb') || lower.includes('v s b')) return 'VSB Engineering College';
  if (lower.includes('dr n g p') || lower.includes('drngp') || lower.includes('dr n g p')) return 'Dr. N.G.P. Institute of Technology';
  if (lower.includes('karpagam')) return 'Karpagam Institute of Technology';
  if (lower.includes('surya')) return 'Surya Engineering College';
  if (lower.includes('mahendra')) return 'Mahendra Engineering College';
  if (lower.includes('ifet')) return 'IFET College of Engineering';
  if (lower.includes('eshwar') || lower.includes('sece')) return 'Sri Eshwar College of Engineering';
  if (lower.includes('sasurie')) return 'Sasurie College of Engineering';
  if (lower.includes('shre venkateshwara')) return 'Shree Venkateshwara Hi-Tech Engineering College';
  if (lower.includes('ksr institute')) return 'KSR Institute for Engineering and Technology';
  return s || 'Engineering College';
}

export function parseCSVRegistrations(): Array<{
  collegeName: string;
  teamName: string;
  domain: string;
  members: Array<{ name: string; email: string; phone: string }>;
  transactionId?: string;
}> {
  const csvPath = path.join(__dirname, 'registrations.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`registrations.csv not found at: ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const workbook = XLSX.read(csvContent, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  const teamMap = new Map<string, {
    collegeName: string;
    teamName: string;
    domain: string;
    members: Array<{ name: string; email: string; phone: string }>;
    transactionId?: string;
  }>();

  for (const r of rows) {
    const rawTeam = (r['Team Name '] || r['Team Name'] || '').trim();
    const rawCollege = (r['College '] || r['College'] || '').trim();
    const rawDomain = (r['Domain'] || 'Gen AI & AI').trim();
    const rawName = (r['Name'] || '').trim();
    const rawPhone = String(r['Phone number'] || '').trim().replace(/\s+/g, ' ');
    const rawEmail = (r['Email Address'] || r['Mail Id'] || '').trim();
    const rawTxn = String(r['UPI transaction Id  ex. 66117840xxxx  Not- abcdxx@oksbi'] || '').trim().replace(/^'+/, '');

    if (!rawTeam || !rawName) continue;

    const cleanTeam = rawTeam.replace(/\s+/g, ' ').trim();
    const cleanCollege = normalizeCollege(rawCollege);
    const key = (cleanTeam.toLowerCase().replace(/[^a-z0-9]/g, '') + '___' + cleanCollege.toLowerCase().replace(/[^a-z0-9]/g, ''));

    if (!teamMap.has(key)) {
      teamMap.set(key, {
        teamName: cleanTeam,
        collegeName: cleanCollege,
        domain: rawDomain,
        members: [],
        transactionId: rawTxn,
      });
    }

    const t = teamMap.get(key)!;
    if (!t.members.some((m) => m.name.toLowerCase() === rawName.toLowerCase())) {
      t.members.push({
        name: rawName,
        phone: rawPhone,
        email: rawEmail,
      });
    }
    if (rawTxn && (!t.transactionId || t.transactionId.length < rawTxn.length)) {
      t.transactionId = rawTxn;
    }
  }

  return Array.from(teamMap.values());
}

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('[Seed] Connected to MongoDB.');

    // 1. Seed Staff Accounts
    console.log('[Seed] Seeding Staff Accounts...');
    await User.deleteMany({});
    const desk1Password = await bcrypt.hash('desk1pass123', 10);
    const desk2Password = await bcrypt.hash('desk2pass123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    await User.insertMany([
      {
        name: 'Registration Desk 1 Staff',
        email: 'desk1@hackathon.org',
        passwordHash: desk1Password,
        role: 'REGISTRATION_DESK_1',
        deskNumber: 1,
      },
      {
        name: 'Registration Desk 2 Staff',
        email: 'desk2@hackathon.org',
        passwordHash: desk2Password,
        role: 'REGISTRATION_DESK_2',
        deskNumber: 2,
      },
      {
        name: 'Admin Lead',
        email: 'admin@hackathon.org',
        passwordHash: adminPassword,
        role: 'ADMIN',
        deskNumber: null,
      },
    ]);
    console.log('[Seed] Created Desk 1, Desk 2, and Admin accounts.');

    // 2. Seed 200 Pre-Printed Barcode Wristbands
    console.log('[Seed] Seeding 200 Pre-Printed Barcodes (BC-00001 to BC-00200)...');
    await QRCode.deleteMany({});
    const qrCodesToInsert = [];
    for (let i = 1; i <= 200; i++) {
      const qrId = `BC-${String(i).padStart(5, '0')}`;
      qrCodesToInsert.push({
        qrId,
        status: 'UNUSED',
        teamId: null,
        teamName: null,
        collegeName: null,
        teamLeader: null,
        allocatedBy: null,
        deskNumber: null,
        allocatedAt: null,
      });
    }
    await QRCode.insertMany(qrCodesToInsert);
    console.log('[Seed] Successfully generated 200 Pre-Printed Barcodes in UNUSED status.');

    // 3. Parse & Seed Teams from CSV
    console.log('[Seed] Parsing registrations.csv and seeding Teams...');
    await Team.deleteMany({});
    await ScanLog.deleteMany({});
    await ScannerSession.deleteMany({});

    const parsedTeams = parseCSVRegistrations();
    console.log(`[Seed] Found ${parsedTeams.length} unique teams in registration dataset.`);

    const teamsToInsert = parsedTeams.map((t, index) => {
      const problems = getProblemsForDomain(t.domain);
      const regId = `REG-${String(index + 1).padStart(4, '0')}`;

      return {
        collegeName: t.collegeName,
        teamName: t.teamName,
        registrationId: regId,
        members: t.members.map((m) => ({
          name: m.name,
          email: m.email,
          phone: m.phone,
          isLeader: false,
        })),
        teamLeader: null,
        domain: t.domain,
        category: 'Hackathon Track',
        availableProblemStatements: problems,
        selectedProblemStatement: null,
        qrId: null,
        registrationStatus: 'PENDING',
        allocatedDesk: null,
        allocatedAt: null,
        paymentDetails: {
          transactionId: t.transactionId || `TXN${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          status: 'Paid',
          amount: t.members.length * 250,
        },
      };
    });

    await Team.insertMany(teamsToInsert);
    console.log(`[Seed] Successfully inserted ${teamsToInsert.length} teams with full member rosters!`);

    console.log('\n================ SEED COMPLETE ================');
    console.log('Desk 1 Login: desk1@hackathon.org / desk1pass123');
    console.log('Desk 2 Login: desk2@hackathon.org / desk2pass123');
    console.log('Admin Login:  admin@hackathon.org / admin123');
    console.log('Total Pre-Printed Barcodes: 200 (BC-00001 -> BC-00200)');
    console.log(`Total Teams Seeded:         ${teamsToInsert.length}`);
    console.log('================================================\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    process.exit(1);
  }
};

if (process.argv[1] && (process.argv[1].endsWith('seedData.ts') || process.argv[1].endsWith('seedData.js'))) {
  seedDatabase();
}
