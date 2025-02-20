import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import Conversation from '../../../models/Conversation';
import connectDB from '../../../lib/mongodb';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Please sign in to continue' });
    }

    const { id } = req.query;

    await connectDB();

    if (req.method === 'DELETE') {
      const conversation = await Conversation.findOneAndDelete({
        _id: id,
        userId: session.user.id
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.status(200).json({ message: 'Conversation deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
} 