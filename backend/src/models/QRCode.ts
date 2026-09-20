import mongoose, { Schema, Document } from 'mongoose';

export type QRStatus = 'UNUSED' | 'ALLOCATED' | 'ACTIVE';

export interface IQRCode extends Document {
  qrId: string;
  status: QRStatus;
  teamId: mongoose.Types.ObjectId | null;
  teamName: string | null;
  collegeName: string | null;
  teamLeader: string | null;
  allocatedBy: string | null;
  deskNumber: number | null;
  allocatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const QRCodeSchema = new Schema<IQRCode>(
  {
    qrId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['UNUSED', 'ALLOCATED', 'ACTIVE'],
      default: 'UNUSED',
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    teamName: { type: String, default: null },
    collegeName: { type: String, default: null },
    teamLeader: { type: String, default: null },
    allocatedBy: { type: String, default: null },
    deskNumber: { type: Number, default: null },
    allocatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const QRCode = mongoose.model<IQRCode>('QRCode', QRCodeSchema);
