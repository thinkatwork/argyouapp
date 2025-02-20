import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectDB from '../../../lib/mongodb';
import Conversation from '../../../models/Conversation';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    console.log('Fetching conversations - Session:', session);

    if (!session) {
      return res.status(401).json({ error: 'Please sign in to continue' });
    }

    try {
      await connectDB();
      console.log('MongoDB connected successfully');
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return res.status(500).json({
        error: 'Database connection failed',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    const userId = session.user.id || session.user.sub || session.user.email;
    if (!userId) {
      console.error('No user ID found in session:', session);
      return res.status(400).json({ 
        error: 'User ID not found in session',
        sessionDetails: JSON.stringify(session.user)
      });
    }

    console.log('Fetching conversations for user:', userId);
    const conversations = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    console.log(`Found ${conversations.length} conversations`);
    return res.status(200).json(conversations);

  } catch (error) {
    console.error('Error in conversations handler:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch conversations',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 