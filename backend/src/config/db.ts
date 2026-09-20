import mongoose from 'mongoose';
import { config } from './config.js';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database] Error connecting to MongoDB:`, error);
    process.exit(1);
  }
};
