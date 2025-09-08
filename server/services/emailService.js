// services/emailService.js
import { createTransport } from 'nodemailer';

const createEmailTransporter = () => {
  return createTransport({
    host: process.env.MAIL_SERVER,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_SSL_TLS === 'true',
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: process.env.MAIL_STARTTLS === 'true'
    }
  });
};

export const sendVerificationEmail = async (email, name, emailVerificationToken) => {
  const transporter = createEmailTransporter();
  
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${emailVerificationToken}`;
  
  const mailOptions = {
    from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome ${name}!</h2>
        <p>Thank you for registering with us. Please click the link below to verify your email address:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
        
        <p>This link will expire in 24 hours.</p>
        
        <p>If you didn't create an account, please ignore this email.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    `,
    text: `
      Welcome ${name}!
      
      Thank you for registering with us. Please copy and paste the following URL into your browser to verify your email address:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, please ignore this email.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};


export const sendPasswordResetEmail = async (email, name, token) => {
  const transporter = createEmailTransporter();

  const resetUrl = `${process.env.CLIENT_URL}/forgot-password/${token}`;

  const mailOptions = {
    from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div>
        <h2>Hello ${name},</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="padding: 12px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
    text: `Hello ${name},\n\nYou requested a password reset. Use the following link to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
};


// Add this enhanced version to your emailService.js

export const sendReminderEmail = async (email, name, document) => {
  const transporter = createEmailTransporter();
  
  const daysUntilExpiration = Math.ceil(
    (new Date(document.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)
  );
  
  // Format expiration date nicely
  const expirationDateFormatted = new Date(document.expirationDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
  
  // Determine urgency level
  let urgencyClass = '';
  let urgencyMessage = '';
  
  if (daysUntilExpiration <= 7) {
    urgencyClass = 'urgent';
    urgencyMessage = '🚨 URGENT: ';
  } else if (daysUntilExpiration <= 30) {
    urgencyClass = 'warning';
    urgencyMessage = '⚠️ Important: ';
  }
  
  const mailOptions = {
    from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM}>`,
    to: email,
    subject: `${urgencyMessage}Document Expiration Reminder: ${document.title}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1976d2; margin-bottom: 10px;">📄 Document Reminder</h1>
          <div style="height: 4px; background: linear-gradient(90deg, #1976d2, #42a5f5); margin: 0 auto; width: 100px; border-radius: 2px;"></div>
        </div>
        
        <p style="font-size: 16px; color: #333;">Hello <strong>${name}</strong>,</p>
        
        <div style="background: ${urgencyClass === 'urgent' ? '#ffebee' : urgencyClass === 'warning' ? '#fff3e0' : '#e3f2fd'}; 
                    border-left: 5px solid ${urgencyClass === 'urgent' ? '#f44336' : urgencyClass === 'warning' ? '#ff9800' : '#2196f3'}; 
                    padding: 20px; margin: 20px 0; border-radius: 5px;">
          <p style="font-size: 16px; margin: 0; color: #333;">
            ${urgencyMessage}Your document <strong>"${document.title}"</strong> will expire in <strong style="color: ${urgencyClass === 'urgent' ? '#d32f2f' : urgencyClass === 'warning' ? '#f57c00' : '#1976d2'};">${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}</strong>.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">📋 Document Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666; width: 140px;">Document:</td>
              <td style="padding: 8px 0; color: #333;">${document.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Expiration Date:</td>
              <td style="padding: 8px 0; color: #333;">${expirationDateFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Days Remaining:</td>
              <td style="padding: 8px 0; color: ${urgencyClass === 'urgent' ? '#d32f2f' : urgencyClass === 'warning' ? '#f57c00' : '#1976d2'}; font-weight: bold;">
                ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0; color: #2e7d32;">
            <strong>💡 Action Required:</strong> Please ensure you renew this document before it expires to avoid any inconvenience.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/profile" 
             style="display: inline-block; background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            📱 Manage Your Documents
          </a>
        </div>
        
        <hr style="border: none; height: 1px; background-color: #e0e0e0; margin: 30px 0;">
        
        <div style="text-align: center;">
          <p style="color: #666; font-size: 14px; margin: 5px 0;">
            This is an automated reminder from your document management system.
          </p>
          <p style="color: #999; font-size: 12px; margin: 5px 0;">
            Sent on ${new Date().toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              timeZone: 'Asia/Kolkata'
            })} at ${new Date().toLocaleTimeString('en-IN', { 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: 'Asia/Kolkata'
            })} IST
          </p>
          <p style="color: #999; font-size: 12px; margin: 0;">
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    text: `
      Document Expiration Reminder
      
      Hello ${name},
      
      ${urgencyMessage}Your document "${document.title}" will expire in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}.
      
      Document Details:
      - Document: ${document.title}
      - Expiration Date: ${expirationDateFormatted}
      - Days Remaining: ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}
      
      Please renew this document before it expires.
      
      Manage your documents: ${process.env.CLIENT_URL}/profile
      
      This is an automated reminder. Please do not reply.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder email sent successfully to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending reminder email to ${email}:`, error);
    throw error;
  }
};


