import mongoose, { Schema, Document } from 'mongoose';

export interface IScannerSession extends Document {
  sessionId: string;
  deskNumber: number;
  pairingCode: string;
  deviceId?: string;
  status: 'WAITING' | 'CONNECTED' | 'DISCONNECTED';
  socketId?: string;
  connectedAt?: Date;
  lastScanAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScannerSessionSchema = new Schema<IScannerSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    deskNumber: { type: Number, required: true, enum: [1, 2], index: true },
    pairingCode: { type: String, required: true, index: true },
    deviceId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['WAITING', 'CONNECTED', 'DISCONNECTED'],
      default: 'WAITING',
      index: true,
    },
    socketId: { type: String, default: '' },
    connectedAt: { type: Date },
    lastScanAt: { type: Date },
  },
  { timestamps: true }
);

export const ScannerSession = mongoose.model<IScannerSession>('ScannerSession', ScannerSessionSchema);
