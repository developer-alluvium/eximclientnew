import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "./EwayBillReports.css";

const EwayBillReports = () => {
  const [activeTab, setActiveTab] = useState("by-date");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  
  // Form states
  const [reportDate, setReportDate] = useState("");
  const [consignorDocNo, setConsignorDocNo] = useState("");
  const [consignorDocType, setConsignorDocType] = useState("Tax Invoice");
  const [transporterId, setTransporterId] = useState("");
  const [transporterDate, setTransporterDate] = useState("");
  const [transporterType, setTransporterType] = useState("assigned_part_a");
  const [otherPartyDate, setOtherPartyDate] = useState("");
  const [rejectedDate, setRejectedDate] = useState("");
  const [cewbNo, setCewbNo] = useState("");
  
  // User GSTIN
  const userGstin = process.env.REACT_APP_DEFAULT_GSTIN ;

  const handleFetchReport = async (type, params = {}) => {
    setLoading(true);
    setResults([]);
    
    try {
      let endpoint = "";
      let payload = { userGstin, ...params };
      
      switch (type) {
        case "by-date":
          if (!params.date) {
            Swal.fire("Error", "Please select a date", "error");
            setLoading(false);
            return;
          }
          endpoint = "/reports/by-date";
          break;
        case "by-consignor":
          if (!params.docNo) {
            Swal.fire("Error", "Please enter Document Number", "error");
            setLoading(false);
            return;
          }
          endpoint = "/reports/by-consignor";
          break;
        case "other-party":
          endpoint = "/reports/other-party";
          break;
        case "rejected":
          endpoint = "/reports/rejected";
          break;
        case "consolidated":
          if (!params.cewbNo) {
            Swal.fire("Error", "Please enter Consolidated EWB Number", "error");
            setLoading(false);
            return;
          }
          endpoint = "/reports/consolidated-details";
          break;
        case "by-transporter":
          if (!params.transporterId) {
            Swal.fire("Error", "Please enter Transporter ID", "error");
            setLoading(false);
            return;
          }
          endpoint = "/reports/by-transporter";
          break;
        default:
          return;
      }
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill${endpoint}`,
        { params: payload }
      );
      
      if (response.data.success) {
        const data = response.data.data;
        if (Array.isArray(data)) {
          setResults(data);
        } else if (typeof data === "object") {
          setResults([data]);
        }
        
        if ((!data || (Array.isArray(data) && data.length === 0))) {
          Swal.fire("Info", "No records found", "info");
        }
      }
    } catch (error) {
      console.error("Report fetch error:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to fetch report",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("cancel")) return "sync-badge status-cancelled";
    if (s.includes("reject")) return "sync-badge status-rejected";
    if (s.includes("expire")) return "sync-badge status-expired";
    return "sync-badge status-generated";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN");
    } catch {
      return dateStr;
    }
  };

  const tabs = [
    { id: "by-date", label: "By Date", description: "E-Way Bills generated on a specific date" },
    { id: "by-consignor", label: "By Consignor", description: "E-Way Bills by consignor GSTIN" },
    { id: "other-party", label: "Other Party", description: "E-Way Bills where you are consignee/transporter" },
    { id: "rejected", label: "Rejected", description: "E-Way Bills rejected by others" },
    { id: "consolidated", label: "CEWB Details", description: "Consolidated E-Way Bill details" },
    { id: "by-transporter", label: "By Transporter", description: "E-Way Bills assigned to transporter" },
  ];

  return (
    <div className="reports-container">
      <div className="form-section" style={{ marginBottom: '20px' }}>
        <div className="section-body" style={{ padding: '0 8px' }}>
          <div className="ewb-tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`ewb-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab.id);
              setResults([]);
            }}
            title={tab.description}
          >
            {tab.label}
          </button>
        ))}
          </div>
        </div>
      </div>

      <div className="reports-content">
        {/* By Date Report */}
        {activeTab === "by-date" && (
          <div className="form-section">
            <h3 className="blue-dot">Fetch by Date</h3>
            <div className="section-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Select Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </div>
                <div className="form-actions-inline" style={{ alignSelf: 'flex-end', marginBottom: '10px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleFetchReport("by-date", { date: reportDate })}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Fetch Report"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* By Consignor Report (Now By Document) */}
        {activeTab === "by-consignor" && (
          <div className="form-section">
            <h3 className="blue-dot">Lookup by Document</h3>
            <div className="section-body">
              <div className="form-row three-cols">
                <div className="form-group">
                  <label className="form-label">Document Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., IMP/23/035"
                    value={consignorDocNo}
                    onChange={(e) => setConsignorDocNo(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Document Type</label>
                  <select
                    className="form-select"
                    value={consignorDocType}
                    onChange={(e) => setConsignorDocType(e.target.value)}
                  >
                      <option value="Tax Invoice">Tax Invoice</option>
                      <option value="Bill of Supply">Bill of Supply</option>
                      <option value="Delivery Challan">Delivery Challan</option>
                      <option value="Bill of Entry">Bill of Entry</option>
                  </select>
                </div>
                <div className="form-actions-inline" style={{ alignSelf: 'flex-end', marginBottom: '12px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleFetchReport("by-consignor", { 
                      docNo: consignorDocNo, 
                      docType: consignorDocType 
                    })}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Fetch EWB"}
                  </button>
                </div>
              </div>
              <small className="form-hint" style={{ color: '#64748b', fontStyle: 'italic', display: 'block', marginTop: '6px' }}>Lookup E-Way Bill generated by Consignor using Document Number.</small>
            </div>
          </div>
        )}

        {/* Other Party Report */}
        {activeTab === "other-party" && (
          <div className="form-section">
            <h3 className="green-dot">Inward / Other Party EWBs</h3>
            <div className="section-body">
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                   <p className="form-description" style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
                      View E-Way Bills where your GSTIN appears as consignee or transporter
                    </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Fetch Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={otherPartyDate}
                    onChange={(e) => setOtherPartyDate(e.target.value)}
                  />
                </div>
                <div className="form-actions-inline" style={{ alignSelf: 'flex-end', marginBottom: '12px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleFetchReport("other-party", { date: otherPartyDate })}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Fetch Report"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejected Report */}
        {activeTab === "rejected" && (
          <div className="form-section">
            <h3 className="amber-dot">Rejected by Consignees</h3>
            <div className="section-body">
              <div className="form-row">
                 <div className="form-group" style={{ flex: 1 }}>
                    <p className="form-description" style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
                      View E-Way Bills that have been rejected by consignees
                    </p>
                 </div>
                 <div className="form-group">
                  <label className="form-label">Rejected On</label>
                  <input
                    type="date"
                    className="form-input"
                    value={rejectedDate}
                    onChange={(e) => setRejectedDate(e.target.value)}
                  />
                </div>
                <div className="form-actions-inline" style={{ alignSelf: 'flex-end', marginBottom: '12px' }}>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleFetchReport("rejected", { date: rejectedDate })}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Fetch Rejected"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Consolidated EWB Details */}
        {activeTab === "consolidated" && (
          <div className="report-form">
            <div className="form-row">
              <div className="form-group">
                <label>Consolidated E-Way Bill Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., 123456789012"
                  value={cewbNo}
                  onChange={(e) => setCewbNo(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => handleFetchReport("consolidated", { cewbNo })}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Details"}
              </button>
            </div>
          </div>
        )}

        {/* By Transporter Report */}
        {activeTab === "by-transporter" && (
          <div className="form-section">
            <h3 className="purple-dot">Transporter Operations</h3>
            <div className="section-body">
              <div className="form-row four-cols">
                <div className="form-group">
                  <label className="form-label">Transporter ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., 24AADCS0472N1ZY"
                    value={transporterId}
                    onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                    maxLength={15}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={transporterDate}
                    onChange={(e) => setTransporterDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Report Type</label>
                  <select
                    className="form-select"
                    value={transporterType}
                    onChange={(e) => setTransporterType(e.target.value)}
                  >
                    <option value="assigned_part_a">Assigned to me (Part A)</option>
                    <option value="generated">Generated by me</option>
                    <option value="rejected">Rejected by me</option>
                    <option value="assigned_part_b">Assigned to me (Part B)</option>
                  </select>
                </div>
                <div className="form-actions-inline" style={{ alignSelf: 'flex-end', marginBottom: '12px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleFetchReport("by-transporter", { 
                      transporterId, 
                      date: transporterDate,
                      type: transporterType
                    })}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Fetch"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="report-loading">
            <div className="spinner"></div>
            <p>Fetching data from E-Way Bill portal...</p>
          </div>
        )}

        {/* Results Table */}
        {!loading && results.length > 0 && (
          <div className="form-section ewb-results-section">
            <h3 className="green-dot">Report Results ({results.length} records)</h3>
            <div className="section-body no-padding">
              <div className="ewb-table-wrap">
                <table className="ewb-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>EWB No</th>
                      <th>Date</th>
                      <th>Consignor</th>
                      <th>Consignee</th>
                      <th>Valid Upto</th>
                      <th>Status</th>
                      <th className="amount">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((item, index) => (
                      <tr key={index} className="ewb-row">
                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                        <td className="ewb-td-no">{item.ewbNo || item.ewayBillNo || item.eway_bill_number || "-"}</td>
                        <td>{formatDate(item.ewbDate || item.ewayBillDate || item.docDate)}</td>
                        <td className="ewb-td-name" title={item.consignorName || item.fromTraderName}>{item.consignorName || item.fromTraderName || "-"}</td>
                        <td className="ewb-td-name" title={item.consigneeName || item.toTraderName}>{item.consigneeName || item.toTraderName || "-"}</td>
                        <td>{formatDate(item.validUpto || item.validUpTo)}</td>
                        <td>
                          <span className={getStatusBadgeClass(item.status || item.ewbStatus || "Generated")}>
                            {item.status || item.ewbStatus || "Active"}
                          </span>
                        </td>
                        <td className="amount">₹{(item.totalValue || item.totInvValue || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EwayBillReports;
