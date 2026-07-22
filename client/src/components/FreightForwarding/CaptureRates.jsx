import React, { useState } from "react";
import FreightQuotation from "./FreightQuotation";

const THEME = {
  blue: "#16408f",
  border: "#cbd5e1",
  textMuted: "#64748b",
};

const s = {
  section: { marginBottom: "24px", padding: "12px 0px" },
  title: {
    fontSize: "13px",
    fontWeight: 700,
    borderBottom: `2px solid ${THEME.border}`,
    paddingBottom: "8px",
    marginBottom: "16px",
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "16px",
    backgroundColor: "#f8fafc",
    padding: "16px 20px",
    borderRadius: "3px",
    border: "1px solid #cbd5e1",
  },
  label: {
    fontSize: "11px",
    color: THEME.textMuted,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    marginBottom: "2px",
  },
  value: { fontSize: "13px", fontWeight: 700, color: "#1e293b" },
  btn: {
    padding: "0 16px",
    height: "32px",
    borderRadius: "3px",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

/**
 * Customer-facing enquiry detail — view only.
 * Users can view quotation; no edit / status / rate capture.
 */
function CaptureRates({ enquiry }) {
  const [selectedRateForQuote, setSelectedRateForQuote] = useState(null);

  const jobId = enquiry._id || enquiry.enquiry_no;
  const isConverted = enquiry.status === "Converted";

  const pipe = isConverted ? {
    draftUploaded: !!enquiry.documents?.hbl_copy || !!enquiry.documents?.booking_copy || !!enquiry.documents?.draft_bl || !!enquiry.saved_quotation,
    draftApproved: localStorage.getItem(`draft_bl_approved_${jobId}`) === "true",
    sboDate: enquiry.sailing_date || "",
    agencyBillNo: enquiry.billing_details?.agency_bill_no || "",
    agencyBillDate: enquiry.billing_details?.agency_bill_date || "",
    reimbursementBillNo: enquiry.billing_details?.reimbursement_bill_no || "",
    reimbursementBillDate: enquiry.billing_details?.reimbursement_bill_date || "",
    arrivalDate: enquiry.arrival_date || "",
  } : null;

  if (selectedRateForQuote) {
    return (
      <FreightQuotation
        enquiry={enquiry}
        selectedRate={selectedRateForQuote}
        onBack={() => setSelectedRateForQuote(null)}
      />
    );
  }

  const rates = enquiry.received_rates || [];
  const quoteSource =
    enquiry.saved_quotation ||
    (rates.length === 1 ? rates[0] : null);

  return (
    <div style={{ padding: "20px" }}>
      <div style={s.section}>
        <div style={{ ...s.title, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Enquiry Details</span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "12px",
              backgroundColor: enquiry.status === "Rejected" ? "#fef2f2" : "#eff6ff",
              color: enquiry.status === "Rejected" ? "#b91c1c" : "#1e40af",
              border: `1px solid ${enquiry.status === "Rejected" ? "#fecaca" : "#bfdbfe"}`,
            }}
          >
            {enquiry.status === "Rejected" ? "Rejected" : enquiry.status === "Open" ? "Enquiry" : enquiry.status}
            {" · View Only"}
          </span>
        </div>

        <div style={s.grid}>
          {Object.entries({
            No: enquiry.enquiry_no,
            Consignee: (() => {
              const text = enquiry.consignee_name || enquiry.bl_details?.consignee || enquiry.organization_name || "";
              return text.split("\n")[0].replace(/\r$/, "").trim();
            })(),
            POL: enquiry.port_of_loading,
            POD: enquiry.port_of_destination,
            Type: enquiry.consignment_type,
            Stuffing: enquiry.goods_stuffed,
            Movement: enquiry.movement_type,
            Pkgs: `${enquiry.no_packages || "-"} ${enquiry.package_unit || ""}`,
            "G.W": `${enquiry.gross_weight || "-"} ${enquiry.gross_weight_unit || ""}`,
            "N.W": `${enquiry.net_weight || "-"} ${enquiry.net_weight_unit || ""}`,
            Volume: `${enquiry.volume_cbm || "-"} ${enquiry.volume_unit || ""}`,
            "Vol. Wt": `${enquiry.volume_weight || "-"} ${enquiry.gross_weight_unit || ""}`,
          }).map(([k, v]) => (
            <div key={k}>
              <div style={s.label}>{k}</div>
              <div style={s.value}>{v || "-"}</div>
            </div>
          ))}
        </div>

        {enquiry.containers?.length > 0 &&
          enquiry.containers.some((c) => c.container_number || c.custom_seal || c.line_seal) && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ ...s.label, marginBottom: "6px" }}>Containers</div>
              <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "3px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "10.5px" }}>
                        Container No
                      </th>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "10.5px" }}>
                        Custom Seal
                      </th>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "10.5px" }}>
                        Line Seal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiry.containers.map((c, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>{c.container_number || "-"}</td>
                        <td style={{ padding: "8px 10px" }}>{c.custom_seal || "-"}</td>
                        <td style={{ padding: "8px 10px" }}>{c.line_seal || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>

      {isConverted && pipe && (
        <div style={s.section}>
          <div style={s.title}>Pipeline Progress</div>
          <div style={s.grid}>
            <div>
              <div style={s.label}>Draft BL Status</div>
              <div style={s.value}>
                {pipe.draftApproved ? "Approved" : pipe.draftUploaded ? "Uploaded (Pending Approval)" : "Pending Upload"}
              </div>
            </div>
            <div>
              <div style={s.label}>Shipped on Board Date</div>
              <div style={s.value}>
                {pipe.sboDate ? pipe.sboDate.split("-").reverse().join("/") : "-"}
              </div>
            </div>
            <div>
              <div style={s.label}>Agency Bill</div>
              <div style={s.value}>
                {pipe.agencyBillNo ? `${pipe.agencyBillNo} (${pipe.agencyBillDate.split("-").reverse().join("/")})` : "-"}
              </div>
            </div>
            <div>
              <div style={s.label}>Reimbursement Bill</div>
              <div style={s.value}>
                {pipe.reimbursementBillNo ? `${pipe.reimbursementBillNo} (${pipe.reimbursementBillDate.split("-").reverse().join("/")})` : "-"}
              </div>
            </div>
            <div>
              <div style={s.label}>Arrival Date</div>
              <div style={s.value}>
                {pipe.arrivalDate ? pipe.arrivalDate.split("-").reverse().join("/") : "-"}
              </div>
            </div>
          </div>
        </div>
      )}

      {(quoteSource || rates.length > 0) && (
        <div style={s.section}>
          <div style={s.title}>Quotation</div>

          {enquiry.saved_quotation && (
            <div style={{ marginBottom: "12px" }}>
              <button
                onClick={() => setSelectedRateForQuote(enquiry.saved_quotation)}
                style={{ ...s.btn, backgroundColor: "#059669", color: "#fff" }}
              >
                View Saved Quotation
              </button>
            </div>
          )}

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "3px",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#19448aff" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#fff" }}>
                    Forwarder
                  </th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#fff" }}>
                    Total Amount
                  </th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#fff" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rates.length > 0 ? (
                  rates.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #cbd5e1" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.forwarder_name || "-"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#16408f" }}>
                        ₹{r.total?.toLocaleString() ?? "-"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedRateForQuote(r)}
                          style={{ ...s.btn, backgroundColor: "#059669", color: "#fff" }}
                        >
                          View Quote
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", padding: "24px", color: THEME.textMuted }}>
                      No quotation rates available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!quoteSource && rates.length === 0 && (
        <div
          style={{
            padding: "24px",
            textAlign: "center",
            color: THEME.textMuted,
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
          }}
        >
          No quotation available for this enquiry yet.
        </div>
      )}
    </div>
  );
}

export default CaptureRates;
