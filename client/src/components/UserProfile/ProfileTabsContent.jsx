import React, { useState } from "react";
import DocumentsTab from "./DocumentsTab";
import AssignedImportersTab from "./AssignedImportersTab";
import { Description, People } from "@mui/icons-material";

const ProfileTabsContent = ({
  user,
  kycSummary,
  onRefreshProfile,
  onSetError,
  onSetSuccess,
}) => {
  const [activeTab, setActiveTab] = useState("documents");

  return (
    <div className="section-card">
      <div className="profile-tabs">
        <div className="tab-header">
          <button
            className={`tab-btn ${activeTab === "documents" ? "active" : ""}`}
            onClick={() => setActiveTab("documents")}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Description style={{ fontSize: 18 }} /> Documents
          </button>
          <button
            className={`tab-btn ${activeTab === "assigned" ? "active" : ""}`}
            onClick={() => setActiveTab("assigned")}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <People style={{ fontSize: 18 }} /> Assigned Importers
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "documents" && (
            <DocumentsTab
              user={user}
              onRefreshProfile={onRefreshProfile}
              onSetError={onSetError}
              onSetSuccess={onSetSuccess}
            />
          )}
          {activeTab === "assigned" && (
            <AssignedImportersTab user={user} kycSummary={kycSummary} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileTabsContent;
