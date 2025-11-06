// components/UserProfile/AssignedImportersTab.jsx
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Typography,
  Box,
  Chip,
} from "@mui/material";

const AssignedImportersTab = ({ user, kycSummary }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: "#f8f9fa" }}>
            <TableCell sx={{ fontWeight: 600 }}>Importer Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>IE Code</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>AEO Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Last Verified</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {user?.ie_code_assignments?.length > 0 ? (
            user.ie_code_assignments.map((assignment, index) => {
              const kycData = kycSummary?.kyc_summaries?.find(
                (k) => k.ie_code_no === assignment.ie_code_no
              );

              return (
                <TableRow key={index} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          mr: 1.5,
                          bgcolor: "secondary.light",
                        }}
                      >
                        {assignment.importer_name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {assignment.importer_name}
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
                    {kycData ? (
                      <Chip
                        label={
                          kycData.has_aeo_data ? "Verified" : "Not Found"
                        }
                        color={kycData.has_aeo_data ? "success" : "default"}
                        size="small"
                      />
                    ) : (
                      <Chip label="Pending" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {kycData?.last_verification
                        ? formatDate(kycData.last_verification)
                        : "Never"}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
                  No importers assigned
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AssignedImportersTab;