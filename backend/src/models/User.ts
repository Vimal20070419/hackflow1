import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'REGISTRATION_DESK_1' | 'REGISTRATION_DESK_2' | 'SCANNER' | 'ADMIN';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  deskNumber: number | null;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['REGISTRATION_DESK_1', 'REGISTRATION_DESK_2', 'SCANNER', 'ADMIN'],
      required: true,
    },
    deskNumber: { type: Number, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
