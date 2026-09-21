import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamMember {
  name: string;
  email: string;
  phone: string;
  collegeName?: string;
  isLeader?: boolean;
}

export interface IProblemStatement {
  id: string;
  title: string;
  description: string;
  domain: string;
  category?: string;
  tags?: string[];
  selectedAt?: Date;
}

export interface ITeam extends Document {
  collegeName: string;
  teamName: string;
  members: ITeamMember[];
  teamLeader: ITeamMember | null;
  domain: string;
  category: string;
  availableProblemStatements: IProblemStatement[];
  selectedProblemStatement: IProblemStatement | null;
  qrId: string | null;
  registrationStatus: 'PENDING' | 'CONFIRMED';
  allocatedDesk: number | null;
  allocatedAt: Date | null;
  paymentDetails: {
    transactionId?: string;
    status: string;
    amount: number;
    screenshotUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', lowercase: true, trim: true },
    phone: { type: String, default: '', trim: true },
    collegeName: { type: String, default: '', trim: true },
    isLeader: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProblemStatementSchema = new Schema<IProblemStatement>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    domain: { type: String, required: true },
    category: { type: String, default: '' },
    tags: [{ type: String }],
    selectedAt: { type: Date },
  },
  { _id: false }
);

const TeamSchema = new Schema<ITeam>(
  {
    collegeName: { type: String, required: true, trim: true, index: true },
    teamName: { type: String, required: true, trim: true, index: true },
    members: [TeamMemberSchema],
    teamLeader: {
      type: TeamMemberSchema,
      default: null,
    },
    domain: { type: String, required: true, default: 'General' },
    category: { type: String, default: 'Software' },
    availableProblemStatements: [ProblemStatementSchema],
    selectedProblemStatement: {
      type: ProblemStatementSchema,
      default: null,
    },
    qrId: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },
    registrationStatus: {
      type: String,
      enum: ['PENDING', 'CONFIRMED'],
      default: 'PENDING',
      index: true,
    },
    allocatedDesk: { type: Number, default: null },
    allocatedAt: { type: Date, default: null },
    paymentDetails: {
      transactionId: { type: String, default: '' },
      status: { type: String, default: 'Paid' },
      amount: { type: Number, default: 250 },
      screenshotUrl: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Composite compound index to facilitate ultra-fast searches by college + team
TeamSchema.index({ collegeName: 1, teamName: 1 });
TeamSchema.index(
  { qrId: 1 },
  { unique: true, partialFilterExpression: { qrId: { $type: 'string' } } }
);

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
