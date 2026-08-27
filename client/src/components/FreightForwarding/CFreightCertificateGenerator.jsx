
import React, { useState } from "react";
import jsPDF from "jspdf";
import axios from "axios";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import logo from "../../assets/images/surajCompanyLogo.jpeg";
import { imageToBase64 } from "../../utils/imageUtils";

const CFreightCertificateGenerator = ({ jobNo, children }) => {
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);

  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, "-");
  };

  const generateHTML = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.preventDefault) e.preventDefault();

    try {
      const encodedJobNo = encodeURIComponent(jobNo);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;

      // Extract Data
      const consignee = data.consignees?.[0]?.consignee_name || data.consignee_name || "";
      const shipper = data.exporter || "";
      const mblNo = data.master_bl_no || data.mbl_no || "";
      const hblNo = data.house_bl_no || data.hbl_no || "";
      const grossWeight = data.gross_weight_kg ? `${data.gross_weight_kg} KGS` : "";
      const loadingPort = data.port_of_loading || "";
      const dischargePort = data.port_of_discharge || "";
      const finalPlace = data.final_place_of_delivery || data.final_destination || "";
      const vesselName = data.vessel_name || "";
      
      // Commodity Logic: Join all product descriptions with " | "
      const products = data.invoices?.[0]?.products || [];
      const commodity = products.length > 0 
        ? products.map(p => p.description).filter(Boolean).join(" | ")
        : (data.commodity || "");

      const freightDetails = data.invoices?.[0]?.freightInsuranceCharges?.freight || {};
      const freightCurrency = freightDetails.currency || "USD";
      const freightAmount = data.invoices?.[0]?.freightInsuranceCharges?.freight?.amount || "";
      const freightDisplay = `${freightAmount} ${freightCurrency}`;

      const isGandhidham =
        String(data.branchCode || "").toUpperCase().trim() === "GIM" ||
        String(data.jobNumber || "").toUpperCase().startsWith("GIM") ||
        String(data.job_no || "").toUpperCase().startsWith("GIM");

      // Pre-load logo as base64
      let logoSrc = logo;
      try {
        logoSrc = await imageToBase64(logo);
      } catch (err) {
        console.warn("Failed to convert logo to base64", err);
      }

      // Removed signature logic since client doesn't need to see the internal signature stamp

      // Styles
      const blueColor = "#424242ff";
      const blackColor = "#000000";
      const tableBorder = `1px solid ${blueColor}`;
      
      const template = `
        <div style="font-family: Arial, Helvetica, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: ${blackColor};">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${logoSrc}" style="width: 200px; height: auto; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;" />
                <div style="color: ${blueColor}; font-weight: bold; font-size: 18px; text-decoration: underline; margin-top: 10px;">FREIGHT CERTIFICATE</div>
            </div>

            <!-- Shipment Details Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: ${tableBorder};">
                <tbody>
                    ${[
                      ["Consignee:", consignee],
                      ["Shipper Name:", shipper],
                      ["Master Bill of Lading (MBL#)", mblNo],
                      ["House Bill of Lading (HBL#)", hblNo],
                      ["Gross Weight:", grossWeight],
                      ["Loading Port:", loadingPort],
                      ["Port of Discharge:", dischargePort],
                      ["Final Place of Delivery:", finalPlace],
                      ["Vessel Name:", vesselName],
                    ].map(row => `
                        <tr>
                            <td style="width: 30%; padding: 5px; border: ${tableBorder}; font-weight: bold; color: ${blackColor}; vertical-align: top;">${row[0]}</td>
                            <td style="width: 70%; padding: 5px; border: ${tableBorder}; font-weight: bold; color: ${blackColor}; vertical-align: top;">${row[1]}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <!-- Certificate Box -->
            <div style="border: ${tableBorder}; padding: 10px; margin-bottom: 20px;">
                <div style="margin-bottom: 10px;">
                    <strong>Commodity :</strong> ${commodity}
                </div>
                <div style="line-height: 1.6;">
                    This is to certify that Freight charges for above mentioned shipment from 
                    <strong>${loadingPort}</strong> to <strong>${finalPlace || dischargePort}</strong>.
                </div>
            </div>

            <!-- Freight Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: ${tableBorder};">
                <thead>
                    <tr style="background-color: #fff;">
                        <th style="width: 50%; padding: 8px; border: ${tableBorder}; text-align: center;">Particulars</th>
                        <th style="width: 50%; padding: 8px; border: ${tableBorder}; text-align: center;">Currency</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 8px; border: ${tableBorder}; text-align: center;">Freight</td>
                        <td style="padding: 8px; border: ${tableBorder}; text-align: center;">${freightDisplay}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: ${tableBorder}; text-align: center;">Ex-Works</td>
                        <td style="padding: 8px; border: ${tableBorder}; text-align: center;"></td>
                    </tr>
                </tbody>
            </table>

            <!-- Footer -->
            <div style="border: ${tableBorder}; padding: 10px; display: flex; flex-direction: column; justify-content: space-between;">
                
                <div style="margin-bottom: 15px;">
                  ${isGandhidham ? `
                  <div style="font-weight: bold; line-height: 1.6; color: #163693;">
                    FOR, SURAJ FORWARDERS & SHIPPING AGENCIES
                  </div>
                  <div style="margin-top: 5px; margin-bottom: 5px;">
                  </div>
                  <div style="font-weight: bold; line-height: 1.6; color: #163693;">
                    AUTHORIZED SIGNATURE
                  </div>
                  ` : `
                  <div style="font-weight: bold; margin-bottom: 30px;">For SURAJ FORWARDERS PVT LTD</div>
                  <div style="font-weight: bold; margin-bottom: 15px;">(Authorised Signatory)</div>
                  `}
                </div>

                <!-- Address Box -->
                <div style="border: ${tableBorder}; padding: 5px; width: 60%; margin: 0 auto 15px auto; text-align: center; font-size: 11px;">
                    ${isGandhidham ? `
                    <strong>GANDHIDHAM</strong><br/>
                    209, 2nd Floor, Madhav Palace, Plot No. 55,<br/>
                    Sector-8, Near Chamber of Commerce,<br/>
                    GANDHIDHAM (Kutch) - 370 201<br/>
                    Phone No. : (02836) 229011 / 12<br/>
                    E-mail : anurag@surajforwders.com<br/>
                    PIC : Mr. Anurag Pillai (M) +91 99243 04422<br/>
                    <strong style="color: #000;">PIC : Balvir Bhai (M) +91 99243 04434</strong>
                    ` : `
                    A/204-205, WALL STREET II, OPP. ORIENT CLUB,<br/>
                    NR. GUJARAT COLLEGE, ELLIS BRIDGE,<br/>
                    AHMEDABAD - 380006,GUJARAT<br/>
                    Tel. No.-9924304005<br/>
                    Email -sojith@surajforwarders.com
                    `}
                </div>

                <div style="border-top: ${tableBorder}; padding-top: 10px; font-weight: bold;">
                    Date : ${formatDate(new Date())}
                </div>
            </div>
            
             <div style="text-align: right; font-size: 10px; margin-top: 5px;">Page: 1/1</div>

        </div>
      `;

      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error generating Freight Certificate:", err);
      alert("Failed to generate Freight Certificate");
    }
  };

  const handleDownloadDirectly = async () => {
    setChoiceOpen(false);
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    try {
      await doc.html(htmlContent, {
        callback: function (doc) {
          doc.save(`Freight_Certificate_${jobNo}.pdf`);
        },
        x: 10,
        y: 10,
        width: 550, 
        windowWidth: 800,
        margin: [20, 20, 20, 20],
        autoPaging: 'text',
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF");
    }
  };

  return (
    <>
      {children ? (
        React.cloneElement(children, {
          onClick: (e) => {
            e.stopPropagation();
            if (children.props.onClick) children.props.onClick(e);
            generateHTML(e);
          },
        })
      ) : (
        <Button onClick={generateHTML} variant="contained">
          Generate Freight Certificate
        </Button>
      )}

      {/* Choice Dialog */}
      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)}>
        <DialogTitle>Document Action</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: "10px" }}>
            Do you want to edit the document inline or download it directly?
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChoiceOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDownloadDirectly} variant="contained" color="primary">
            Download Certificate
          </Button>
        </DialogActions>
      </Dialog>
    </>);
};

export default CFreightCertificateGenerator;