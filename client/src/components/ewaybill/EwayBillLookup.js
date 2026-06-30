import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "./EwayBillLookup.css";

const EwayBillLookup = () => {
  const [activeTab, setActiveTab] = useState("gstin");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  // Form states
  const [gstinSearch, setGstinSearch] = useState("");
  const [transporterSearch, setTransporterSearch] = useState("");
  const [hsnSearch, setHsnSearch] = useState("");
  const [gstinStatusSearch, setGstinStatusSearch] = useState("");
  const [docNoSearch, setDocNoSearch] = useState("");
  const [docTypeSearch, setDocTypeSearch] = useState("Tax Invoice");
  // User GSTIN (would normally come from auth context)
  const userGstin = process.env.REACT_APP_DEFAULT_GSTIN ;

  const handleSearch = async (type, searchValue) => {
    if (!searchValue.trim()) {
      Swal.fire("Error", "Please enter a search value", "error");
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      let endpoint = "";
      let payload = { userGstin };
      
      switch (type) {
        case "gstin":
          endpoint = "/lookup/gstin";
          payload.gstin = searchValue;
          break;
        case "transporter":
          endpoint = "/lookup/transporter";
          payload.transporterId = searchValue;
          break;
        case "hsn":
          endpoint = "/lookup/hsn";
          payload.hsnCode = searchValue;
          break;
        case "gstin-status":
          endpoint = "/lookup/gstin-status";
          payload.gstin = searchValue;
          break;
        case "by-document":
          if (!docNoSearch) {
              Swal.fire("Error", "Please enter Document Number", "error");
              setLoading(false);
              return;
          }
          endpoint = "/lookup/by-document";
          payload.docNo = docNoSearch;
          payload.docType = docTypeSearch;
          break;
        case "by-document":
          if (!docNoSearch) {
              Swal.fire("Error", "Please enter Document Number", "error");
              setLoading(false);
              return;
          }
          endpoint = "/lookup/by-document";
          payload.docNo = docNoSearch;
          payload.docType = docTypeSearch;
          break;
        default:
          return;
      }
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill${endpoint}`,
        { params: payload }
      );
      
      if (response.data.success) {
        setResult(response.data.data);
      }
    } catch (error) {
      console.error("Lookup error:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to fetch details",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderResultCard = () => {
    if (!result) return null;
    
    return (
      <div className="lookup-result-card">
        <h4 className="result-title">
          <span className="result-icon">✅</span>
          Search Result
        </h4>
        <div className="result-content">
          {typeof result === "object" ? (
            <table className="result-table">
              <tbody>
                {Object.entries(result).map(([key, value]) => (
                  <tr key={key}>
                    <td className="result-key">{formatKey(key)}</td>
                    <td className="result-value">
                      {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="result-raw">{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      </div>
    );
  };

  const formatKey = (key) => {
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  const tabs = [
    { id: "gstin", label: "🏢 GSTIN Details", icon: "🔍" },
    { id: "transporter", label: "🚛 Transporter", icon: "🚚" },
    { id: "hsn", label: "📦 HSN Code", icon: "📋" },
    { id: "gstin-status", label: "⚠️ Block Status", icon: "🔒" },
    { id: "by-document", label: "📜 By Document", icon: "📄" },
  ];

  return (
    <div className="lookup-container">
      <div className="lookup-header">
        <h2>🔍 Search & Lookup</h2>
        <p className="lookup-subtitle">
          Search for GSTIN, Transporter, HSN details from the E-Way Bill portal
        </p>
      </div>

      <div className="lookup-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`lookup-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab.id);
              setResult(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="lookup-content">
        {/* GSTIN Details Search */}
        {activeTab === "gstin" && (
          <div className="lookup-form">
            <div className="form-group">
              <label>Enter GSTIN Number</label>
              <div className="search-input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., 24AADCS0472N1ZY"
                  value={gstinSearch}
                  onChange={(e) => setGstinSearch(e.target.value.toUpperCase())}
                  maxLength={15}
                />
                <button
                  className="btn btn-primary search-btn"
                  onClick={() => handleSearch("gstin", gstinSearch)}
                  disabled={loading}
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
              <small className="form-hint">
                Get complete details of a business entity from their GSTIN
              </small>
            </div>
          </div>
        )}

        {/* Transporter Details Search */}
        {activeTab === "transporter" && (
          <div className="lookup-form">
            <div className="form-group">
              <label>Enter Transporter ID</label>
              <div className="search-input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., 24AADCS0472N1ZY"
                  value={transporterSearch}
                  onChange={(e) => setTransporterSearch(e.target.value.toUpperCase())}
                  maxLength={15}
                />
                <button
                  className="btn btn-primary search-btn"
                  onClick={() => handleSearch("transporter", transporterSearch)}
                  disabled={loading}
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
              <small className="form-hint">
                Get transporter details registered on E-Way Bill portal
              </small>
            </div>
          </div>
        )}

        {/* HSN Details Search */}
        {activeTab === "hsn" && (
          <div className="lookup-form">
            <div className="form-group">
              <label>Enter HSN Code</label>
              <div className="search-input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., 84713020"
                  value={hsnSearch}
                  onChange={(e) => setHsnSearch(e.target.value)}
                  maxLength={8}
                />
                <button
                  className="btn btn-primary search-btn"
                  onClick={() => handleSearch("hsn", hsnSearch)}
                  disabled={loading}
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
              <small className="form-hint">
                Get HSN/SAC code description and tax rates
              </small>
            </div>
          </div>
        )}

        {/* GSTIN Block Status Search */}
        {activeTab === "gstin-status" && (
          <div className="lookup-form">
            <div className="form-group">
              <label>Check GSTIN Block Status</label>
              <div className="search-input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., 24AADCS0472N1ZY"
                  value={gstinStatusSearch}
                  onChange={(e) => setGstinStatusSearch(e.target.value.toUpperCase())}
                  maxLength={15}
                />
                <button
                  className="btn btn-warning search-btn"
                  onClick={() => handleSearch("gstin-status", gstinStatusSearch)}
                  disabled={loading}
                >
                  {loading ? "Checking..." : "Check Status"}
                </button>
              </div>
              <small className="form-hint">
                Check if a GSTIN is blocked/unblocked for E-Way Bill generation
              </small>
            </div>
          </div>
        )}

        {/* Document Search */}
        {activeTab === "by-document" && (
          <div className="lookup-form">
            <div className="form-group">
                <label>Document Number & Type</label>
                <div className="search-input-group" style={{ gap: "10px" }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. IMP/23/035"
                        value={docNoSearch}
                        onChange={(e) => setDocNoSearch(e.target.value)}
                    />
                    <select 
                        className="form-control"
                        value={docTypeSearch} 
                        onChange={(e) => setDocTypeSearch(e.target.value)}
                        style={{ maxWidth: "150px" }}
                    >
                        <option value="Tax Invoice">Tax Invoice</option>
                        <option value="Bill of Supply">Bill of Supply</option>
                        <option value="Delivery Challan">Delivery Challan</option>
                         <option value="Bill of Entry">Bill of Entry</option>
                    </select>
                    <button
                        className="btn btn-primary search-btn"
                        onClick={() => handleSearch("by-document", docNoSearch)}
                        disabled={loading}
                    >
                        {loading ? "Searching..." : "Search"}
                    </button>
                </div>
                <small className="form-hint">
                    Get E-Way Bill details by Document Number and Type (Consignor Only)
                </small>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="lookup-loading">
            <div className="spinner"></div>
            <p>Fetching details from E-Way Bill portal...</p>
          </div>
        )}

        {/* Results */}
        {renderResultCard()}
      </div>
    </div>
  );
};

export default EwayBillLookup;
