import mongoose from 'mongoose';

// Cache the mongoose connection
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  bufferCommands: false,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  ssl: true,
  tls: true,
  retryWrites: true,
  authSource: 'admin',
  authMechanism: 'SCRAM-SHA-1'
};

// Remove development-only options
if (process.env.NODE_ENV === 'development') {
  options.tlsAllowInvalidCertificates = true;
  options.tlsAllowInvalidHostnames = true;
  options.tlsInsecure = true;
  options.sslValidate = false;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  // Clear existing connection when reconnecting
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    console.log('Connecting to MongoDB...');
    cached.promise = mongoose.connect(process.env.MONGODB_URI, options)
      .then((mongoose) => {
        console.log('MongoDB connected successfully');
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
          cached.conn = null;
          cached.promise = null;
        });

        mongoose.connection.on('disconnected', () => {
          console.log('MongoDB disconnected');
          cached.conn = null;
          cached.promise = null;
        });

        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

export default connectDB; 