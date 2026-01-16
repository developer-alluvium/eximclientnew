import React, { useState } from "react";
import { Card, Tabs } from "antd";
import { FileTextOutlined, TeamOutlined } from "@ant-design/icons";
import DocumentsTab from "./DocumentsTab";
import AssignedImportersTab from "./AssignedImportersTab";

const ProfileTabsContent = ({
  user,
  kycSummary,
  onRefreshProfile,
  onSetError,
  onSetSuccess,
}) => {
  const tabItems = [
    {
      key: "documents",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined style={{ fontSize: 16 }} />
          Documents
        </span>
      ),
      children: (
        <DocumentsTab
          user={user}
          onRefreshProfile={onRefreshProfile}
          onSetError={onSetError}
          onSetSuccess={onSetSuccess}
        />
      ),
    },
    {
      key: "assigned",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TeamOutlined style={{ fontSize: 16 }} />
          Assigned Importers
        </span>
      ),
      children: <AssignedImportersTab user={user} kycSummary={kycSummary} />,
    },
  ];

  return (
    <Card
      style={{
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
      bodyStyle={{ padding: 0 }}
    >
      <Tabs
        defaultActiveKey="documents"
        items={tabItems}
        style={{ padding: "16px 24px" }}
        tabBarStyle={{
          marginBottom: 0,
          borderBottom: "1px solid #f0f0f0",
        }}
      />
    </Card>
  );
};

export default ProfileTabsContent;
