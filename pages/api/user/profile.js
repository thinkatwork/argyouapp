import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { hash, compare } from 'bcryptjs';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Please sign in to continue' });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { firstName, lastName, email, currentPassword, newPassword } = req.body;

    // If trying to change password, verify current password
    if (newPassword) {
      const isValid = await compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      // Hash new password
      user.password = await hash(newPassword, 12);
    }

    // Update user info
    user.name = `${firstName} ${lastName}`.trim();
    user.email = email;

    await user.save();

    return res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
} 