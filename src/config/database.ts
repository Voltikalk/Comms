import mongoose from 'mongoose';

/**
 * MongoDB connection options & configuration
 */
export interface DatabaseConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

const DEFAULT_MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/comms_db';

const defaultOptions: mongoose.ConnectOptions = {
  maxPoolSize: 20, // Maintain up to 20 socket connections
  minPoolSize: 5,  // Maintain at least 5 socket connections
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  autoIndex: true, // Build indexes automatically in development
};

let isConnected = false;

/**
 * Connect to MongoDB database instance with robust event handlers
 */
export async function connectDB(uri: string = DEFAULT_MONGODB_URI, options: mongoose.ConnectOptions = defaultOptions): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('[Database] Using existing MongoDB connection');
    return mongoose;
  }

  try {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      console.log('✅ [Database] MongoDB connected successfully to', uri.replace(/\/\/.*@/, '//<credentials>@'));
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      console.error('❌ [Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('⚠️ [Database] MongoDB disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      console.log('🔄 [Database] MongoDB reconnected successfully');
    });

    const conn = await mongoose.connect(uri, options);
    isConnected = true;
    return conn;
  } catch (error) {
    isConnected = false;
    console.error('❌ [Database] Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Gracefully disconnect from MongoDB database
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected && mongoose.connection.readyState === 0) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB connection closed gracefully');
  } catch (error) {
    console.error('[Database] Error while disconnecting MongoDB:', error);
    throw error;
  }
}

/**
 * Helper to check database health and ready state
 */
export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export default {
  connectDB,
  disconnectDB,
  isDBConnected
};
