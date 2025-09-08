// routes/userProfileRoutes.js
import express from "express";
import EximclientUser from "../models/eximclientUserModel.js";
import { authenticateUser } from "../middlewares/authMiddleware.js"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { triggerReminderCheck } from "../services/reminderService.js"

const router = express.Router();

const s3 = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  },
});

// Get user profile
router.get("/api/user/profile", authenticateUser, async (req, res) => {
  try {
    const user = await EximclientUser.findById(req.user.id)
      .select('-password -passwordResetToken -emailVerificationToken')
      .populate('adminId', 'name email');
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update user profile
router.put("/api/user/profile", authenticateUser, async (req, res) => {
  try {
    const { name, email } = req.body;
    
   // Assume req.body.email is the new email user entered

const user = await EximclientUser.findById(req.user.id);

if (!user) {
  return res.status(404).json({ success: false, message: "User not found" });
}

const oldEmail = user.email.toLowerCase();
const newEmail = req.body.email.toLowerCase();

if (newEmail !== oldEmail) {
  // Check if new email is already used by another user
  const emailExists = await EximclientUser.findOne({ email: newEmail });
  if (emailExists) {
    return res.status(400).json({ success: false, message: "Email already exists" });
  }

  // OPTION 1: Use a pendingEmail field
  user.pendingEmail = newEmail;

  // Mark unverified
  user.emailVerified = false;
  user.status = 'pending';

  // Generate new verification token
  const emailVerificationToken = user.emailVerificationToken();

  await user.save();

  // Send verification email to new email address
  await sendVerificationEmail(newEmail, user.name, emailVerificationToken);

  return res.json({
    success: true,
    message: "An email verification link has been sent to your new email address. Please verify to apply changes."
  });
} else {
  // No email change, update other fields normally
  user.name = req.body.name || user.name;
  await user.save();

  return res.json({
    success: true,
    message: "Profile updated successfully",
    user
  });
}
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Add document to user profile
router.post("/api/user/profile/documents", authenticateUser, async (req, res) => {
  try {
    const { title, url, expirationDate, reminderDays } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ 
        success: false, 
        message: "Title and URL are required" 
      });
    }

    const user = await EximclientUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const newDocument = {
      title,
      url,
      uploadDate: new Date(),
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      reminderDays: reminderDays || null,
      reminderSent: false
    };

    // Initialize documents array if it doesn't exist
    if (!user.documents) {
      user.documents = [];
    }

    user.documents.push(newDocument);
    await user.save();

    res.json({ 
      success: true, 
      message: "Document added successfully",
      document: newDocument
    });
  } catch (error) {
    console.error("Error adding document:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete document from user profile
router.delete("/api/user/profile/documents/:documentId", authenticateUser, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const user = await EximclientUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const documentIndex = user.documents.findIndex(
      doc => doc._id.toString() === documentId
    );

    if (documentIndex === -1) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const document = user.documents[documentIndex];
    
    // Delete from S3 if URL contains S3 bucket
    if (document.url && document.url.includes(process.env.REACT_APP_S3_BUCKET)) {
      try {
        const urlParts = document.url.split('/');
        const key = urlParts.slice(3).join('/'); // Remove protocol and domain
        
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.REACT_APP_S3_BUCKET,
          Key: decodeURIComponent(key),
        });
        
        await s3.send(deleteCommand);
        console.log("File deleted from S3:", key);
      } catch (s3Error) {
        console.error("Error deleting file from S3:", s3Error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    user.documents.splice(documentIndex, 1);
    await user.save();

    res.json({ 
      success: true, 
      message: "Document deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Add this route to your userProfileRoutes.js for testing



export default router;
