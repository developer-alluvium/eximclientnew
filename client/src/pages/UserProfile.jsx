// pages/UserProfile.js
import React, { useState, useEffect, useContext } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Menu,
  Fade,
  Tooltip,
  Stack,
  Divider,
  LinearProgress,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Login as LoginIcon,
  Description as DescriptionIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  Shield as ShieldIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import Notification from "@mui/icons-material/Notifications";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import FileUpload from "../utils/FileUpload";
import { UserContext } from "../context/UserContext";
import BackButton from "../components/BackButton";

// Consistent styling to match the reference image
const chipActive = { 
  color: "#2e7d32", 
  bgcolor: "#e8f5e8",
  fontWeight: 600,
  border: "1px solid #4caf50",
};

const chipExpired = { 
  color: "#d32f2f", 
  bgcolor: "#ffebee",
  fontWeight: 600,
  border: "1px solid #f44336",
};

const chipWarning = { 
  color: "#ed6c02", 
  bgcolor: "#fff3e0",
  fontWeight: 600,
  border: "1px solid #ff9800",
};

const UserProfile = () => {
  const { user: contextUser } = useContext(UserContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Edit profile state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");

  // Add document state
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("");
  const [expirationDate, setExpirationDate] = useState(null);
  const [reminderDays, setReminderDays] = useState(30);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // State for the actions menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/user/profile`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        setEditedName(data.user.name);
        setEditedEmail(data.user.email);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/user/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            name: editedName,
            email: editedEmail,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        setSuccess("Profile updated successfully");
        setEditProfileOpen(false);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile");
    }
  };

  const handleAddDocument = async () => {
    if (!documentTitle || uploadedFiles.length === 0) {
      setError("Please provide a title and upload a document");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/user/profile/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
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
        setSuccess("Document added successfully");
        setAddDocumentOpen(false);
        setDocumentTitle("");
        setUploadedFiles([]);
        setExpirationDate(null);
        setReminderDays(30);
        fetchUserProfile();
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Error adding document:", error);
      setError("Failed to add document");
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }
    handleMenuClose();
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/user/profile/documents/${documentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccess("Document deleted successfully");
        fetchUserProfile();
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      setError("Failed to delete document");
    }
  };
  
  const handleMenuOpen = (event, doc) => {
    setAnchorEl(event.currentTarget);
    setSelectedDoc(doc);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDoc(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
    if (daysUntil === null) return <Chip label="No Expiry" size="small" variant="outlined" />;

    let chipProps = chipActive;
    let label = `${daysUntil} days left`;

    if (daysUntil < 0) {
      chipProps = chipExpired;
      label = `Expired`;
    } else if (daysUntil <= 30) {
      chipProps = chipWarning;
      label = `Expires soon`;
    }

    return <Chip label={label} size="small" sx={{ fontWeight: "600", ...chipProps }} />;
  };

  const getUserInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getProfileStats = () => {
    const totalDocs = user?.documents?.length || 0;
    const expiredDocs = user?.documents?.filter(doc => getDaysUntilExpiration(doc.expirationDate) < 0).length || 0;
    const soonToExpire = user?.documents?.filter(doc => {
      const days = getDaysUntilExpiration(doc.expirationDate);
      return days > 0 && days <= 30;
    }).length || 0;
    
    return { totalDocs, expiredDocs, soonToExpire };
  };

  const stats = getProfileStats();

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress />
        </Box>
        <Typography variant="h6" color="text.secondary" align="center">
          Loading your profile...
        </Typography>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <BackButton />
        </Box>

        {/* Header Section - Similar to Customer Management */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#333', mb: 1 }}>
                User Profile
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage your profile information, documents, and account settings
              </Typography>
            </Box>
            {/* <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchUserProfile}
                sx={{ borderRadius: 1 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditProfileOpen(true)}
                sx={{ borderRadius: 1 }}
              >
                Edit Profile
              </Button>
            </Box> */}
          </Box>

          {/* Stats Cards - Similar to Customer Management */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'left', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Profile Status
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                  Active
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'left', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Documents
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  {stats.totalDocs}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'left', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Expiring Soon
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#ed6c02' }}>
                  {stats.soonToExpire}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'left', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Assigned Importers
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                  {user?.ie_code_assignments?.length || 0}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Tabs Section */}
        <Paper sx={{ width: '100%', borderRadius: 1, border: '1px solid #e0e0e0' }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: '1px solid #e0e0e0', px: 2 }}
          >
            <Tab label="Profile Information" />
            <Tab label="Documents" />
            <Tab label="Assigned Importers" />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {/* Profile Information Tab */}
            {tabValue === 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 600, width: '200px' }}>Field</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '100px' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          Full Name
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {user?.name || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label="Active" size="small" {...chipActive} />
                      </TableCell>
                    </TableRow>
                    <TableRow hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem', bgcolor: 'success.main' }}>
                            <EmailIcon fontSize="small" />
                          </Avatar>
                          Email Address
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {user?.email || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label="Verified" size="small" {...chipActive} />
                      </TableCell>
                    </TableRow>
                    <TableRow hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem', bgcolor: 'warning.main' }}>
                            <BusinessIcon fontSize="small" />
                          </Avatar>
                          Role
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {user?.role?.replace("_", " ").toUpperCase() || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label="Active" size="small" {...chipActive} />
                      </TableCell>
                    </TableRow>
                    {/* <TableRow>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Assigned Importers
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                        {user?.ie_code_assignments?.length || 0}
                      </Typography>
                      </TableCell>
                    </TableRow> */}
                    <TableRow hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem', bgcolor: 'info.main' }}>
                            <LoginIcon fontSize="small" />
                          </Avatar>
                          Last Login
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatDate(user?.lastLogin)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label="Recent" size="small" {...chipActive} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Documents Tab */}
            {tabValue === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <TextField
                    size="small"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                    }}
                    sx={{ width: 300 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddDocumentOpen(true)}
                  >
                    Add Document
                  </Button>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Document Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Upload Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Expiration Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Reminder</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {user?.documents?.length > 0 ? (
                        user.documents
                          .filter(doc => doc.title.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((doc) => (
                            <TableRow key={doc._id} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'primary.light', color: 'primary.dark' }}>
                                    {doc.title.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {doc.title}
                                    </Typography>
                                    {/* <Typography variant="caption" color="text.secondary">
                                      {doc._id.substring(0, 8)}
                                    </Typography> */}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>{formatDate(doc.uploadDate)}</TableCell>
                              <TableCell>{formatDate(doc.expirationDate)}</TableCell>
                              <TableCell>{getExpirationChip(doc.expirationDate)}</TableCell>
                              <TableCell>
                                {doc.reminderDays ? (
                                  <Chip
                                    label={`${doc.reminderDays} days`}
                                    size="small"
                                    variant="outlined"
                                    color="info"
                                  />
                                ) : (
                                  <Typography variant="body2" color="text.secondary">None</Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, doc)}>
                                  <MoreVertIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              No documents uploaded yet.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Assigned Importers Tab */}
            {tabValue === 2 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Importer Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>IE Code</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Assigned Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {user?.ie_code_assignments?.length > 0 ? (
                      user.ie_code_assignments.map((assignment, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'secondary.light', color: 'secondary.dark' }}>
                                {assignment.importer_name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {assignment.importer_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {assignment.ie_code_no}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {assignment.ie_code_no}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label="Active" size="small" {...chipActive} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              N/A
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No importers assigned
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem
            component="a"
            href={selectedDoc?.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleMenuClose}
          >
            <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
            View
          </MenuItem>
          <MenuItem
            component="a"
            href={selectedDoc?.url}
            download
            onClick={handleMenuClose}
          >
            <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
            Download
          </MenuItem>
          <Divider />
          <MenuItem 
            onClick={() => handleDeleteDocument(selectedDoc?._id)} 
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Edit Profile Dialog */}
        {/* <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: "bold" }}>Edit Profile</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Full Name"
              fullWidth
              variant="outlined"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              sx={{ mt: 1 }}
            />
            <TextField
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              variant="outlined"
              value={editedEmail}
              onChange={(e) => setEditedEmail(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditProfileOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProfile} variant="contained">Save Changes</Button>
          </DialogActions>
        </Dialog> */}

        {/* Add Document Dialog */}
        <Dialog open={addDocumentOpen} onClose={() => setAddDocumentOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Add New Document</DialogTitle>
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
              <Typography variant="body2" color="text.secondary" gutterBottom>Upload File</Typography>
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
              renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} />}
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
          <DialogActions>
            <Button onClick={() => setAddDocumentOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDocument} variant="contained">Add Document</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default UserProfile;