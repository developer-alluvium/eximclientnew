import React, { useCallback, useMemo, useState } from "react";
import EditableDeliveryAddressCell from "../components/EditableDeliveryAddressCell"; // Adjust the path as needed
import { IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ScaleIcon from "@mui/icons-material/Scale";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ChecklistCell from "../components/ChecklistCell"; // Adjust the path as needed
// import NetWeightCell from "../components/Net weight/NetWeightCell"; // Adjust the path as needed
import DoPlanningToggle from "../components/DoPlanningToggle"; // Adjust the path as needed
import EditableTransporterCell from "../components/EditableTransporterCell";
import BENumberCell from"../components/BEnumberCell.jsx";
// Custom hook to manage job columns configuration with centered content
function useCustomerJobList() {
  const [containerModalOpen, setContainerModalOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [transporterModalOpen, setTransporterModalOpen] = useState(false);
  const [selectedTransporterContainer, setSelectedTransporterContainer] = useState(null);

  const handleContainerClick = useCallback((container) => {
    setSelectedContainer(container);
    setContainerModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setContainerModalOpen(false);
    setSelectedContainer(null);
  }, []);

  const handleTransporterClick = useCallback((container, jobId) => {
    setSelectedTransporterContainer({
      ...container,
      jobId: jobId
    });
    setTransporterModalOpen(true);
  }, []);

  const handleTransporterModalClose = useCallback(() => {
    setTransporterModalOpen(false);
    setSelectedTransporterContainer(null);
  }, []);
  const handleCopy = useCallback((event, text) => {
    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Text copied to clipboard:", text);
        })
        .catch((err) => {
          alert("Failed to copy text to clipboard.");
          console.error("Failed to copy:", err);
        });
    } else {
      // Fallback approach for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard using fallback method:", text);
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, []);

  // Common cell styling for centering content
  const centeredCellStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    textAlign: "center",
    height: "100%",
  };

  // Optimized columns array with centered content
  const columns = useMemo(
    () => [
      // {
      //   accessorKey: "free_time",
      //   header: "Free Time",
      //   size: 85,
      
      //   Cell: ({ cell }) => (
      //     <div  style={{
      //     ...centeredCellStyle, 
      //     wordWrap: 'break-word',
      //     whiteSpace: 'pre-wrap',
      //     maxWidth: '320px',
      //     padding: '8px',
      //     gap: '8px'
      //   }}>{cell.getValue() || "N/A"}</div>
      //   ),
      // },


    
    
{
  // Group 2: Exporter & Job Number
  accessorKey: "supplier_exporter",
  header: "Exporter, Job Number & Free Time",
  size: 140,
  Cell: ({ cell }) => {
    const { job_no, job_date, detailed_status, free_time } = cell.row.original;

    // Get color based on status
    let textColor = "inherit";
    let bgColor = "transparent";

    if (detailed_status === "Completed") {
      textColor = "#1a8917"; // Green for completed
      bgColor = "#e8f5e9";
    } else if (detailed_status === "In Progress") {
      textColor = "#b36200"; // Orange for in progress
      bgColor = "#fff3e0";
    }

    return (
      <div 
        style={{
          ...centeredCellStyle,
          wordWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          maxWidth: '320px',
          padding: '8px',
          gap: '8px'
        }}
      >
        <div>{cell.getValue() || "N/A"}</div>
        <div 
          style={{
            color: textColor,
            backgroundColor: bgColor,
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: "pointer",
            fontSize: '0.9em',
            fontWeight: 'bold'
          }}
        >
          {/* <div>{job_no}</div> */}
           <div key="job-number" style={{ 
          fontWeight: 'bold', 
          fontSize: '0.8rem', 
          border: '1px solid black', 
          padding: '2px 6px', 
          borderRadius: '4px',
          marginBottom: '4px',
          backgroundColor: '#f8f9fa',
          display: 'inline-block'
        }}>
          Job: {job_no}
        </div>
         <div key="free-time" style={{ 
          fontWeight: 'bold', 
          fontSize: '0.8rem', 
          border: '1px solid black', 
          padding: '2px 6px', 
          borderRadius: '4px',
          marginBottom: '4px',
          backgroundColor: '#f8f9fa',
          display: 'inline-block'
        }}>
          Free Time: {free_time}
        </div>
          
        </div>
      </div>
    );
  },
},
      
      // {
      //   accessorKey: "be_no",
      //   header: "BE Number & Date",
      //   size: 150,
      //   Cell: ({ cell }) => {
      //     const beNumber = cell?.getValue()?.toString();
      //     const rawBeDate = cell.row.original.be_date;
      //     const beDate = formatDate(rawBeDate);
      //     const { 
      //       processed_be_attachment = [], 
      //       ooc_copies = [], 
      //       gate_pass_copies = [] 
      //     } = cell.row.original;

      //     // Combine all documents with labels
      //     const allDocuments = [
      //       ...processed_be_attachment.map((url, index) => ({
      //         url,
      //         name: `Processed BE ${index + 1}`,
      //         type: 'processed_be'
      //       })),
      //       ...ooc_copies.map((url, index) => ({
      //         url,
      //         name: `OOC Copy ${index + 1}`,
      //         type: 'ooc'
      //       })),
      //       ...gate_pass_copies.map((url, index) => ({
      //         url,
      //         name: `Gate Pass ${index + 1}`,
      //         type: 'gate_pass'
      //       }))
      //     ];

      //     return (
      //       <div style={centeredCellStyle}>
      //         {beNumber && (
      //           <div
      //             style={{
      //               display: "flex",
      //               flexDirection: "column",
      //               gap: "4px",
      //               alignItems: "center",
      //             }}
      //           >
      //             <div
      //               style={{
      //                 display: "flex",
      //                 alignItems: "center",
      //                 gap: "4px",
      //               }}
      //             >
      //               <a
      //                 href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${beNumber}&BE_DT=${beDate}`}
      //                 target="_blank"
      //                 rel="noopener noreferrer"
      //               >
      //                 {beNumber}
      //               </a>
      //               <IconButton
      //                 size="small"
      //                 onClick={(event) => handleCopy(event, beNumber)}
      //                 sx={{ padding: "2px" }}
      //               >
      //                 <abbr title="Copy BE Number">
      //                   <ContentCopyIcon fontSize="inherit" />
      //                 </abbr>
      //               </IconButton>
      //             </div>
      //             <span>{beDate}</span>
                  
      //             {/* Documents section - matching esanchit format */}
      //             <div style={{ marginTop: "8px", width: "100%" }}>
      //               {allDocuments.length > 0 ? (
      //                 allDocuments.map((doc, index) => (
      //                   <div key={index} style={{ marginBottom: "4px" }}>
      //                     {doc.url ? (
      //                       <a
      //                         href={doc.url}
      //                         target="_blank"
      //                         rel="noopener noreferrer"
      //                         style={{ 
      //                           fontSize: "0.9rem",
      //                           color: "#007bff",
      //                           textDecoration: "underline"
      //                         }}
      //                       >
      //                         {doc.name}
      //                       </a>
      //                     ) : (
      //                       <span style={{ fontSize: "0.8em", color: "#999" }}>
      //                         {doc.name}
      //                       </span>
      //                     )}
      //                   </div>
      //                 ))
      //               ) : (
      //                 <span style={{ fontSize: "0.8em", color: "#999" }}>
      //                   No documents
      //                 </span>
      //               )}
      //             </div>
      //           </div>
      //         )}
      //       </div>
      //     );
      //   },
      // },
       {
        accessorKey: "be_no",
        header: "BE Number and Date",
        size: 200,
        Cell: ({ cell }) => <BENumberCell cell={cell} copyFn={handleCopy} />,
      },
     {
  accessorKey: "checklist",
  header: "Checklist/Shipping Line Invoices",
  enableSorting: false,
  size: 200,
  Cell: ({ cell }) => {
    const { do_shipping_line_invoice = [] } = cell.row.original;
    
    return (
      <div style={centeredCellStyle}>
        {/* Original ChecklistCell component */}
        <ChecklistCell {...{ cell }} />
        
        {/* DO Shipping Line Invoice Documents */}
        <div style={{ 
          marginTop: '12px',
          width: '100%',
          borderTop: '1px solid #e0e0e0',
          paddingTop: '8px'
        }}>
          <div style={{ 
            fontSize: '0.85rem',
            fontWeight: 'bold',
            marginBottom: '6px',
            color: '#333'
          }}>
            Shipping Line Invoices:
          </div>
          
          {do_shipping_line_invoice.length > 0 ? (
            do_shipping_line_invoice.map((invoice, index) => (
              <div key={index} style={{ 
                marginBottom: '6px',
                padding: '4px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}>
                {/* Document Name */}
                <div style={{ 
                  fontWeight: 'bold',
                  marginBottom: '2px',
                  color: '#1976d2'
                }}>
                  {invoice.document_name || `Invoice ${index + 1}`}
                </div>
                
                {/* Document URLs */}
                {Array.isArray(invoice.url) && invoice.url.length > 0 ? (
                  invoice.url.map((link, urlIndex) => (
                    <div key={urlIndex} style={{ marginBottom: '2px' }}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#007bff',
                          textDecoration: 'underline',
                          fontSize: '0.75rem'
                        }}
                      >
                        Document {urlIndex + 1}
                      </a>
                    </div>
                  ))
                ) : (
                  <div style={{ 
                    color: '#999',
                    fontSize: '0.75rem',
                    fontStyle: 'italic'
                  }}>
                    No document available
                  </div>
                )}
                
                {/* Status Indicators */}
                <div style={{ 
                  display: 'flex',
                  gap: '4px',
                  marginTop: '4px',
                  flexWrap: 'wrap'
                }}>
                  {invoice.is_draft && (
                    <span style={{
                      backgroundColor: '#fff3cd',
                      color: '#856404',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '0.65rem'
                    }}>
                      Draft
                    </span>
                  )}
                  
                  {invoice.is_final && (
                    <span style={{
                      backgroundColor: '#d1e7dd',
                      color: '#0f5132',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '0.65rem'
                    }}>
                      Final
                    </span>
                  )}
                  
                  {invoice.is_payment_made && (
                    <span style={{
                      backgroundColor: '#d1e7dd',
                      color: '#0f5132',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '0.65rem'
                    }}>
                      Paid
                    </span>
                  )}
                  
                  {invoice.is_payment_requested && !invoice.is_payment_made && (
                    <span style={{
                      backgroundColor: '#cff4fc',
                      color: '#055160',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '0.65rem'
                    }}>
                      Payment Requested
                    </span>
                  )}
                </div>
                
                {/* Payment Details */}
                {invoice.document_amount_details && (
                  <div style={{ 
                    fontSize: '0.7rem',
                    color: '#666',
                    marginTop: '2px'
                  }}>
                    Amount: {invoice.document_amount_details}
                  </div>
                )}
                
                {invoice.payment_mode && (
                  <div style={{ 
                    fontSize: '0.7rem',
                    color: '#666'
                  }}>
                    Mode: {invoice.payment_mode}
                    {invoice.wire_transfer_method && ` (${invoice.wire_transfer_method})`}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ 
              color: '#999',
              fontSize: '0.8rem',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '8px'
            }}>
              No shipping line invoices
            </div>
          )}
        </div>
      </div>
    );
  },
  sx: centeredCellStyle
},



      {
        accessorKey: "shipment_details",
        header: "Shipment & Commercial Details",
        size: 220,
        Cell: ({ cell }) => {
          const {
            awb_bl_no,
            awb_bl_date,
            gross_weight,
            job_net_weight,
            invoice_number,
            invoice_date,
            total_inv_value,
            inv_currency,
            loading_port,
            port_of_reporting,
            custom_house,
          } = cell.row.original;

          return (
            <div style={{ alignItems: "center" }}>
              <strong>BL:</strong> {awb_bl_no}
              {awb_bl_no && (
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, awb_bl_no)}
                  sx={{ padding: "2px" }}
                >
                  <abbr title="Copy BL Number">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              )}{" "}
              {awb_bl_date} <br />
              <strong>Gross Weight:</strong>{gross_weight || ""} kg<br />
              <strong>Net weight:</strong> {job_net_weight || ""} kg<br />
           
              <strong>Invoice:</strong> {invoice_number} {invoice_date} <br />
              <strong>Value:</strong> 
              {total_inv_value || ""} <br />
              <strong>POL:</strong>{" "}
              {loading_port ? loading_port.replace(/\(.*?\)\s*/, "") : ""}{" "}
              <br />
              <strong>POD:</strong>{" "}
              {port_of_reporting
                ? port_of_reporting.replace(/\(.*?\)\s*/, "")
                : ""}{" "}
              <br />
              <strong>ICD Port:</strong> {custom_house || "N/A"}
            </div>
          );
        },
      },

    

     {
  // Group 4: Container
  accessorKey: "container_details",
  header: "Container",
  size: 200,
  Cell: ({ cell }) => {
    const containerNos = cell.row.original.container_nos;

    // Helper function to get color based on shortage amount
    const getShortageColor = (shortage) => {
      if (shortage < 0) {
        return "#e02251"; // Red for shortage
      } else {
        return "#2e7d32"; // Green for no shortage
      }
    };

    const getShortageText = (shortage) => {
      if (shortage < 0) {
        return `Shortage: -${Math.abs(shortage).toFixed(2)} kg`;
      } else if (shortage > 0) {
        return `Excess: +${Math.abs(shortage).toFixed(2)} kg`;
      } else {
        return "No shortage/excess";
      }
    };

    return (
      <React.Fragment>
        <div style={centeredCellStyle}>
          {containerNos?.map((container, id) => {
            const weightShortage = parseFloat(container.weight_shortage) || 0;
            const containerColor = getShortageColor(weightShortage);
            const tooltipText = getShortageText(weightShortage);

            return (
              <div key={id} className="mb-2 text-center w-full" style={{ marginBottom: "4px" }}>
                <Tooltip title={tooltipText} arrow placement="top">
                  <a
                    
                    style={{
                      color: containerColor,
                      fontWeight: "bold",
                      textDecoration: "none",
                      cursor: "pointer",
                      marginRight: "6px",
                    }}
                    onClick={() => handleContainerClick(container)}
                    onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {container.container_number}
                  </a>
                </Tooltip>

                <span style={{ marginLeft: "4px", marginRight: "8px" }}>
                  | "{container.size}"
                </span>

                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Tooltip title="Copy Container Number" arrow>
                    <IconButton
                      size="small"
                      onClick={(event) => handleCopy(event, container.container_number)}
                    >
                      <ContentCopyIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Assign Transporter" arrow>
                    <IconButton
                      size="small"
                      onClick={() => handleTransporterClick(container, cell.row.original._id)}
                      sx={{ ml: 0.5, mr: 0.5 }}
                    >
                      <LocalShippingIcon fontSize="small" color="action" />
                    </IconButton>
                  </Tooltip>
                </span>
              </div>
            );
          })}
        </div>
      </React.Fragment>
    );
  },
},

           {
        accessorKey: "container_numbers",
        header: "Container Numbers and Size",
        size: 200,
        Cell: ({ cell }) => {
          const containerNos = cell.row.original.container_nos;
          const jobData = cell.row.original;

          // Helper function to get color based on shortage amount
          const getShortageColor = (shortage) => {
            if (shortage < 0) {
              return "#e02251"; // Red for shortage
            } else {
              return "#2e7d32"; // Green for no shortage
            }
          };

          // Helper function to get shortage text for tooltip
          const getShortageText = (shortage) => {
            if (shortage < 0) {
              return `Shortage: -${Math.abs(shortage).toFixed(2)} kg`;
            } else if (shortage > 0) {
              return `Excess: +${Math.abs(shortage).toFixed(2)} kg`;
            } else {
              return "No shortage/excess";
            }
          };

          return (
            <React.Fragment>
              {containerNos?.map((container, id) => {
                const weightShortage =
                  parseFloat(container.weight_shortage) || 0;
                const containerColor = getShortageColor(weightShortage);
                const tooltipText = getShortageText(weightShortage);

                return (
                  <div key={id} style={{ marginBottom: "4px" }}>
                    <Tooltip title={tooltipText} arrow placement="top">
                      <a
                        href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: containerColor,
                          fontWeight: "bold",
                          textDecoration: "none",
                          cursor: "pointer",
                        }}
                        onMouseOver={(e) =>
                          (e.target.style.textDecoration = "underline")
                        }
                        onMouseOut={(e) =>
                          (e.target.style.textDecoration = "none")
                        }
                      >
                        {container.container_number}
                      </a>
                    </Tooltip>
                    | "{container.size}"
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Tooltip title="Copy Container Number" arrow>
                        <IconButton
                          size="small"
                          onClick={(event) =>
                            handleCopy(event, container.container_number)
                          }
                        >
                          <ContentCopyIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
            
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        },
      },
      {
        // Group 5: Movement Timeline
        accessorKey: "movement_timeline",
        header: "Movement Timeline",
        size: 220,
        Cell: ({ cell }) => {
          const {
            vessel_berthing,
            discharge_date,
            container_nos = [],
            out_of_charge,
            delivery_date,
            emptyContainerOffLoadDate,
            consignment_type,
            detention_from
          } = cell.row.original;

          // Format dates
          const formattedOocDate = formatDate(out_of_charge);
          const formatDischargedate=formatDate(discharge_date);

          return (
            <div
              style={{
                width: "100%",
                lineHeight: "1.5",
                // alignItems: "center",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div>
                <strong>ETA: </strong>
                <span>{vessel_berthing || "N/A"}</span>
              </div>

              <div>
                <strong>Discharge: </strong>
                <span> {formatDischargedate}</span>
              </div>
            <div> 
  <strong>{consignment_type === "LCL" ? "By Road: " : "Rail Out: "}</strong>
  <span>
    {container_nos.length > 0
      ? container_nos.map((container, id) => (
          <React.Fragment key={id}>
            {consignment_type === "LCL"
              ? (container.by_road_movement_date?.split("T")[0] ?? "N/A")
              : (container.container_rail_out_date?.split("T")[0] ?? "N/A")}
            <br />
          </React.Fragment>
        ))
      : "N/A"}
  </span>
</div>
              <div>
                <strong>Arrival: </strong>
                <span>
                  {container_nos.length > 0
                    ? container_nos.map((container, id) => (
                        <React.Fragment key={id}>
                          {container.arrival_date?.split("T")[0] ?? "N/A"}
                          <br />
                        </React.Fragment>
                      ))
                    : "N/A"}
                </span>
              </div>

              <div>
                <strong>OOC: </strong>
                <span>{formattedOocDate}</span>
              </div>

              <div> 
                <strong>Detention From: </strong>
                  <span>
                  {container_nos.length > 0
                    ? container_nos.map((container, id) => (
                        <React.Fragment key={id}>
                          {container.detention_from?.split("T")[0] ?? "N/A"}
                          <br />
                        </React.Fragment>
                      ))
                    : "N/A"}
                </span>
              </div>

              <div>
                <strong>Delivery: </strong>
                <span>
                  {container_nos.length > 0
                    ? container_nos.map((container, id) => (
                        <React.Fragment key={id}>
                          {container.delivery_date?.split("T")[0] ?? "N/A"}
                          <br />
                        </React.Fragment>
                      ))
                    : "N/A"}
                </span>
                </div>
              
            

                <div>
                <strong>Empty Offload: </strong>
               <span>
                  {container_nos.length > 0
                    ? container_nos.map((container, id) => (
                        <React.Fragment key={id}>
                          {container.emptyContainerOffLoadDate?.split("T")[0] ?? "N/A"}
                          <br />
                        </React.Fragment>
                      ))
                    : "N/A"}
                </span>
              </div>
            </div>
          );
        },
      },

      {
        // Group 7: eSanchit Documents
        accessorKey: "esanchit_documents",
        header: "eSanchit Documents",
        size: 200,
        Cell: ({ cell }) => {
          const { cth_documents = [] } = cell.row.original;
          const validDocuments = cth_documents.filter(
            (doc) => doc.document_check_date
          );

          return (
            <div >
              {validDocuments.length > 0 ? (
                validDocuments.map((doc, index) => (
                  <div key={index} style={{ marginBottom: "4px" }}>
                    {doc.url && doc.url[0] ? (
                      <a
                        href={doc.url[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {doc.document_name || `Document ${index + 1}`}
                      </a>
                    ) : (
                      <span>
                        {doc.document_name || `Document ${index + 1}`}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <span>No documents</span>
              )}
            </div>
          );
        },
      },

      

           {
        // Group 8: DO Planning
        accessorKey: "doPlanning",
        header: "DO Planning",
        size: 300,
        Cell: ({ cell }) => {
          // Get the data from the row
          const { 
            do_planning_date, 
            doPlanning, 
            do_planning_history,
            do_copies = [],
            do_validity,
            do_completed
          } = cell.row.original;
          // console.log("DO Planning Cell Data:", cell.row.original.do_validity);

          return (
            <div style={centeredCellStyle}>
              {/* Commented out DoPlanningToggle component */}
              <DoPlanningToggle
                do_planning_date={do_planning_date}
                doPlanning={doPlanning}
                // do_planning_history={do_planning_history}
                cell={cell}
                row={cell.row}
              />
              
              {/* New DO Planning Display */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                width: '100%',
                padding: '8px'
              }}>
                {/* DO Copies Documents */}
                            
                

                {/* DO Validated */}
                              {/* DO Validated */}
                <div>
                  <strong>DO Validity:</strong>
                  <span style={{ 
                    marginLeft: '8px',
                    color: do_validity ? '#1a8917' : '#999',
                    fontSize: '0.9em'
                  }}>
                    {do_validity ? formatDate(do_validity) : 'Not validated'}
                  </span>
                </div>
                {/* DO Completed Date */}
                <div>
                  <strong>DO Completed Date:</strong>
                  <span style={{ 
                    marginLeft: '8px',
                    fontSize: '0.9em',
                    color: do_completed ? '#1a8917' : '#999'
                  }}>
                    {do_completed ? formatDate(do_completed) : 'Pending'}
                  </span>
                </div>
                <div>
                  <strong>DO Copies:</strong>
                  {Array.isArray(do_copies) && do_copies.length > 0 ? (
                    <div style={{ marginTop: "4px" }}>
                      {do_copies.map((url, index) => (
                        <div key={index}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#007bff", textDecoration: "underline" }}
                          >
                            DO Copy {index + 1}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginBottom: "5px" }}>
                      <span style={{ color: "gray" }}>
                        {" "}
                       No DO copies{" "}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },

      {
        // Group 9: Delivery Planning
        accessorKey: "delivery_planning",
        header: "Delivery Planning",
        size: 150,
        Cell: ({ cell }) => {
          const { examinationPlanning } = cell.row.original;

          return (
            <div style={centeredCellStyle}>
              <span>{examinationPlanning ? "Planned" : "Not Planned"}</span>
            </div>
          );
        },
      },

      // {
      //   accessorKey: "delivery_address",
      //   header: "Delivery Address",
      //   size: 320,
      //   Cell: ({ cell }) => (
      //     <div
      //       style={{
      //         ...centeredCellStyle,
      //         justifyContent: "center",
      //       }}
      //     >
      //       <EditableDeliveryAddressCell cell={cell} isCentered={true} />
      //     </div>
      //   ),
      // },
    ],

    
    [centeredCellStyle, formatDate, handleCopy, handleContainerClick, containerModalOpen, handleModalClose, selectedContainer, handleTransporterClick]

    
  );

  // Create Transporter Modal JSX
  const transporterModal = (
    <Dialog
      open={transporterModalOpen}
      onClose={handleTransporterModalClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          maxWidth: '600px'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 'bold',
        bgcolor: '#f8f9fa',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LocalShippingIcon color="primary" />
          Assign Transporter
          {selectedTransporterContainer && 
            <span style={{ color: '#666', fontSize: '0.9rem', marginLeft: '8px' }}>
              ({selectedTransporterContainer.container_number})
            </span>
          }
        </div>
      </DialogTitle>
      <DialogContent sx={{ pt: 2, pb: 1 }}>
        {selectedTransporterContainer && (
          <EditableTransporterCell 
            cell={{ 
              row: { 
                original: { 
                  _id: selectedTransporterContainer.jobId,
                  container_nos: [selectedTransporterContainer]
                } 
              } 
            }} 
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button 
          onClick={handleTransporterModalClose} 
          variant="outlined"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { 
    columns, 
    containerModalOpen, 
    handleModalClose, 
    selectedContainer,
    transporterModal
  };
}

export default useCustomerJobList;

