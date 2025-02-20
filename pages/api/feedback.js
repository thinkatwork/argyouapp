import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Please sign in to continue' });
    }

    const { userArgument, aiResponse, rating, degree } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `As a debate coach, analyze this argument exchange and provide constructive feedback. The intensity level was set to ${degree}/10.

User's Argument: "${userArgument}"
AI's Response: "${aiResponse}"
Quick Rating: ${rating}

Provide brief, constructive feedback (2-3 sentences) on:
1. The logical strength of the user's argument
2. Specific ways to improve
Focus on being encouraging while pointing out areas for growth.`
        }]
      }]
    });

    return res.status(200).json({ feedback: result.response.text() });
  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({ error: 'Failed to generate feedback' });
  }
} 