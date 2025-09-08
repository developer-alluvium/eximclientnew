import React, { useState, useContext } from "react";
import { uploadFileToS3 } from "./AwsFileUpload";
import {
  Button,
  CircularProgress,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Alert
} from "@mui/material";
import {
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  CloudUpload as UploadIcon
} from "@mui/icons-material";
import { UserContext } from "../context/UserContext";

const FileUpload = ({
  label,
  onFilesUploaded,
  onFileDeleted,
  bucketPath,
  multiple = true,
  acceptedFileTypes = [],
  existingFiles = [],
  readOnly = false,
  maxFiles = 10
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState(existingFiles || []);
  const [error, setError] = useState("");

  const isImageFile = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  };

  const getFileIcon = (filename) => {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const iconStyle = { fontSize: 40, color: '#666' };
    
    switch (extension) {
      case '.pdf':
        return <FileIcon sx={{ ...iconStyle, color: '#d32f2f' }} />;
      case '.doc':
      case '.docx':
        return <FileIcon sx={{ ...iconStyle, color: '#1976d2' }} />;
      case '.xls':
      case '.xlsx':
        return <FileIcon sx={{ ...iconStyle, color: '#388e3c' }} />;
      default:
        return <FileIcon sx={iconStyle} />;
    }
  };

  const getFileName = (url) => {
    if (typeof url === 'string') {
      return decodeURIComponent(url.split('/').pop() || 'Unknown file');
    }
    return url?.name || url?.title || 'Unknown file';
  };

  const getFileSize = (file) => {
    if (file.size) {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      return `${sizeInMB} MB`;
    }
    return '';
  };

  const handleFileUpload = async (event) => {
    if (readOnly) return;
    
    setError("");
    const files = Array.from(event.target.files);
    
    // Check file limit
    if (uploadedFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newUploadedFiles = [];
    setUploading(true);

    try {
      for (const file of files) {
        try {
          const result = await uploadFileToS3(file, bucketPath);
          const fileData = {
            url: result.Location,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadDate: new Date().toISOString()
          };
          newUploadedFiles.push(fileData);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          setError(`Failed to upload ${file.name}`);
        }
      }

      const allFiles = [...uploadedFiles, ...newUploadedFiles];
      setUploadedFiles(allFiles);
      
      if (onFilesUploaded) {
        onFilesUploaded(allFiles);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileToDelete, index) => {
    try {
      const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
      setUploadedFiles(updatedFiles);
      
      if (onFileDeleted) {
        const fileUrl = typeof fileToDelete === 'string' ? fileToDelete : fileToDelete.url;
        onFileDeleted(fileUrl);
      }
      
      if (onFilesUploaded) {
        onFilesUploaded(updatedFiles);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      setError("Failed to delete file");
    }
  };

  const renderFilePreview = (file, index) => {
    const fileName = getFileName(file);
    const fileUrl = typeof file === 'string' ? file : file.url;
    const isImage = isImageFile(fileName);

    return (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Card 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            position: 'relative'
          }}
        >
          {/* Delete button */}
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteFile(file, index)}
            disabled={readOnly}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 1)',
              },
              zIndex: 1
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>

          {/* File preview */}
          {isImage ? (
            <CardMedia
              component="img"
              height="120"
              image={fileUrl}
              alt={fileName}
              sx={{
                objectFit: 'cover',
                cursor: 'pointer'
              }}
              onClick={() => window.open(fileUrl, '_blank')}
            />
          ) : (
            <Box
              sx={{
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
                cursor: 'pointer'
              }}
              onClick={() => window.open(fileUrl, '_blank')}
            >
              {getFileIcon(fileName)}
            </Box>
          )}

          {/* File info */}
          <CardContent sx={{ flexGrow: 1, pt: 1, pb: '8px !important' }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                mb: 0.5,
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {fileName}
            </Typography>
            
            {file.size && (
              <Chip 
                label={getFileSize(file)} 
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box>
      {/* Upload Button */}
      {!readOnly && (
        <Button
          variant="contained"
          component="label"
          startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
          disabled={uploading || (uploadedFiles.length >= maxFiles)}
          sx={{
            mb: 2,
            backgroundColor: "#1c1e22",
            "&:hover": {
              backgroundColor: "#2c2e32"
            }
          }}
        >
          {uploading ? "Uploading..." : label || "Upload Files"}
          <input
            type="file"
            hidden
            multiple={multiple}
            accept={acceptedFileTypes.length ? acceptedFileTypes.join(",") : ""}
            onChange={handleFileUpload}
            disabled={uploading || readOnly}
          />
        </Button>
      )}

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* File Count Info */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'} uploaded
            {maxFiles && ` (${uploadedFiles.length}/${maxFiles})`}
          </Typography>
        </Box>
      )}

      {/* File Previews */}
      {uploadedFiles.length > 0 && (
        <Grid container spacing={2}>
          {uploadedFiles.map((file, index) => renderFilePreview(file, index))}
        </Grid>
      )}

      {/* Empty state */}
      {uploadedFiles.length === 0 && !uploading && (
        <Box
          sx={{
            border: '2px dashed #ccc',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            bgcolor: 'grey.50'
          }}
        >
          <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {readOnly ? "No files uploaded" : "No files uploaded yet"}
          </Typography>
          {acceptedFileTypes.length > 0 && (
            <Typography variant="caption" color="text.secondary" display="block">
              Accepted: {acceptedFileTypes.join(", ")}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default FileUpload;