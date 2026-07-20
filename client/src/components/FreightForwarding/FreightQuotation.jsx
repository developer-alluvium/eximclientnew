import React, { useState } from "react";
import surajCompanyLogo from "../../assets/images/suraj_group_logo.png";

const THEME = {
  blue: "#16408f",
  border: "#cbd5e1",
  text: "#0f172a",
};

const s = {
  quoteWrapper: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    width: "100%",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "40px",
    backgroundColor: "#fff",
    color: THEME.text,
    boxSizing: "border-box",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    borderRadius: "3px",
    border: "1px solid #cbd5e1",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
    borderBottom: "2px solid #16408f",
    paddingBottom: "15px",
  },
  address: { fontSize: "12px", lineHeight: "1.6", color: "#334155" },
  title: {
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "bold",
    letterSpacing: "1px",
    color: "#1e293b",
    margin: "16px 0",
    textTransform: "uppercase",
  },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: "20px" },
  th: {
    backgroundColor: "#19448aff",
    padding: "10px 12px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#ffffff",
    border: `1px solid ${THEME.border}`,
  },
  td: {
    padding: "10px 12px",
    border: `1px solid ${THEME.border}`,
    fontSize: "12.5px",
    color: "#334155",
  },
  footerNote: {
    fontSize: "11px",
    marginTop: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    backgroundColor: "#f8fafc",
    padding: "16px",
    borderRadius: "3px",
    border: "1px solid #cbd5e1",
    color: "#475569",
  },
};

/**
 * Customer-facing quotation viewer — read-only (no save / edit).
 */
function FreightQuotation({ enquiry, selectedRate, onBack }) {
  const [quoteData] = useState({
    base_rates: (selectedRate.base_rates || []).map((r) => ({
      ...r,
      margin: r.margin !== undefined ? Number(r.margin) : 0,
    })),
    shipping_line_rates: (selectedRate.shipping_line_rates || []).map((r) => ({
      ...r,
      margin: r.margin !== undefined ? Number(r.margin) : 0,
    })),
  });

  const calculateTotal = (list) =>
    list.reduce((acc, curr) => acc + (Number(curr.amount) + Number(curr.margin || 0)), 0);

  const totalA = calculateTotal(quoteData.base_rates);
  const totalB = calculateTotal(quoteData.shipping_line_rates);

  return (
    <div style={{ backgroundColor: "#f3f4f6", padding: "20px", maxHeight: "80vh", overflowY: "auto" }}>
      <style>
        {`
          @media print {
            @page { margin: 0; }
            body * { visibility: hidden; }
            #quotation-print-area, #quotation-print-area * { visibility: visible; }
            #quotation-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              max-width: none !important;
              margin: 0 !important;
              padding: 0.5cm 1.8cm !important;
              box-shadow: none !important;
              background-color: white !important;
            }
            .no-print { display: none !important; visibility: hidden !important; }
          }
        `}
      </style>
      {onBack && (
        <button
          className="no-print"
          onClick={onBack}
          style={{
            marginBottom: "16px",
            padding: "8px 16px",
            borderRadius: "3px",
            border: "1px solid #cbd5e1",
            backgroundColor: "#fff",
            color: "#475569",
            fontWeight: 600,
            fontSize: "12.5px",
            cursor: "pointer",
          }}
        >
          ← Back to Rates
        </button>
      )}

      <div style={s.quoteWrapper} id="quotation-print-area">
        <div style={s.header}>
          <img src={surajCompanyLogo} alt="Logo" style={{ height: "70px", width: "auto" }} />
          <div style={{ textAlign: "right" }}>
            <div style={s.address}>
              <strong>A 204 to 206, Wall Street II</strong>
              <br />
              Opp Orient Club, Ellis Bridge
              <br />
              Ahmedabad - 380006
              <br />
              Phone: 079-26402005 / 26402006
              <br />
              Email: sojith@surajforwarders.com
            </div>
            <div style={{ fontSize: "12px", marginTop: "8px" }}>
              Date: {new Date().toLocaleDateString("en-GB")}
            </div>
          </div>
        </div>

        <div style={{ fontSize: "13px", marginBottom: "20px" }}>
          To: M/s <strong>{enquiry.organization_name}</strong>
        </div>

        <div style={s.title}>FREIGHT QUOTATION ({enquiry.container_size || "LCL"})</div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Charges</th>
              <th style={{ ...s.th, textAlign: "right" }}>Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {quoteData.base_rates.map((item, i) => (
              <tr key={i}>
                <td style={s.td}>{item.charge_name}</td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  {(Number(item.amount) + Number(item.margin || 0)).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>
              <td style={{ ...s.td, textAlign: "right" }}>TOTAL (A)</td>
              <td style={{ ...s.td, textAlign: "right" }}>{totalA.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Shipping Line Cost</th>
              <th style={{ ...s.th, textAlign: "right" }}>Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {quoteData.shipping_line_rates.map((item, i) => (
              <tr key={i}>
                <td style={s.td}>{item.charge_name}</td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  {(Number(item.amount) + Number(item.margin || 0)).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>
              <td style={{ ...s.td, textAlign: "right" }}>TOTAL (B)</td>
              <td style={{ ...s.td, textAlign: "right" }}>{totalB.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: "right", fontWeight: "bold", fontSize: "14px" }}>
          GRAND TOTAL (A + B): ₹{(totalA + totalB).toLocaleString()} + GST
        </div>

        <div style={s.footerNote}>
          <div>➤ Payment: 100% advance or against Bill of Lading</div>
          <div>➤ Transit Time: 12 to 15 days</div>
          <div>➤ Free days: 14 days at FPOD</div>
          <div>➤ Subject to space availability, equipment & rate approval</div>
          <div>➤ Booking cancellation charges as per liner tariff</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: "bold" }}>For Suraj Forwarders</div>
          <div style={{ fontSize: "12px", fontWeight: "bold" }}>Authorized Signatory</div>
        </div>

        <div style={{ marginTop: "30px", textAlign: "center" }} className="no-print">
          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: "#16408f",
              color: "#fff",
              padding: "12px 24px",
              border: "none",
              borderRadius: "3px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Download / Print Quotation
          </button>
        </div>
      </div>
    </div>
  );
}

export default FreightQuotation;
