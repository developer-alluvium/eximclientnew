// components/EmailVerification.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, Typography, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';

function EmailVerification() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_STRING}/users/verify-email/${token}`);
        
        if (response.data.success) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to login...');
          
          // Redirect to login after 2 seconds
          setTimeout(() => {
            navigate('/login', {
              state: { message: 'Email verified successfully! You can now log in.' }
            });
          }, 2000);
        }
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Email verification failed.');
        
        // Redirect to login with error after 3 seconds
        setTimeout(() => {
          navigate('/login', {
            state: { error: 'Email verification failed. Please try again.' }
          });
        }, 3000);
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('Invalid verification link.');
    }
  }, [token, navigate]);

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        textAlign="center"
      >
        {status === 'verifying' && (
          <>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Verifying your email...
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please wait while we verify your email address.
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <Alert severity="success" sx={{ mb: 2, width: '100%' }}>
              {message}
            </Alert>
            <Typography variant="h5" gutterBottom>
              Email Verified Successfully!
            </Typography>
          </>
        )}

        {status === 'error' && (
          <>
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {message}
            </Alert>
            <Typography variant="h5" gutterBottom>
              Verification Failed
            </Typography>
          </>
        )}
      </Box>
    </Container>
  );
}

export default EmailVerification;
