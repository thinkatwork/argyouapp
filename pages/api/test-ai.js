import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  try {
    if (!process.env.GOOGLE_AI_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    console.log('Testing AI connection...');
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Say "Hello"' }] }]
    });

    console.log('AI Response:', result.response?.text);

    return res.status(200).json({ 
      success: true, 
      response: result.response?.text,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI Test Error:', {
      message: error.message,
      status: error.status,
      headers: error.headers
    });

    return res.status(500).json({ 
      error: 'AI test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 