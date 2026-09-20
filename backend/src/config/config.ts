import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hackathon_registration',
  jwtSecret: process.env.JWT_SECRET || 'hackathon_super_jwt_secret_desk_2026',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  localIp: process.env.LOCAL_IP || '127.0.0.1',
};
