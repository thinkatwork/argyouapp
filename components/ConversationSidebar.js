import React from 'react';
import styles from '../styles/ConversationSidebar.module.css';

const ConversationSidebar = ({ conversations, onSelect, onNew, onDelete, currentId }) => {
  return (
    <div className={styles.sidebar}>
      <button onClick={onNew} className={styles.newButton}>
        New Argument
      </button>
      <div className={styles.conversationList}>
        {conversations.map((conv) => (
          <div
            key={conv._id}
            className={`${styles.conversationItem} ${conv._id === currentId ? styles.active : ''}`}
            onClick={() => onSelect(conv)}
          >
            <span className={styles.title}>{conv.title}</span>
            <span className={styles.date}>
              {new Date(conv.createdAt).toLocaleDateString()}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv._id);
              }}
              className={styles.deleteButton}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationSidebar; 