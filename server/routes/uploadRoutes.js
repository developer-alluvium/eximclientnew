import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();

// Initialize S3 Client
const s3 = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  },
});

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB (adjust as needed)
});

// Upload Route
router.post(
  "/api/upload",
  upload.single("file"), // 'file' matches the FormData key from frontend
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const file = req.file;
      const folderName = req.body.folderName || "uploads"; // Default folder or from request

      const timestamp = Date.now();
      const originalName = file.originalname;
      const extension = originalName.substring(originalName.lastIndexOf("."));
      const baseName = originalName.substring(0, originalName.lastIndexOf("."));

      // Clean filename to remove special chars if needed, but keeping it simple for now
      const uniqueFileName = `${baseName}-${timestamp}${extension}`;
      const key = `${folderName}/${uniqueFileName}`;

      const params = {
        Bucket: process.env.REACT_APP_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ACL: 'public-read' // Uncomment if files need to be publicly readable and bucket allows it
      };

      const command = new PutObjectCommand(params);
      await s3.send(command);

      // Construct Location URL manually or return what's needed
      // Standard S3 URL format: https://<bucket-name>.s3.<region>.amazonaws.com/<key>
      // Or if using custom domain...
      const location = `https://${process.env.REACT_APP_S3_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${key}`;

      res.status(200).json({
        message: "File uploaded successfully",
        Location: location,
        Key: key,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res
        .status(500)
        .json({ message: "File upload failed", error: error.message });
    }
  }
);

export default router;
