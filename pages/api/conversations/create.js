import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectDB from '../../../lib/mongodb';
import Conversation from '../../../models/Conversation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    console.log('Session:', session);

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

    const { title, format } = req.body;
    console.log('Request body:', { title, format });
    
    if (!title || !format) {
      return res.status(400).json({ error: 'Title and format are required' });
    }

    const userId = session.user.id || session.user.sub || session.user.email;
    console.log('Session user:', session.user);

    if (!userId) {
      console.error('No user ID found in session:', session);
      return res.status(400).json({ 
        error: 'User ID not found in session',
        sessionDetails: JSON.stringify(session.user)
      });
    }

    console.log('Creating conversation:', { title, format, userId });

    const conversation = await Conversation.create({
      userId,
      title,
      format,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Created conversation:', conversation);
    return res.status(201).json(conversation);

  } catch (error) {
    console.error('Error in create conversation handler:', error);
    return res.status(500).json({ 
      error: 'Failed to create conversation',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 