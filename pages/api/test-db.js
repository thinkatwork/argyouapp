import connectDB from '../../lib/mongodb';

export default async function handler(req, res) {
  try {
    // Test the connection
    const conn = await connectDB();
    
    // If we get here, connection was successful
    res.status(200).json({ 
      message: "Successfully connected to MongoDB!", 
      database: conn.connection.db.databaseName 
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to connect to MongoDB", 
      details: error.message 
    });
  }
} 