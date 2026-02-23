import React, { useEffect, useState } from 'react';
import { useElockNotifications } from '../hooks/useElockNotifications';
import '../styles/globalNotifications.css';

const GlobalNotificationSnackbar = () => {
  const { notificationsQueue, removeNotification } = useElockNotifications();
  const [activeNotifications, setActiveNotifications] = useState([]);

  useEffect(() => {
    // When queue gets new items, push them to active notifications (max 5)
    if (notificationsQueue.length > 0) {
      notificationsQueue.forEach(newNotif => {
        // Prevent duplicate IDs if component double-renders
        setActiveNotifications(prev => {
          if (prev.find(n => n.id === newNotif.id)) return prev;
          
          // Keep only the 5 most recent
          const updated = [...prev, newNotif];
          if (updated.length > 5) {
            return updated.slice(updated.length - 5);
          }
          return updated;
        });

        // Auto-dismiss after 6 seconds
        setTimeout(() => {
          handleDismiss(newNotif.id);
        }, 6000);
        
        // Remove from queue so it's not processed again
        removeNotification(newNotif.id);
      });
    }
  }, [notificationsQueue, removeNotification]);

  const handleDismiss = (id) => {
    // Mark as exiting first to trigger animation
    setActiveNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isExiting: true } : n)
    );

    // Completely remove after animation completes
    setTimeout(() => {
      setActiveNotifications(prev => prev.filter(n => n.id !== id));
    }, 300);
  };

  if (activeNotifications.length === 0) return null;

  return (
    <div className="global-notification-container">
      {activeNotifications.map(notification => (
        <div 
          key={notification.id} 
          className={`global-snackbar ${notification.isAlarm ? 'alarm' : 'event'} ${notification.isExiting ? 'exiting' : ''}`}
        >
          <div className="global-snackbar-icon">
            {notification.isAlarm ? 'A' : 'E'}
          </div>
          <div className="global-snackbar-content">
             <span className="global-snackbar-elock">
              eLock {notification.elockNo}
            </span>
            <span className="global-snackbar-title">
              {notification.title}
            </span>
            <span className="global-snackbar-time">
              {notification.time}
            </span>
          </div>
          <button 
            className="global-snackbar-close" 
            onClick={() => handleDismiss(notification.id)}
            aria-label="Close notification"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default GlobalNotificationSnackbar;
