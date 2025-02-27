import React, { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import ConversationSidebar from '../components/ConversationSidebar';
import ChatBox from '../components/ChatBox';
import DegreeSlider from '../components/DegreeSlider';
import styles from '../styles/Components.module.css';
import { useRouter } from 'next/router';
import Navigation from '../components/Navigation';
import ErrorBoundary from '../components/ErrorBoundary';

export default function Home() {
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [degree, setDegree] = useState(5);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    console.log('Session status:', status);
    if (status === 'authenticated') {
      fetchConversations();
    }
  }, [status]);

  const fetchConversations = async () => {
    try {
      console.log('Fetching conversations...');
      const res = await fetch('/api/conversations', {
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to fetch conversations');
      }
      
      console.log('Fetched conversations:', data);
      setConversations(data);
      
      // If there's a current conversation, refresh it
      if (currentConversation) {
        const updated = data.find(c => c._id === currentConversation._id);
        if (updated) {
          setCurrentConversation(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    }
  };

  const handleNewConversation = async (newConversation) => {
    try {
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
    } catch (error) {
      console.error('Error handling new conversation:', error);
      setError('Failed to create new conversation');
    }
  };

  const handleConversationUpdate = async (updatedConversation) => {
    try {
      setCurrentConversation(updatedConversation);
      setConversations(prev => 
        prev.map(conv => 
          conv._id === updatedConversation._id ? updatedConversation : conv
        )
      );
    } catch (error) {
      console.error('Error updating conversation:', error);
      setError('Failed to update conversation');
    }
  };

  const handleDelete = async (conversationId) => {
    try {
      console.log('Deleting conversation:', {
        id: conversationId,
        currentUser: session?.user?.email
      });
      
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Delete failed:', {
          status: response.status,
          data
        });
        throw new Error(data.error || 'Failed to delete conversation');
      }

      // Update local state after successful deletion
      setConversations(prev => 
        prev.filter(conv => conv._id !== conversationId)
      );

      if (currentConversation?._id === conversationId) {
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError(error.message); // Show error to user
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className={styles.layout}>
      <Navigation />
      <div className={styles.contentWrapper}>
        <ConversationSidebar
          conversations={conversations}
          onSelect={setCurrentConversation}
          onNew={() => setCurrentConversation(null)}
          onDelete={handleDelete}
          currentId={currentConversation?._id}
        />
        <main className={styles.main}>
          <header className={styles.header}>
            <h1 className={styles.heading}>
              Welcome, {session?.user?.name || 'User'}
            </h1>
          </header>
          <DegreeSlider value={degree} onChange={setDegree} />
          <ErrorBoundary>
            <ChatBox
              degree={degree}
              conversation={currentConversation}
              onConversationUpdate={handleConversationUpdate}
              onNewConversation={handleNewConversation}
            />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
