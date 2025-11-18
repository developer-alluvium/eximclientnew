// components/UserProfile/DocumentsTab.jsx
import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Avatar,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Divider,
  Tooltip,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import FileUpload from "../../utils/FileUpload";
import { getCookie } from "../../utils/cookies";

const DocumentsTab = ({ user, onRefreshProfile, onSetError, onSetSuccess }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("");
  const [expirationDate, setExpirationDate] = useState(null);
  const [reminderDays, setReminderDays] = useState(30);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilExpiration = (expirationDate) => {
    if (!expirationDate) return null;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationChip = (expirationDate) => {
    const daysUntil = getDaysUntilExpiration(expirationDate);
    if (daysUntil === null)
      return <Chip label="No Expiry" size="small" variant="outlined" />;

    let color = "success";
    let label = `${daysUntil} days left`;

    if (daysUntil < 0) {
      color = "error";
      label = `Expired`;
    } else if (daysUntil <= 30) {
      color = "warning";
      label = `Expires soon`;
    }

    return (
      <Chip
        label={label}
        color={color}
        size="small"
        sx={{ fontWeight: "600" }}
      />
    );
  };

  const handleAddDocument = async () => {
    if (!documentTitle || uploadedFiles.length === 0) {
      onSetError("Please provide a title and upload a document");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/user/profile/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCookie("access_token")}`,
          },
          body: JSON.stringify({
            title: documentTitle,
            url: uploadedFiles[0].url,
            expirationDate: expirationDate,
            reminderDays: reminderDays,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        onSetSuccess("Document added successfully");
        setAddDocumentOpen(false);
        setDocumentTitle("");
        setUploadedFiles([]);
        setExpirationDate(null);
        setReminderDays(30);
        onRefreshProfile();
      } else {
        onSetError(data.message);
      }
    } catch (error) {
      console.error("Error adding document:", error);
      onSetError("Failed to add document");
    }
  };

  const handleViewDocument = (url) => {
    if (!url) {
      onSetError("Document URL not available");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadDocument = async (url, title) => {
    if (!url) {
      onSetError("Document URL not available");
      return;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = title || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      onSetSuccess("Document downloaded successfully");
    } catch (error) {
      console.error("Error downloading document:", error);
      onSetError("Failed to download document");
    }
  };
  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/user/profile/documents/${documentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getCookie("access_token")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        onSetSuccess("Document deleted successfully");
        onRefreshProfile();
      } else {
        onSetError(data.message);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      onSetError("Failed to delete document");
    }
  };

  const filteredDocuments =
    user?.documents?.filter((doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <TextField
            size="small"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
              ),
            }}
            sx={{ width: 300 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDocumentOpen(true)}
            sx={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              "&:hover": {
                background: "linear-gradient(135deg, #5a6fd8, #6a42a0)",
              },
            }}
          >
            Add Document
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                <TableCell sx={{ fontWeight: 600 }}>Document Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Upload Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Expiration Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Reminder</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {user?.documents?.length > 0 ? (
                user.documents
                  .filter((doc) =>
                    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((doc) => (
                    <TableRow key={doc._id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              mr: 1.5,
                              bgcolor: "primary.light",
                              color: "primary.dark",
                            }}
                          >
                            {doc.title.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              {doc.title}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{formatDate(doc.uploadDate)}</TableCell>
                      <TableCell>{formatDate(doc.expirationDate)}</TableCell>
                      <TableCell>
                        {getExpirationChip(doc.expirationDate)}
                      </TableCell>
                      <TableCell>
                        {doc.reminderDays ? (
                          <Chip
                            label={`${doc.reminderDays} days`}
                            size="small"
                            variant="outlined"
                            color="info"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            None
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: 1, // spacing between buttons
                          }}
                        >
                          <Tooltip title="View Document" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleViewDocument(doc.url)}
                              sx={{
                                bgcolor: alpha("#2196f3", 0.1),
                                color: "#2196f3",
                                width: 36,
                                height: 36,
                                "&:hover": {
                                  bgcolor: alpha("#2196f3", 0.2),
                                  transform: "scale(1.05)",
                                },
                                transition: "all 0.2s ease",
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download Document" arrow>
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleDownloadDocument(doc.url, doc.title)
                              }
                              sx={{
                                bgcolor: alpha("#4caf50", 0.1),
                                color: "#4caf50",
                                width: 36,
                                height: 36,
                                "&:hover": {
                                  bgcolor: alpha("#4caf50", 0.2),
                                  transform: "scale(1.05)",
                                },
                                transition: "all 0.2s ease",
                              }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Document" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteDocument(doc._id)}
                              sx={{
                                bgcolor: alpha("#f44336", 0.1),
                                color: "#f44336",
                                width: 36,
                                height: 36,
                                "&:hover": {
                                  bgcolor: alpha("#f44336", 0.2),
                                  transform: "scale(1.05)",
                                },
                                transition: "all 0.2s ease",
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography
                      color="text.secondary"
                      sx={{ fontStyle: "italic" }}
                    >
                      No documents uploaded yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add Document Dialog */}
        <Dialog
          open={addDocumentOpen}
          onClose={() => setAddDocumentOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: "bold" }}>
            Add New Document
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Document Title"
              fullWidth
              variant="outlined"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              sx={{ mt: 1, mb: 2 }}
              placeholder="e.g., Passport, PAN Card"
            />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Upload File
              </Typography>
              <FileUpload
                onFilesUploaded={setUploadedFiles}
                onFileDeleted={() => setUploadedFiles([])}
                bucketPath="user-documents"
                multiple={false}
                existingFiles={uploadedFiles}
                acceptedFileTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
              />
            </Box>
            <DatePicker
              label="Expiration Date (Optional)"
              value={expirationDate}
              onChange={setExpirationDate}
              renderInput={(params) => (
                <TextField {...params} fullWidth sx={{ mb: 2 }} />
              )}
            />
            <FormControl fullWidth>
              <InputLabel>Reminder</InputLabel>
              <Select
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                label="Reminder"
              >
                <MenuItem value={7}>7 days before</MenuItem>
                <MenuItem value={15}>15 days before</MenuItem>
                <MenuItem value={30}>30 days before</MenuItem>
                <MenuItem value={60}>60 days before</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setAddDocumentOpen(false)}
              sx={{
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDocument}
              variant="contained"
              sx={{
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                "&:hover": {
                  background: "linear-gradient(135deg, #5a6fd8, #6a42a0)",
                },
              }}
            >
              Add Document
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default DocumentsTab;
