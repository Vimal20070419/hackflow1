import mongoose, { Schema, Document } from 'mongoose';

export interface IScanLog extends Document {
  qrId: string;
  teamId?: mongoose.Types.ObjectId | null;
  teamName?: string;
  collegeName?: string;
  deskNumber?: number | null;
  scannerDeviceId?: string;
  scanType: 'ALLOCATION' | 'PARTICIPANT_ACCESS' | 'VERIFICATION' | 'INSPECTION';
  status: 'SUCCESS' | 'ALREADY_ALLOCATED' | 'INVALID_QR' | 'UNASSIGNED';
  message?: string;
  timestamp: Date;
}

const ScanLogSchema = new Schema<IScanLog>(
  {
    qrId: { type: String, required: true, uppercase: true, trim: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    teamName: { type: String },
    collegeName: { type: String },
    deskNumber: { type: Number, default: null },
    scannerDeviceId: { type: String, default: '' },
    scanType: {
      type: String,
      enum: ['ALLOCATION', 'PARTICIPANT_ACCESS', 'VERIFICATION', 'INSPECTION'],
      default: 'ALLOCATION',
      index: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'ALREADY_ALLOCATED', 'INVALID_QR', 'UNASSIGNED'],
      required: true,
      index: true,
    },
    message: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const ScanLog = mongoose.model<IScanLog>('ScanLog', ScanLogSchema);
