import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_PERSONALITY } from '../../config/aiConfig';
import Conversation from '../../models/Conversation';
import connectDB from '../../lib/mongodb';

// Initialize Gemini with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

// At the top of the file, add API key validation
if (!process.env.GOOGLE_AI_KEY) {
  console.error('GOOGLE_AI_KEY is not configured');
  throw new Error('GOOGLE_AI_KEY is required');
}

// Helper function to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with longer exponential backoff
async function retryWithBackoff(fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      
      if (i === maxRetries - 1) throw error;
      
      // Longer backoff times: 2s, 4s, 8s, 16s, 32s
      const waitTime = Math.min(2000 * Math.pow(2, i), 32000);
      console.log(`Retrying in ${waitTime}ms...`);
      await delay(waitTime);
    }
  }
}

// Function to sanitize input
function sanitizeInput(text) {
  // Remove any potentially problematic content
  return text
    .replace(/[^\w\s.,!?-]/g, '') // Only allow basic punctuation and alphanumeric characters
    .trim();
}

// Add more robust rate limiting
const rateLimitTracker = {
  requests: new Map(),
  getKey(userId) {
    return `${userId}_${Math.floor(Date.now() / 60000)}`; // Key by user and minute
  },
  
  increment(userId) {
    const key = this.getKey(userId);
    const current = this.requests.get(key) || 0;
    this.requests.set(key, current + 1);
    
    // Cleanup old entries
    for (const [oldKey] of this.requests) {
      if (oldKey.split('_')[1] < Math.floor(Date.now() / 60000)) {
        this.requests.delete(oldKey);
      }
    }
    
    return current + 1;
  },
  
  isRateLimited(userId) {
    return (this.requests.get(this.getKey(userId)) || 0) >= 30; // Half of Gemini's limit
  }
};

// Request queue implementation
const requestQueue = {
  queue: [],
  processing: false,
  
  async add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      if (!this.processing) {
        this.process();
      }
    });
  },
  
  async process() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const { request, resolve, reject } = this.queue.shift();
    
    try {
      // Wait at least 1 second between requests
      await delay(1000);
      const result = await request();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    this.process();
  }
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Please sign in to continue' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    await connectDB();

    const { message, degree, history, conversationId, format } = req.body;

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    }

    // Check rate limit before processing
    if (rateLimitTracker.isRateLimited(session.user.id)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: 60
      });
    }

    // Track the request
    rateLimitTracker.increment(session.user.id);

    // Sanitize inputs
    const sanitizedMessage = sanitizeInput(message);
    const sanitizedHistory = history.map(msg => ({
      ...msg,
      text: sanitizeInput(msg.text)
    }));

    // Configure personality based on format
    const getFormatPrompt = (format) => {
      switch (format) {
        case 'Interview':
          return `You are an interviewer having a professional discussion. 
                  Respond in a formal interview style, asking probing questions 
                  and maintaining journalistic objectivity.`;
        
        case 'Podcast':
          return `You are a podcast host engaging in a dynamic conversation. 
                  Use a conversational tone, include relevant anecdotes, 
                  and maintain engaging back-and-forth dialogue.`;
        
        case 'Twitter Storm':
          return `You are engaged in a Twitter-style debate. 
                  Keep responses concise and punchy, use relevant hashtags, 
                  and maintain the characteristic Twitter tone while staying respectful.`;
        
        case 'Academic Exam':
          return `You are an academic examiner evaluating arguments. 
                  Use formal academic language, require citations and evidence, 
                  and evaluate arguments based on scholarly merit.`;
        
        default: // Casual Chat
          return `You are having a friendly debate. 
                  Keep the tone casual but respectful, 
                  use everyday language, and maintain a conversational style.`;
      }
    };

    const formatPrompt = getFormatPrompt(format);

    // Use the configured prompt
    const prompt = AI_PERSONALITY.getPrompt(sanitizedMessage, degree, sanitizedHistory);

    // Initialize model with error handling
    let model;
    try {
      model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      });
    } catch (error) {
      console.error('Error initializing Gemini model:', error);
      return res.status(500).json({ 
        error: 'Failed to initialize AI model',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Generate response with more detailed error logging
    try {
      const executeRequest = async () => {
        try {
          // Generate content with Gemini
          const result = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [{
                text: `${getFormatPrompt(format)}

You MUST respond with a valid JSON object in this exact format:

{
  "ratings": {
    "logicalStrength": <number 1-10>,
    "evidenceUsage": <number 1-10>,
    "persuasiveness": <number 1-10>,
    "overallScore": <number 1-10>
  },
  "response": "<your counterargument>",
  "feedback": "<constructive feedback>",
  "intensity": ${degree}
}

Previous conversation:
${history.map(msg => `${msg.sender === 'user' ? 'Human' : 'You'}: ${msg.text}`).join('\n')}

Human's latest statement: "${message}"

IMPORTANT: Your response must be a valid JSON object. Do not include any text outside the JSON.`
              }]
            }]
          });

          if (!result?.response) {
            throw new Error('Empty response from AI model');
          }

          // Get the response text
          const responseText = result.response.text();
          console.log('Raw Gemini response:', responseText);

          let aiResponse;
          try {
            // Try to parse as JSON
            aiResponse = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON:', parseError);
            console.log('Response that failed to parse:', responseText);

            // If it's not JSON, create a response object with the raw text
            aiResponse = {
              response: responseText,
              ratings: {
                logicalStrength: 5,
                evidenceUsage: 5,
                persuasiveness: 5,
                overallScore: 5
              },
              feedback: "Unable to analyze argument structure.",
              intensity: degree
            };
          }

          // Validate the response structure
          if (!aiResponse.response || !aiResponse.ratings || !aiResponse.feedback) {
            console.error('Invalid response structure:', aiResponse);
            throw new Error('Invalid response structure from AI');
          }

          return aiResponse;
        } catch (error) {
          console.error('Gemini API error:', error);
          throw new Error(`Failed to generate response: ${error.message}`);
        }
      };

      // Add the request to the queue
      const aiResponse = await requestQueue.add(executeRequest);

      // Save the messages to the conversation
      if (conversation) {
        conversation.messages.push(
          { 
            text: message, 
            sender: 'user', 
            timestamp: new Date() 
          },
          { 
            text: aiResponse.response,
            ratings: aiResponse.ratings,
            feedback: aiResponse.feedback,
            intensity: aiResponse.intensity,
            sender: 'ai', 
            timestamp: new Date() 
          }
        );
        conversation.updatedAt = new Date();
        await conversation.save();
      }

      return res.status(200).json({ 
        response: aiResponse.response,
        ratings: aiResponse.ratings,
        feedback: aiResponse.feedback,
        intensity: aiResponse.intensity,
        conversationId: conversation._id 
      });
    } catch (error) {
      console.error('Chat API error:', error);
      return res.status(500).json({ 
        error: 'Failed to generate response. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}