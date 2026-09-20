import mongoose from 'mongoose';
import { config } from './config.js';

export const connectDB = async (): Promise<void> => {
  try {
    const isAtlas = config.mongoUri.includes('mongodb+srv://') || config.mongoUri.includes('@');
    console.log(
      `[Database] Attempting connection to ${isAtlas ? 'MongoDB Atlas Cloud' : 'Local MongoDB (127.0.0.1:27017)'}...`
    );

    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error: any) {
    console.error(`[Database] Error connecting to MongoDB:`, error.message || error);
    console.warn(`[Database] Tip: If deploying to cloud (Render/Railway), add a free MongoDB Atlas connection string to MONGODB_URI.`);
    console.warn(`[Database] Tip: If running locally on Windows, make sure MongoDB Service is started (net start MongoDB).`);
    // Do not terminate process immediately in dev so health check remains responsive
    if (process.env.NODE_ENV === 'production' && !config.mongoUri.includes('127.0.0.1')) {
      process.exit(1);
    }
  }
};
