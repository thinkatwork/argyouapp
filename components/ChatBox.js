import React, { useState, useRef, useEffect } from 'react';
import styles from '../styles/Components.module.css';

const ChatBox = ({ degree, conversation, onConversationUpdate, onNewConversation }) => {
  const messagesEndRef = useRef(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [openSections, setOpenSections] = useState({}); // Track open/closed state for each message
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('Casual Chat');
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const MIN_REQUEST_INTERVAL = 2000; // 2 seconds minimum between requests
  const [cooldownTime, setCooldownTime] = useState(0);

  const formats = [
    'Casual Chat',
    'Interview',
    'Podcast',
    'Twitter Storm',
    'Academic Exam'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  useEffect(() => {
    let timer;
    if (cooldownTime > 0) {
      timer = setInterval(() => {
        setCooldownTime(time => Math.max(0, time - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    try {
      setIsLoading(true);

      // Add user message to UI immediately
      const userMessage = { text: message, sender: 'user', timestamp: new Date() };
      const updatedMessages = [...(conversation?.messages || []), userMessage];
      
      onConversationUpdate({
        ...conversation,
        messages: updatedMessages
      });

      console.log('Sending request with:', {
        message,
        degree,
        history: updatedMessages,
        conversationId: conversation?._id,
        format: conversation?.format
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          degree,
          history: updatedMessages,
          conversationId: conversation?._id,
          format: conversation?.format
        }),
      });

      const data = await response.json();
      console.log('Received response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add AI response with all the structured data
      const aiMessage = { 
        text: data.response,
        ratings: data.ratings,
        feedback: data.feedback,
        intensity: data.intensity,
        sender: 'ai',
        timestamp: new Date()
      };

      console.log('Creating AI message:', aiMessage);

      // Update conversation with both messages
      onConversationUpdate({
        ...conversation,
        _id: data.conversationId,
        messages: [...updatedMessages, aiMessage]
      });

      setMessage('');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message.includes('Rate limit') 
        ? error.message 
        : 'Failed to get response. Please try again.';

      onConversationUpdate({
        ...conversation,
        messages: [...(conversation?.messages || []), {
          text: `Error: ${errorMessage}`,
          sender: 'ai',
          isError: true,
          timestamp: new Date()
        }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateArgument = async (messageIndex, rating) => {
    try {
      // Get the user's message and AI's response
      const userMessage = conversation.messages[messageIndex];
      const aiResponse = conversation.messages[messageIndex + 1];
      
      // Get feedback from Gemini about the argument
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userArgument: userMessage.text,
          aiResponse: aiResponse.text,
          rating,
          degree
        })
      });

      const data = await res.json();
      
      // Update the message with feedback and rating type
      const updatedMessages = [...conversation.messages];
      updatedMessages[messageIndex + 1] = {
        ...aiResponse,
        feedback: data.feedback,
        ratingType: rating  // Store the rating type (weak/average/strong)
      };

      onConversationUpdate({
        ...conversation,
        messages: updatedMessages
      });
    } catch (error) {
      console.error('Error getting feedback:', error);
    }
  };

  const getRatingEmoji = (rating) => {
    switch (rating) {
      case 'weak':
        return '👎';
      case 'average':
        return '👌';
      case 'strong':
        return '👍';
      default:
        return '';
    }
  };

  const formatMessage = (text, messageId) => {
    // Extract rating, intensity, and feedback sections
    const ratingMatch = text.match(/\[Rating\]([\s\S]*?)\[Intensity:/);
    const intensityMatch = text.match(/\[Intensity: (\d+)\/10\]([\s\S]*?)\[Feedback\]/);
    const feedbackMatch = text.match(/\[Feedback\]([\s\S]*?)$/);
    
    if (!ratingMatch || !intensityMatch || !feedbackMatch) return text;

    const ratings = ratingMatch[1].trim();
    const intensity = parseInt(intensityMatch[1]);
    const argument = intensityMatch[2].trim();
    const feedback = feedbackMatch[1].trim();

    const toggleSection = (section) => {
      setOpenSections(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          [section]: !prev[messageId]?.[section]
        }
      }));
    };

    return (
      <>
        <div 
          className={`${styles.collapsibleSection} ${openSections[messageId]?.rating ? styles.open : ''}`}
          onClick={() => toggleSection('rating')}
        >
          <div className={styles.sectionHeader}>
            <span>View Argument Analysis</span>
            <span className={styles.toggleIcon}>
              {openSections[messageId]?.rating ? '−' : '+'}
            </span>
          </div>
          {openSections[messageId]?.rating && (
            <div className={styles.ratings}>
              {ratings.split('\n').map((rating, i) => (
                <div key={i} className={styles.ratingItem}>
                  {rating}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.intensityIndicator} 
             style={{ '--intensity-color': getIntensityColor(intensity) }}>
          Intensity: {intensity}/10
        </div>

        <div className={styles.argument}>{argument}</div>

        <div 
          className={`${styles.collapsibleSection} ${openSections[messageId]?.feedback ? styles.open : ''}`}
          onClick={() => toggleSection('feedback')}
        >
          <div className={styles.sectionHeader}>
            <span>View Feedback</span>
            <span className={styles.toggleIcon}>
              {openSections[messageId]?.feedback ? '−' : '+'}
            </span>
          </div>
          {openSections[messageId]?.feedback && (
            <div className={styles.feedback}>
              <p>{feedback}</p>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderMessage = (msg, index) => {
    const messageId = `${msg.timestamp}-${index}`;
    const isAiMessage = msg.sender === 'ai';
    
    const toggleSection = (section) => {
      setOpenSections(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          [section]: !prev[messageId]?.[section]
        }
      }));
    };
    
    return (
      <div 
        key={messageId}
        className={`${styles.message} ${styles[msg.sender]} ${msg.isError ? styles.error : ''}`}
      >
        {/* Main message text in speech bubble */}
        <div className={styles.messageText}>
          {isAiMessage ? msg.response || msg.text : msg.text}
        </div>
        
        {/* Combined analysis section */}
        {isAiMessage && msg.ratings && !msg.isError && (
          <div 
            className={`${styles.collapsibleSection} ${openSections[messageId]?.analysis ? styles.open : ''}`}
            onClick={() => toggleSection('analysis')}
          >
            <div className={styles.sectionHeader}>
              <span>View Analysis</span>
              <span className={styles.toggleIcon}>
                {openSections[messageId]?.analysis ? '−' : '+'}
              </span>
            </div>
            
            {openSections[messageId]?.analysis && (
              <div className={styles.analysisContent}>
                {/* Ratings section */}
                <div className={styles.analysisSection}>
                  <h4>Argument Analysis</h4>
                  <div className={styles.ratings}>
                    <div className={styles.ratingItem}>
                      <span>Logical Strength:</span>
                      <span>{msg.ratings.logicalStrength}/10</span>
                    </div>
                    <div className={styles.ratingItem}>
                      <span>Evidence Usage:</span>
                      <span>{msg.ratings.evidenceUsage}/10</span>
                    </div>
                    <div className={styles.ratingItem}>
                      <span>Persuasiveness:</span>
                      <span>{msg.ratings.persuasiveness}/10</span>
                    </div>
                    <div className={styles.ratingItem}>
                      <span>Overall Score:</span>
                      <span>{msg.ratings.overallScore}/10</span>
                    </div>
                  </div>
                </div>

                {/* Feedback section */}
                <div className={styles.analysisSection}>
                  <h4>Feedback</h4>
                  <div className={styles.feedback}>
                    {msg.feedback}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Rating buttons */}
        {isAiMessage && !msg.ratingType && index > 0 && (
          <div className={styles.ratingButtons}>
            <span>Rate your previous argument:</span>
            <button onClick={() => handleRateArgument(index - 1, 'weak')}>👎 Weak</button>
            <button onClick={() => handleRateArgument(index - 1, 'average')}>👌 Average</button>
            <button onClick={() => handleRateArgument(index - 1, 'strong')}>👍 Strong</button>
          </div>
        )}
      </div>
    );
  };

  const handleNewConversation = async () => {
    if (!topic.trim()) {
      alert('Please enter a topic');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Creating new conversation:', { topic, format });
      
      const res = await fetch('/api/conversations/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: topic,
          format: format
        })
      });

      const data = await res.json();
      console.log('Server response:', data);

      if (!res.ok) {
        console.error('Error response:', data);
        throw new Error(data.error || data.details || 'Failed to create conversation');
      }

      // Update the parent component with the new conversation
      onNewConversation(data);
      
      // Reset form
      setTopic('');
      setFormat('Casual Chat');
      
      // Focus the message input after a short delay
      setTimeout(() => {
        const inputForm = document.querySelector(`.${styles.inputForm} input`);
        if (inputForm) {
          inputForm.focus();
        }
      }, 100);
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert(error.message || 'Failed to create conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatBox}>
      {!conversation ? (  // Changed from checking messages length
        <div className={styles.newConversation}>
          <h3>Start a New Argument</h3>
          <div className={styles.setupForm}>
            <div className={styles.inputGroup}>
              <label>Topic:</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What would you like to argue about?"
                className={styles.input}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Format:</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className={styles.select}
              >
                {formats.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleNewConversation}
              className={styles.button}
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Start Argument'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.conversationHeader}>
            <h3>{conversation.title}</h3>
            <span className={styles.format}>{conversation.format}</span>
          </div>
          <div className={styles.messages}>
            {conversation.messages.map((msg, index) => renderMessage(msg, index))}
            {isLoading && (
              <div className={styles.loading}>Thinking of a counterargument...</div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Make your argument..."
              className={styles.input}
              disabled={isLoading}
              autoFocus  // Add this to focus the input
            />
            <button 
              type="submit" 
              className={styles.button}
              disabled={isLoading}
            >
              Argue
            </button>
          </form>
          {cooldownTime > 0 && (
            <div className={styles.rateLimitWarning}>
              Please wait {cooldownTime} seconds before sending another message
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Helper function to get color based on intensity
const getIntensityColor = (value) => {
  if (value <= 3) return "#4CAF50";  // Green
  if (value <= 6) return "#2196F3";  // Blue
  if (value <= 8) return "#FF9800";  // Orange
  return "#f44336";  // Red
};

export default ChatBox;
