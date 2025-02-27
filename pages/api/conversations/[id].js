import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import connectDB from '../../../lib/mongodb';
import Conversation from '../../../models/Conversation';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Please sign in to continue' });
    }

    // Get user email from session since NextAuth doesn't provide id by default
    const userId = session.user?.email;
    if (!userId) {
      return res.status(401).json({ error: 'User not found in session' });
    }

    const { id } = req.query;
    console.log('Delete request:', {
      id,
      userId,
      method: req.method
    });

    await connectDB();

    if (req.method === 'DELETE') {
      // Verify the conversation exists first
      const exists = await Conversation.findById(id);
      if (!exists) {
        console.log('Conversation not found in DB:', id);
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Check ownership using email instead of id
      if (exists.userId !== userId) {
        console.log('User does not own conversation:', {
          conversationUserId: exists.userId,
          requestUserId: userId
        });
        return res.status(403).json({ error: 'Not authorized to delete this conversation' });
      }

      const conversation = await Conversation.findOneAndDelete({
        _id: id,
        userId: userId  // Use email as userId
      });

      console.log('Delete result:', conversation ? 'Success' : 'Failed');
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.status(200).json({ message: 'Conversation deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Delete conversation error:', {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Failed to delete conversation',
      details: error.message 
    });
  }
} 