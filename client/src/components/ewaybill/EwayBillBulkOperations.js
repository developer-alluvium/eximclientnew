import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "../../styles/ewaybill.scss";
import "./EwayBillReports.css"; // Reuse report styles

const EwayBillBulkOperations = ({ onSuccess, preFillData }) => {
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [results, setResults] = useState(null);
  const [polling, setPolling] = useState(false);
  const [ewayBillNoInput, setEwayBillNoInput] = useState(""); // New state for individual EWB input

  const [action, setAction] = useState("eway"); // Default action: 'eway' (Generate)

  const actionOptions = [
      { value: "eway", label: "Generate E-Way Bill" },
      { value: "update_partb", label: "Update Part-B" },
      { value: "extend", label: "Extend Validity" },
      { value: "update_trans", label: "Update Transporter" },
      { value: "cancel_eway", label: "Cancel E-Way Bill" },
      // { value: "get_eway", label: "Get E-Way Bill Details" }
  ];

  // Dynamic sample data based on action
  const getSampleData = (act) => {
    const commonFields = { userGstin: "24ANGPR7652E1ZV" };
    
    switch (act) {
      case "update_partb":
        return [
          {
            ...commonFields,
            "ewayBillNo": 123456789012,
            "fromPlace": "Dehradun",
            "fromState": 5,
            "transDocNo": "TR123",
            "transDocDate": "08/02/2026",
            "transMode": 1,
            "vehicleNo": "UK07AB1234",
            "reasonCode": "2", 
            "reasonRem": "Vehicle Breakdown"
          },
          {
             ...commonFields,
             "ewayBillNo": 123456789013,
             "fromPlace": "Mumbai",
             "fromState": 27,
             "transDocNo": "TR124",
             "transDocDate": "08/02/2026",
             "transMode": 1,
             "vehicleNo": "MH01XY9876",
             "reasonCode": "2", 
             "reasonRem": "Transshipment"
          }
        ];
      case "extend":
         return [
            {
               ...commonFields,
               "ewayBillNo": 123456789012,
               "transDocNo": "TR123",
               "transDocDate": "08/02/2026",
               "transMode": 1,
               "fromPlace": "Dehradun",
               "fromState": 5,
               "remainingDistance": 50,
               "vehicleNo": "UK07AB1234",
               "extnRsnCode": "2",
               "extnRemarks": "Natural Calamity"
            }
         ];
      case "update_trans":
          return [
              {
                  ...commonFields,
                  "ewayBillNo": 123456789012,
                  "transId": "05AAABC0181E1ZE",
                  "transName": "New Transporter Name"
              }
          ];
      case "cancel_eway":
          return [
              {
                  ...commonFields,
                  "ewayBillNo": 123456789012,
                  "cancelRsnCode": 2,
                  "cancelRmrk": "Data Entry Mistake"
              }
          ];
      case "eway":
      default:
        return [
          {
            ...commonFields,
            "supply_type": "outward",
            "sub_supply_type": "Others",
            "sub_supply_description": "Bulk demo operation",
            "document_type": "tax invoice",
            "document_number": "BULK-DOC-003",
            "document_date": "08/02/2026",
            "gstin_of_consignor": "24ANGPR7652E1ZV",
            "legal_name_of_consignor": "welton",
            "address1_of_consignor": "2ND CROSS NO 59 19 A",
            "address2_of_consignor": "GROUND FLOOR OSBORNE ROAD",
            "place_of_consignor": "Dehradun",
            "pincode_of_consignor": 248001,
            "state_of_consignor": "UTTARAKHAND",
            "actual_from_state_name": "UTTARAKHAND",
            "gstin_of_consignee": "05AAAAU6537D1ZO",
            "legal_name_of_consignee": "sthuthya",
            "address1_of_consignee": "Shree Nilaya",
            "address2_of_consignee": "Dasarahosahalli",
            "place_of_consignee": "Beml Nagar",
            "pincode_of_consignee": 248001,
            "state_of_supply": "UTTARAKHAND",
            "actual_to_state_name": "UTTARAKHAND",
            "total_invoice_value": 1180.00,
            "taxable_amount": 1000,
            "cgst_amount": 90,
            "sgst_amount": 90,
            "igst_amount": 0,
            "cess_amount": 0,
            "transporter_id": "05AAABC0181E1ZE",
            "transportation_mode": "road",
            "transportation_distance": "100",
            "vehicle_number": "PVC1234",
            "vehicle_type": "Regular",
            "generate_status": 1,
            "data_source": "erp",
            "itemList": [
              {
                "product_name": "Product 1",
                "product_description": "Description",
                "hsn_code": "1001",
                "quantity": 1,
                "unit_of_product": "BOX",
                "cgst_rate": 9,
                "sgst_rate": 9,
                "igst_rate": 0,
                "cess_rate": 0,
                "taxable_amount": 1000
              }
            ]
          }
        ];
    }
  };

  // Handle pre-filled data from other tabs (Smart Context)
  useEffect(() => {
    if (preFillData && preFillData.action && preFillData.data) {
        setAction(preFillData.action);
        setJsonInput(JSON.stringify(preFillData.data, null, 2));
        Swal.fire({
            title: "Context Loaded",
            text: `Loaded ${preFillData.data.length} items for ${actionOptions.find(a => a.value === preFillData.action)?.label}`,
            icon: "info",
            toast: true,
            position: 'top-end',
            timer: 3000
        });
    }
  }, [preFillData]);

  const handleAddItem = () => {
    if (!ewayBillNoInput) return;
    
    let currentData = [];
    try {
      currentData = jsonInput ? JSON.parse(jsonInput) : [];
      if (!Array.isArray(currentData)) currentData = [];
    } catch (e) {
      currentData = [];
    }

    const sample = getSampleData(action)[0];
    const newItem = { ...sample, ewayBillNo: ewayBillNoInput };
    
    setJsonInput(JSON.stringify([...currentData, newItem], null, 2));
    setEwayBillNoInput("");
    Swal.fire({
      icon: 'success',
      title: 'Added to List',
      text: `E-Way Bill ${ewayBillNoInput} added to bulk operation list.`,
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false
    });
  };

  const handleLoadSample = () => {
    const samples = getSampleData(action);
    setJsonInput(JSON.stringify(samples, null, 2));
    Swal.fire({
        title: "Sample Loaded", 
        text: `Loaded sample data for ${actionOptions.find(a => a.value === action)?.label}`,
        icon: "info",
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
    });
  };

  const handleGenerate = async () => {
    try {
      if (!jsonInput.trim()) {
        Swal.fire("Error", "Please enter JSON data", "error");
        return;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(jsonInput);
      } catch (e) {
        Swal.fire("Error", "Invalid JSON format", "error");
        return;
      }

      // Handle case where user might have pasted the full wrapper { ewayBillList: [...] }
      let ewayBillList = parsedData;
      if (!Array.isArray(parsedData) && parsedData.ewayBillList) {
          ewayBillList = parsedData.ewayBillList;
      }
      
      // Support for single object
      if (!Array.isArray(ewayBillList) && typeof ewayBillList === 'object') {
         ewayBillList = [ewayBillList];
      }

      if (!Array.isArray(ewayBillList)) {
         Swal.fire("Error", "JSON must be an array of E-Way Bills or an object with ewayBillList array", "error");
         return;
      }

      setLoading(true);
      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/bulk/generate`, {
        ewayBillList,
        action // Pass selected action
      });

      if (response.data.success) {
        // If requestId provided, start polling
        const reqId = response.data.data.requestId;
        if (reqId) {
             setRequestId(reqId);
             setPolling(true);
             Swal.fire("Success", `Bulk Request Initiated. Request ID: ${reqId}`, "success");
        } else {
             // Direct results?
             setResults(response.data.data);
             Swal.fire("Success", "Bulk Generation Completed", "success");
        }
      } else {
          Swal.fire("Error", response.data.message || "Failed", "error");
      }

    } catch (error) {
      console.error("Bulk Generation Error:", error);
      Swal.fire("Error", error.response?.data?.message || "Failed to initiate bulk generation", "error");
    } finally {
      if (!polling) setLoading(false); // keep loading if polling starts? No, handle polling sep.
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (polling && requestId) {
       interval = setInterval(async () => {
           try {
               const userGstin = process.env.REACT_APP_USER_GSTIN || "24ANGPR7652E1ZV"; // Fallback or from env
               const response = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/bulk/response/${requestId}`, {
                   params: { userGstin }
               });
               
               // Check if processing is complete
               // The API wrapper returns data directly
               const data = response.data.data;
               
               // Check status if available (e.g. status 1 = success, 0 = pending/error)
               // OR if 'results' array is present
               const isComplete = data && (
                   Array.isArray(data) || 
                   (data.results && Array.isArray(data.results)) ||
                   data.status === 1 || 
                   data.ewbNo
               ); 
               
               if (response.data.success && isComplete) {
                   setResults(data);
                   setPolling(false);
                   clearInterval(interval);
                   Swal.fire({
                       title: "Completed", 
                       text: "Bulk processing completed", 
                       icon: "success",
                       showCancelButton: true,
                       confirmButtonText: "View List",
                       cancelButtonText: "Stay Here"
                   }).then((result) => {
                       if (result.isConfirmed && onSuccess) {
                           onSuccess();
                       }
                   });
               }
           } catch (error) {
               console.error("Polling error", error);
               // Don't stop polling on transient errors unless 404/400
               if (error.response && error.response.status >= 400) {
                   setPolling(false);
                   clearInterval(interval);
                   Swal.fire("Error", "Failed to fetch bulk status", "error");
               }
           }
       }, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [polling, requestId, onSuccess]);

  return (
    <div className="reports-container">
    <div className="form-section">
       <h3 className="purple-dot">Bulk E-Way Bill Operations</h3>
       <div className="section-body">
         <p className="reports-subtitle" style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '15px' }}>
           Generate or update multiple E-Way Bills in a single request
         </p>

      <div className="reports-content">
          <div className="form-row">
              <div className="form-group">
                  <label className="form-label">Bulk Operation Type</label>
                  <select 
              className="form-select"
              id="bulk-action" 
              value={action} 
              onChange={(e) => {
                setAction(e.target.value);
                setJsonInput(""); // Clear JSON when action changes
              }}
            >
              {actionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {action !== 'eway' && (
            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label" htmlFor="eway-bill-no-input">Add E-Way Bill Number to Bulk List</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="form-input"
                  id="eway-bill-no-input"
                  placeholder="Enter 12-digit EWB No"
                  value={ewayBillNoInput}
                  onChange={(e) => setEwayBillNoInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleAddItem}
                  disabled={!ewayBillNoInput || loading}
                  style={{ whiteSpace: 'nowrap', alignSelf: 'center', margin: 0 }}
                >
                  + Add to List
                </button>
              </div>
            </div>
          )}
        </div>
          <div className="form-row">
              <div className="form-group" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <label className="form-label">E-Way Bill JSON Data (List) or Upload File</label>
                    <div className="action-buttons">
                        <input
                            type="file"
                            id="bulk-json-upload"
                            accept=".json"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    try {
                                        const json = JSON.parse(event.target.result);
                                        setJsonInput(JSON.stringify(json, null, 2));
                                        Swal.fire({
                                            title: "File Loaded",
                                            text: `Successfully loaded ${file.name}`,
                                            icon: "success",
                                            toast: true,
                                            position: 'top-end',
                                            showConfirmButton: false,
                                            timer: 3000
                                        });
                                    } catch (err) {
                                        Swal.fire("Error", "Invalid JSON file", "error");
                                    }
                                };
                                reader.readAsText(file);
                                // Reset value so same file can be selected again if needed
                                e.target.value = '';
                            }}
                        />
                        <button 
                            className="btn btn-sm btn-outline-primary" 
                            style={{ marginRight: '8px' }}
                            onClick={() => document.getElementById('bulk-json-upload').click()}
                        >
                            📂 Upload JSON
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={handleLoadSample}>Load Sample</button>
                    </div>
                  </div>
                  <textarea 
                    className="form-input" 
                    rows="10" 
                    value={jsonInput} 
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='[ { "supplyType": "O", ... }, ... ]'
                    style={{ fontFamily: 'monospace', fontSize: '0.9rem', resize: 'vertical' }}
                  ></textarea>
                  {jsonInput && (
                      <div className="preview-stats" style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', textAlign: 'right' }}>
                          {(() => {
                              try {
                                  const parsed = JSON.parse(jsonInput);
                                  const list = Array.isArray(parsed) ? parsed : (parsed.ewayBillList || [parsed]);
                                  return <span>{Array.isArray(list) ? `${list.length} Items ready` : 'Invalid List'}</span>
                              } catch(e) { return <span>Invalid JSON</span> }
                          })()}
                      </div>
                  )}
              </div>
          </div>
          
          <div className="form-actions">
              <button 
                className="btn btn-primary" 
                onClick={handleGenerate} 
                disabled={loading || polling}
              >
                {polling ? <><span className="loading-spinner" style={{width: 16, height: 16, border: '2px solid white', marginRight: 8}}></span> Processing...</> : `Start Bulk ${actionOptions.find(a => a.value === action)?.label || "Operation"}`}
              </button>
          </div>

          {requestId && (
              <div className="status-badge active" style={{ marginTop: 16, padding: 12, fontSize: '1rem' }}>
                  Current Request ID: {requestId} {polling && "(Polling Status...)"}
              </div>
          )}
      </div>

      {results && (
        <div className="reports-content">
            <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Processing Results</h3>
                <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                        const list = Array.isArray(results) ? results : (results.results || []);
                        if (!list || list.length === 0) return;
                        
                        const headers = Object.keys(list[0]).join(",");
                        const csvContent = "data:text/csv;charset=utf-8," 
                            + headers + "\n"
                            + list.map(row => Object.values(row).map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(",")).join("\n");
                            
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `bulk_results_${requestId}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                >
                    📥 Export CSV
                </button>
            </div>
            {/* Render results table/list based on API response structure. */}
            <div className="table-responsive">
                {(() => {
                    const list = Array.isArray(results) ? results : (results.results || []);
                    if (!list || list.length === 0) return <pre>{JSON.stringify(results, null, 2)}</pre>; // Fallback

                    return (
                        <table className="ewb-table" style={{width: '100%', borderCollapse: 'collapse', marginTop: 10}}>
                            <thead>
                                <tr style={{background: '#f8f9fa', borderBottom: '2px solid #dee2e6'}}>
                                    <th style={{padding: 10, textAlign: 'left'}}>EWB No</th>
                                    <th style={{padding: 10, textAlign: 'left'}}>Date</th>
                                    <th style={{padding: 10, textAlign: 'left'}}>Valid Upto</th>
                                    <th style={{padding: 10, textAlign: 'left'}}>Vehicle</th>
                                    <th style={{padding: 10, textAlign: 'left'}}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((item, idx) => (
                                    <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                                        <td style={{padding: 10, fontWeight: 'bold'}}>
                                            {item.ewbNo ? <span style={{color: 'green'}}>{item.ewbNo}</span> : <span style={{color: 'red'}}>Failed</span>}
                                            {item.error && <div style={{fontSize: '0.8em', color: 'red'}}>{item.error}</div>}
                                        </td>
                                        <td style={{padding: 10}}>{item.ewayBillDate || '-'}</td>
                                        <td style={{padding: 10}}>{item.validUpto || '-'}</td>
                                        <td style={{padding: 10}}>{item.vehicleNo || '-'}</td>
                                        <td style={{padding: 10}}>
                                            {(item.printUrl || item.detailPrintUrl) && (
                                                <a 
                                                    href={item.printUrl || item.detailPrintUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="btn btn-sm btn-secondary"
                                                    style={{padding: '4px 8px', fontSize: '0.8em'}}
                                                >
                                                    Print
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    );
                })()}
                
                {onSuccess && (
                    <div style={{marginTop: 20, textAlign: 'center'}}>
                        <button className="btn btn-primary" onClick={onSuccess}>Go to E-Way Bills List</button>
                    </div>
                )}
            </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default EwayBillBulkOperations;
