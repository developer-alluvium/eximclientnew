import React, { useCallback, useMemo, useState } from "react";
import EditableDeliveryAddressCell from "../components/EditableDeliveryAddressCell"; // Adjust the path as needed
import { Button, Tooltip, Modal } from "antd";
import { CopyOutlined, CarOutlined } from "@ant-design/icons";
import { MdContentCopy, MdLocalShipping } from "react-icons/md";
// import ScaleIcon from "@mui/icons-material/Scale";
// import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ScaleIcon from "@mui/icons-material/Scale";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ChecklistCell from "../components/ChecklistCell"; // Adjust the path as needed
// import NetWeightCell from "../components/Net weight/NetWeightCell"; // Adjust the path as needed
import DoPlanningToggle from "../components/DoPlanningToggle"; // Adjust the path as needed
import EditableTransporterCell from "../components/EditableTransporterCell";
import BENumberCell from "../components/BEnumberCell.jsx";
// Custom hook to manage job columns configuration with centered content
function useCustomerJobList() {
  const badge = (bg, color, bold = false) => ({
    backgroundColor: bg,
    color,
    padding: "0 6px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: bold ? "bold" : 500,
  });

  const [containerModalOpen, setContainerModalOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalInitialTab, setModalInitialTab] = useState("tracking");

  const handleContainerClick = useCallback((container, jobData = null, tab = "tracking") => {
    setSelectedContainer(container);
    if (jobData) {
        setSelectedJob(jobData);
    }
    setModalInitialTab(tab);
    setContainerModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setContainerModalOpen(false);
    setSelectedContainer(null);
    setSelectedJob(null);
    setModalInitialTab("tracking");
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
        header: (<>Exporter,<br/> Job Number & Free Time</>),
        size: 200,
        Cell: ({ cell }) => {
          const { job_no, job_date, detailed_status, free_time } =
            cell.row.original;

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
                wordWrap: "break-word",
                whiteSpace: "pre-wrap",
                maxWidth: "320px",
                padding: "8px",
                gap: "8px",
              }}
            >
              <div>{cell.getValue() || "N/A"}</div>
              <div
                style={{
                  color: textColor,
                  backgroundColor: bgColor,
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9em",
                  fontWeight: "bold",
                }}
              >
                {/* <div>{job_no}</div> */}
                <div
                  key="job-number"
                  style={{
                    fontWeight: "bold",
                    fontSize: "0.8rem",
                    border: "1px solid black",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    backgroundColor: "#f8f9fa",
                    display: "inline-block",
                  }}
                >
                  Job: {job_no}
                </div>
                <div
                  key="free-time"
                  style={{
                    fontWeight: "bold",
                    fontSize: "0.8rem",
                    border: "1px solid black",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    backgroundColor: "#f8f9fa",
                    display: "inline-block",
                  }}
                >
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
        // header: (
        //   <div className="flex flex-col text-center whitespace-normal leading-tight">
        //     <span>BE Number</span>
        //     <span>and Date</span>
        //   </div>
        // ),
         header: <>BE Number and Date</>,
        size: 230,
        Cell: ({ cell }) => <BENumberCell cell={cell} copyFn={handleCopy} />,
      },
      {
        accessorKey: "checklist",
        header: "Checklist/Shipping Line Invoices",
        enableSorting: false,
        size: 300,
        Cell: ({ cell }) => {
          const { do_shipping_line_invoice = [], remark_client } =
            cell.row.original;

          return (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "8px",
                textAlign: "left",
                width: "100%",
                height: "100%",
                fontSize: "12px",
                alignItems: "flex-start",
              }}
            >
              {/* Checklist Section - Left Side */}
              <div style={{ flex: "1", minWidth: "0" }}>
                <ChecklistCell {...{ cell }} />
                {(do_shipping_line_invoice.length > 0 || remark_client) && (
                  <div
                    style={{
                      flex: "1",
                      minWidth: "0",
                      borderLeft: "1px solid #e5e7eb",
                      paddingLeft: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {/* Remark Section */}
                    {remark_client && (
                      <div
                        style={{
                          backgroundColor: "#dbeafe",
                          // color: "#1e3a8a",
                          color:"#1E293B",
                          wordBreak: "break-word",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 600,
                          marginTop: "4px",
                          width: "fit-content",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Remark:</span>{" "}
                        {remark_client}
                      </div>
                    )}

                    {/* Shipping Line Invoices Section */}
                    {do_shipping_line_invoice.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          // gap: "4px",
                        }}
                      >
                        {/* Label */}
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#374151",
                            whiteSpace: "nowrap",
                            marginRight: "4px",
                          }}
                        >
                          Invoices:
                        </span>

                        {/* Invoice list */}
                        <span
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            flex: 1,
                          }}
                        >
                          {do_shipping_line_invoice.map((invoice, index) => (
                            <span
                              key={index}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                                borderBottom: "1px solid #f3f4f6",
                                paddingBottom: "4px",
                              }}
                            >
                              {/* Top row */}
                              <span
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-start",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <span
                                  title={invoice.document_name}
                                  style={{
                                    fontWeight: 500,
                                    color: "#1d4ed8",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: "65%",
                                  }}
                                >
                                  {invoice.document_name ||
                                    `Invoice ${index + 1}`}
                                </span>

                                {/* Status badges */}
                                <span style={{ display: "flex", gap: "4px" }}>
                                  {invoice.is_draft && (
                                    <span style={badge("#fef9c3", "#854d0e")}>
                                      Draft
                                    </span>
                                  )}
                                  {invoice.is_final && (
                                    <span
                                      style={badge("#dcfce7", "#166534", true)}
                                    >
                                      Final
                                    </span>
                                  )}
                                  {invoice.is_payment_made && (
                                    <span style={badge("#dcfce7", "#166534")}>
                                      Paid
                                    </span>
                                  )}
                                  {invoice.is_payment_requested &&
                                    !invoice.is_payment_made && (
                                      <span style={badge("#cffafe", "#155e75")}>
                                        Req
                                      </span>
                                    )}
                                </span>
                              </span>

                              {/* Amount details */}
                              {invoice.document_amount_details && (
                                <span
                                  style={{
                                    color: "#545964ff",
                                    fontSize: "10px",
                                  }}
                                >
                                  Amount: {invoice.document_amount_details}
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#666",
                                }}
                              >
                                Mode: {invoice.payment_mode}
                                {invoice.wire_transfer_method &&
                                  ` (${invoice.wire_transfer_method})`}
                              </span>

                              {/* Document links */}
                              {Array.isArray(invoice.url) &&
                                invoice.url.length > 0 && (
                                  <span
                                    style={{
                                      display: "flex",
                                      gap: "6px",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {invoice.url.map((link, i) => (
                                      <a
                                        key={i}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: "#3b82f6",
                                          textDecoration: "underline",
                                          fontSize: "10px",
                                        }}
                                      >
                                        Doc {i + 1}
                                      </a>
                                    ))}
                                  </span>
                                )}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Remarks & Invoices - Right Side */}
            </div>
          );
        },
        sx: centeredCellStyle,
      },

      {
        accessorKey: "shipment_details",
        header: <>Shipment & <br/>Commercial Details</>,
        size: 240,
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
              <strong>BL:</strong>{" "}{awb_bl_no}
              {awb_bl_no && (
                <Button
                  type="text"
                  size="small"
                  onClick={(event) => handleCopy(event, awb_bl_no)}
                  icon={<CopyOutlined />}
                  title="Copy BL Number"
                />
              )}{" "}
              {awb_bl_date} <br />
              <strong>Gross Weight:</strong>{" "}{gross_weight || ""} kg
              <br />
              <strong>Net weight:</strong>{" "}{job_net_weight || ""} kg
              <br />
              <strong>Invoice:</strong>{" "}{invoice_number}{" "}{invoice_date} <br />
              <strong>Value:</strong>{" "}{total_inv_value || "N/A"}{" "}{inv_currency ||""} <br />
              <strong>POL:</strong>{" "}
              {loading_port ? loading_port.replace(/\(.*?\)\s*/, "") : ""}{" "}
              <br />
              <strong>POD:</strong>{" "}
              {port_of_reporting
                ? port_of_reporting.replace(/\(.*?\)\s*/, "")
                : ""}{" "}
              <br />
              <strong>ICD Port:</strong>{" "}{custom_house || "N/A"}
            </div>
          );
        },
      },

      {
        // Group 4: Container
        accessorKey: "container_details",
        header: "Container",
        size: 230,
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
                  const weightShortage =
                    parseFloat(container.weight_shortage) || 0;
                  const containerColor = getShortageColor(weightShortage);
                  const tooltipText = getShortageText(weightShortage);

                  return (
                    <div
                      key={id}
                      className="mb-2 w-full"
                      style={{ 
                        marginBottom: "4px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: "6px",
                        whiteSpace: "nowrap" 
                      }}
                    >
                      <Tooltip title={tooltipText} arrow placement="top">
                        <a
                          style={{
                            color: containerColor,
                            fontWeight: "bold",
                            textDecoration: "none",
                            cursor: "pointer",
                          }}
                          onClick={() => handleContainerClick(container, cell.row.original, 'tracking')}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.textDecoration = "underline")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.textDecoration = "none")
                          }
                        >
                          {container.container_number}
                        </a>
                      </Tooltip>

                      <span style={{ color: "#666" }}>
                        | "{container.size}"
                      </span>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Tooltip title="Copy Container Number" arrow>
                          <Button
                            type="text"
                            size="small"
                            style={{ minWidth: "24px", padding: 0 }}
                            onClick={(event) =>
                              handleCopy(event, container.container_number)
                            }
                            icon={<CopyOutlined style={{ fontSize: '14px' }} />}
                          />
                        </Tooltip>

                        <Tooltip title="Assign Transporter" arrow>
                          <Button
                            type="text"
                            size="small"
                            style={{ minWidth: "24px", padding: 0 }}
                            onClick={() =>
                              handleContainerClick(
                                container,
                                cell.row.original,
                                'transporter'
                              )
                            }
                            icon={<CarOutlined style={{ fontSize: '14px' }} />}
                          />
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

      // {
      //   accessorKey: "container_numbers",
      //   header: "Container Numbers and Size",
      //   size: 230,
      //   Cell: ({ cell }) => {
      //     const containerNos = cell.row.original.container_nos;
      //     const jobData = cell.row.original;

      //     // Helper function to get color based on shortage amount
      //     const getShortageColor = (shortage) => {
      //       if (shortage < 0) {
      //         return "#e02251"; // Red for shortage
      //       } else {
      //         return "#2e7d32"; // Green for no shortage
      //       }
      //     };

      //     // Helper function to get shortage text for tooltip
      //     const getShortageText = (shortage) => {
      //       if (shortage < 0) {
      //         return `Shortage: -${Math.abs(shortage).toFixed(2)} kg`;
      //       } else if (shortage > 0) {
      //         return `Excess: +${Math.abs(shortage).toFixed(2)} kg`;
      //       } else {
      //         return "No shortage/excess";
      //       }
      //     };

      //     return (
      //       <div className="flex flex-col gap-1 w-full text-sm">
      //         {containerNos?.map((container, id) => {
      //           const weightShortage =
      //             parseFloat(container.weight_shortage) || 0;
      //           const containerColor = getShortageColor(weightShortage);
      //           const tooltipText = getShortageText(weightShortage);

      //           return (
      //             <div
      //               key={id}
      //               className="flex items-center gap-1 mb-1"
      //               title={tooltipText}
      //             >
      //               <a
      //                 href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
      //                 target="_blank"
      //                 rel="noopener noreferrer"
      //                 className="font-bold no-underline hover:underline"
      //                 style={{ color: containerColor }}
      //               >
      //                 {container.container_number}
      //               </a>

      //               <span className="text-gray-600">| "{container.size}"</span>

      //                 <Tooltip title="Copy Container Number" arrow>
      //                     <Button
      //                       type="text"
      //                       size="small"
      //                       onClick={(event) =>
      //                         handleCopy(event, container.container_number)
      //                       }
      //                       icon={<CopyOutlined />}
      //                     />
      //                   </Tooltip>
      //             </div>
      //           );
      //         })}
      //       </div>
      //     );
      //   },
      // },
      {
        // Group 5: Movement Timeline
        accessorKey: "movement_timeline",
        header: "Movement Timeline",
        size: 300,
        Cell: ({ cell }) => {
          const {
            vessel_berthing,
            discharge_date,
            container_nos = [],
            out_of_charge,
          } = cell.row.original;

          // Format dates
          const formattedOocDate = formatDate(out_of_charge);
          const formatDischargedate = formatDate(discharge_date);

          // Get container level dates helper
          const getContainerDates = (field, fallback) => {
            if (!container_nos || !Array.isArray(container_nos) || container_nos.length === 0) {
              return fallback;
            }
            const dates = container_nos
              .map((c) => c[field])
              .filter((d) => d && d.trim() !== "");
            if (dates.length === 0) return fallback;
            const uniqueFormatted = [...new Set(dates.map(d => formatDate(d)))];
            return uniqueFormatted.join(", ");
          };
          const railoutDateDisplay = getContainerDates("container_rail_out_date", "Pending");
          const arrivalDateDisplay = getContainerDates("arrival_date", "Pending");
          const detentionFromDisplay = getContainerDates("detention_from", "N/A");
          const deliveryDateDisplay = getContainerDates("delivery_date", "Pending");
          const emptyOffloadDisplay = getContainerDates("emptyContainerOffLoadDate", "Pending");

          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                textAlign: "left",
                gap: "2px",
                width: "100%",
              }}
            >
              <div>
                <strong>ETA:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {vessel_berthing ? formatDate(vessel_berthing) : "Pending"}
                </span>
              </div>
              <div>
                <strong>Rail out Date:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {railoutDateDisplay}
                </span>
              </div>
              <div>
                <strong>Arrival Date:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {arrivalDateDisplay}
                </span>
              </div>
              <div>
                <strong>Discharge Date:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {discharge_date ? formatDate(discharge_date) : "Pending"}
                </span>
              </div>
              <div>
                <strong>OOC Date:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {out_of_charge ? formatDate(out_of_charge) : "Pending"}
                </span>
              </div>
              <div>
                <strong>Detention From:</strong>
                <span
                  style={{
                    marginLeft: "8px",
                    fontWeight: "bold",
                    color: detentionFromDisplay !== "N/A" ? "#b91c1c" : "inherit",
                  }}
                >
                  {detentionFromDisplay}
                </span>
              </div>
              <div>
                <strong>Delivery Date:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {deliveryDateDisplay}
                </span>
              </div>

              <div>
                <strong>Empty Offload:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {emptyOffloadDisplay}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        // Group 6: D.O. Validity
        accessorKey: "do_validity",
        header: "D.O. Validity",
        size: 200,
        Cell: ({ cell }) => {
          const { do_validity, do_copies, do_completed } = cell.row.original;

          return (
            <div style={centeredCellStyle}>
              <div
                style={{
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div>
                  <strong>Valid Upto:</strong>
                  <span
                    style={{
                      marginLeft: "8px",
                      color: do_validity ? "#d97706" : "inherit",
                      fontWeight: do_validity ? "bold" : "normal",
                    }}
                  >
                    {do_validity ? formatDate(do_validity) : "Not validated"}
                  </span>
                </div>
                {/* DO Completed Date */}
                <div>
                  <strong>DO Completed Date:</strong>
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "0.9em",
                      color: do_completed ? "#1a8917" : "#999",
                    }}
                  >
                    {do_completed ? formatDate(do_completed) : "Pending"}
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
                            style={{
                              color: "#007bff",
                              textDecoration: "underline",
                            }}
                          >
                            DO Copy {index + 1}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginBottom: "5px" }}>
                      <span style={{ color: "gray" }}> No DO copies </span>
                    </div>
                  )}
                </div>
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
            (doc) => doc.document_check_date,
          );

          return (
            <div>
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
        Header: () => <div className="w-full text-left">DO Planning</div>,
        size: 250,
        Cell: ({ cell }) => {
          // Get the data from the row
          const {
            do_planning_date,
            doPlanning,
            do_planning_history,
            do_copies = [],
            do_validity,
            do_completed,
          } = cell.row.original;
          // console.log("DO Planning Cell Data:", cell.row.original.do_validity);

          return (
            <div
              style={{
                ...centeredCellStyle,
                alignItems: "flex-start",
                textAlign: "left",
              }}
            >
              {/* Commented out DoPlanningToggle component */}
              <DoPlanningToggle
                do_planning_date={do_planning_date}
                doPlanning={doPlanning}
                // do_planning_history={do_planning_history}
                cell={cell}
                row={cell.row}
              />

              {/* New DO Planning Display */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  width: "100%",
                  padding: "8px",
                }}
              >
                {/* DO Copies Documents */}

                {/* DO Validated */}
                {/* DO Validated */}
                <div>
                  <strong>DO Validity:</strong>
                  <span
                    style={{
                      marginLeft: "8px",
                      color: do_validity ? "#1a8917" : "#999",
                      fontSize: "0.9em",
                    }}
                  >
                    {do_validity ? formatDate(do_validity) : "Not validated"}
                  </span>
                </div>
                {/* DO Completed Date */}
                <div>
                  <strong>DO Completed Date:</strong>
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "0.9em",
                      color: do_completed ? "#1a8917" : "#999",
                    }}
                  >
                    {do_completed ? formatDate(do_completed) : "Pending"}
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
                            style={{
                              color: "#007bff",
                              textDecoration: "underline",
                            }}
                          >
                            DO Copy {index + 1}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginBottom: "5px" }}>
                      <span style={{ color: "gray" }}> No DO copies </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },

      // {
      //   // Group 9: Delivery Planning
      //   accessorKey: "delivery_planning",
      //   header: "Delivery Planning",
      //   Header: () => (
      //     <div className="flex flex-col items-center justify-center text-center w-full">
      //       <span>Delivery</span>
      //       <span>Planning</span>
      //     </div>
      //   ),
      //   size: 200,
      //   Cell: ({ cell }) => {
      //     const { examinationPlanning } = cell.row.original;

      //     return (
      //       <div style={centeredCellStyle}>
      //         <span>{examinationPlanning ? "Planned" : "Not Planned"}</span>
      //       </div>
      //     );
      //   },
      // },

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

    [
      centeredCellStyle,
      formatDate,
      handleCopy,
      handleContainerClick,
      containerModalOpen,
      handleModalClose,
      selectedContainer,
    ],
  );

  return {
    columns,
    containerModalOpen,
    handleModalClose,
    selectedContainer,
    selectedJob,
    modalInitialTab,
  };
}

export default useCustomerJobList;
