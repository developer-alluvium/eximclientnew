import React from "react";
import {
  Person,
  Email,
  Business,
  Login,
  CheckCircle,
  Schedule,
  VerifiedUser,
} from "@mui/icons-material";
// Note: We are keeping MUI Icons for now as they are standard SVG icons,
// but removing MUI components (Box, Paper, Typography, etc.)

const ProfileSummaryCard = ({ user }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="profile-summary-card">
      <div className="profile-avatar">
        {user?.name ? user.name.charAt(0).toUpperCase() : <Person />}
      </div>

      <h2 className="profile-name">{user?.name || "User Name"}</h2>
      <div className="profile-role">
        {user?.role?.replace("_", " ") || "Role"}
      </div>

      <div className="profile-details">
        <div className="detail-item">
          <span className="label">Email</span>
          <span className="value">{user?.email || "N/A"}</span>
        </div>

        <div className="detail-item">
          <span className="label">Status</span>
          <span
            className="value"
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            {user?.emailVerified ? (
              <>
                <CheckCircle style={{ fontSize: 16, color: "#16A34A" }} />
                <span style={{ color: "#16A34A" }}>Verified</span>
              </>
            ) : (
              <>
                <Schedule style={{ fontSize: 16, color: "#EA580C" }} />
                <span style={{ color: "#EA580C" }}>Pending</span>
              </>
            )}
          </span>
        </div>

        <div className="detail-item">
          <span className="label">Last Login</span>
          <span className="value">{formatDate(user?.lastLogin)}</span>
        </div>

        {/* Add more summary details if needed, e.g. Phone, Location if available in user object */}
      </div>
    </div>
  );
};

export default ProfileSummaryCard;
