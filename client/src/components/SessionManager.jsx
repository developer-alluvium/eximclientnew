import React, { useContext } from 'react';
import { UserContext } from '../context/UserContext';

/**
 * Session Manager Component
 * Handles automatic logout and session warnings for the entire application
 */
const SessionManager = ({ userType = 'user' }) => {
  const { user } = useContext(UserContext);

  // Only render if user is logged in
  if (!user && userType === 'user') {
    return null;
  }

  // For SuperAdmin, check localStorage
  if (userType === 'superadmin' && !localStorage.getItem("superadmin_token")) {
    return null;
  }

  return null;
};

export default SessionManager;
