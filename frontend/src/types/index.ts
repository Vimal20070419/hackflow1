export interface ITeamMember {
  name: string;
  email?: string;
  phone?: string;
  collegeName?: string;
  collegeId?: string;
  isLeader?: boolean;
}

export interface IProblemStatement {
  id: string;
  title: string;
  description: string;
  domain: string;
  category?: string;
  tags?: string[];
  selectedAt?: string;
}

export interface ITeam {
  _id: string;
  collegeName: string;
  teamName: string;
  name?: string; // alias
  registrationId?: string;
  members: ITeamMember[];
  teamLeader: ITeamMember | null;
  domain: string;
  category?: string;
  availableProblemStatements?: IProblemStatement[];
  selectedProblemStatement?: IProblemStatement | null;
  qrId: string | null; // barcode/wristband ID e.g. BC-00042
  barcodeId?: string | null;
  registrationStatus: 'PENDING' | 'CONFIRMED';
  allocatedDesk?: number | null;
  allocatedAt?: string | null;
  paymentDetails?: {
    transactionId?: string;
    status: string;
    amount: number;
    screenshotUrl?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface IBarcode {
  _id: string;
  qrId: string; // barcode ID e.g. BC-00001
  barcodeId?: string;
  status: 'UNUSED' | 'ALLOCATED' | 'ACTIVE';
  teamId: string | null;
  teamName: string | null;
  collegeName: string | null;
  teamLeader: string | null;
  allocatedBy: string | null;
  deskNumber: number | null;
  allocatedAt: string | null;
  createdAt: string;
}

export type IQRCode = IBarcode;

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: 'REGISTRATION_DESK_1' | 'REGISTRATION_DESK_2' | 'SCANNER' | 'ADMIN';
  deskNumber: number | null;
}

export interface IScanLog {
  _id: string;
  qrId: string; // barcode ID
  barcodeId?: string;
  teamId?: string | null;
  teamName?: string;
  collegeName?: string;
  deskNumber?: number | null;
  scannerDeviceId?: string;
  scanType?: 'ALLOCATION' | 'PARTICIPANT_ACCESS' | 'VERIFICATION' | 'INSPECTION';
  action?: string;
  operator?: string;
  status?: 'SUCCESS' | 'ALREADY_ALLOCATED' | 'INVALID_QR' | 'UNASSIGNED';
  message?: string;
  timestamp: string;
}

export interface IDashboardStats {
  totalTeams: number;
  confirmedTeams: number;
  pendingTeams: number;
  qrsAllocated: number;
  qrsRemaining: number;
  barcodesAllocated?: number;
  barcodesRemaining?: number;
  desk1Confirmed: number;
  desk2Confirmed: number;
}

export interface IDatasetParticipant {
  name: string;
  phone: string;
  email: string;
  collegeName: string;
  rawCollege?: string;
  originalTeamName: string;
  domain: string;
  transactionId?: string;
}

