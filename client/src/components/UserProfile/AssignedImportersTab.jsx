import React from "react";

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
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Importer Name</th>
            <th>IE Code</th>
            <th>AEO Status</th>
            <th style={{ textAlign: "right" }}>Last Verified</th>
          </tr>
        </thead>
        <tbody>
          {user?.ie_code_assignments?.length > 0 ? (
            user.ie_code_assignments.map((assignment, index) => {
              const kycData = kycSummary?.kyc_summaries?.find(
                (k) => k.ie_code_no === assignment.ie_code_no
              );

              return (
                <tr key={index}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          marginRight: "10px",
                          backgroundColor: "#f1f5f9",
                          color: "#64748B",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {assignment.importer_name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>
                        {assignment.importer_name}
                      </span>
                    </div>
                  </td>
                  <td>{assignment.ie_code_no}</td>
                  <td>
                    {kycData ? (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: kycData.has_aeo_data
                            ? "#dcfce7"
                            : "#f1f5f9",
                          color: kycData.has_aeo_data ? "#16A34A" : "#64748B",
                        }}
                      >
                        {kycData.has_aeo_data ? "Verified" : "Not Found"}
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: "#ffedd5",
                          color: "#F97316",
                        }}
                      >
                        Pending
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span style={{ color: "#64748B" }}>
                      {kycData?.last_verification
                        ? formatDate(kycData.last_verification)
                        : "Never"}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={4}
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "#64748B",
                }}
              >
                No importers assigned
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AssignedImportersTab;
