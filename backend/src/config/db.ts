import mongoose from 'mongoose';
import { config } from './config.js';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    const isAtlas = config.mongoUri.includes('mongodb+srv://') || config.mongoUri.includes('@');
    console.log(
      `[Database] Connecting to ${isAtlas ? 'MongoDB Atlas Cloud' : 'Local MongoDB (127.0.0.1:27017)'}...`
    );

    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error: any) {
    console.error(`[Database] Error connecting to MongoDB:`, error.message || error);
    console.warn(`[Database] Notice: When running in Vercel/Cloud, set MONGODB_URI in Vercel Project Settings with your free MongoDB Atlas URI.`);
  }
};
