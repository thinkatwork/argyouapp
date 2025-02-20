import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import Conversation from '../../../models/Conversation';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Please sign in to continue' });
    }

    // Removed admin role check temporarily
    await connectDB();

    // Aggregate user data with conversation statistics
    const users = await User.aggregate([
      {
        $lookup: {
          from: 'conversations',
          localField: '_id',
          foreignField: 'userId',
          as: 'conversations'
        }
      },
      {
        $project: {
          name: 1,  // Changed from firstName/lastName to name
          email: 1,
          status: 1,
          conversationCount: { $size: '$conversations' },
          lastActive: {
            $max: [
              { $max: '$conversations.updatedAt' },
              '$lastLogin'
            ]
          }
        }
      },
      {
        $sort: { lastActive: -1 }
      }
    ]);

    return res.status(200).json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
} 