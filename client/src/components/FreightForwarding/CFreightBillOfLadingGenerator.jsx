import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Alert } from "@mui/material";
import { ContentCopy as CopyIcon } from "@mui/icons-material";
import html2pdf from "html2pdf.js";
import logo from "../../assets/images/surajCompanyLogo.jpeg";
import CFreightCertificateGenerator from "./CFreightCertificateGenerator";

const LEGAL_TEXT_1 =
  "Taken in charge in apparently good condition herein at the place of receipt for transport and delivery as mentioned above, unless otherwise stated. The MTO in accordance with the provisions contained in the MTD undertakes to perform or to procure the performance of the multimodal transport from the place at which the goods are taken in charge to the place designated for delivery and assumes responsibility for such transport.";

const LEGAL_TEXT_2 =
  "One of the MTD(s) must be surrendered, duly endorsed in exchange for the goods, in witness whereof the original MTD of all of this tenor and date have been signed in the number indicated below one of which being accomplished the other(s) to be void.";

const formatAddress = (val) => {
  if (!val) return "";
  return val
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, idx, arr) => {
      if (idx === arr.length - 1) return line;
      if (/[,.\-/]$/.test(line)) return line;
      return line + ",";
    })
    .join("<br/>");
};

const estimateLines = (text, maxCharsPerLine = 33) => {
  if (!text) return 0;
  return text.split('\n').reduce((totalLines, line) => {
    if (line.trim() === '') return totalLines + 1;
    return totalLines + Math.max(1, Math.ceil(line.length / maxCharsPerLine));
  }, 0);
};

const splitDescription = (desc, packagesDesc = "", hsnCode = "") => {
  if (!desc) return { p1: "", p2: "" };

  const maxContainerHeight = 295;
  const lineHeight = 11.5 * 1.45; // 16.675 px

  // Calculate height occupied by packages description (margin-bottom: 10px = 10px)
  const packagesLinesCount = estimateLines(packagesDesc, 35);
  const packagesHeight = (packagesLinesCount * lineHeight) + 10;

  // Calculate height occupied by HSN code (margin-top: 5px = 5px)
  const hsnText = hsnCode ? `HSN: ${hsnCode}` : '';
  const hsnLinesCount = hsnCode ? estimateLines(hsnText, 35) : 0;
  const hsnHeight = hsnCode ? (hsnLinesCount * lineHeight) + 5 : 0;

  // Height of "Continued on Annexure" label (margin-top: 5px)
  const continuedLabelHeight = (10 * 1.45) + 5; // ~19.5px

  // Remaining height without continued label
  let availableHeight = maxContainerHeight - packagesHeight - hsnHeight;

  const lines = desc.split("\n");
  let p1_lines = [];
  let p2_lines = [];

  // Let's trace how many lines we can add
  let currentHeight = 0;
  let splitIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLinesCount = estimateLines(line, 35);
    const lineHeightTotal = lineLinesCount * lineHeight;

    if (currentHeight + lineHeightTotal <= availableHeight) {
      currentHeight += lineHeightTotal;
    } else {
      splitIndex = i;
      break;
    }
  }

  // If splitIndex is -1, it means the entire description fits!
  if (splitIndex === -1) {
    return {
      p1: desc,
      p2: ""
    };
  }

  // If it doesn't all fit, we need the continued label, which reduces the available height!
  availableHeight -= continuedLabelHeight;

  // Re-calculate how many lines fit with the reduced available height
  p1_lines = [];
  currentHeight = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLinesCount = estimateLines(line, 35);
    const lineHeightTotal = lineLinesCount * lineHeight;

    if (currentHeight + lineHeightTotal <= availableHeight) {
      p1_lines.push(line);
      currentHeight += lineHeightTotal;
    } else {
      p2_lines = lines.slice(i);
      break;
    }
  }

  if (p1_lines.length === 0 && lines.length > 0) {
    p1_lines.push(lines[0]);
    p2_lines = lines.slice(1);
  }

  return {
    p1: p1_lines.join("\n"),
    p2: p2_lines.join("\n")
  };
};

const generateBLTemplate = (enquiry, mode = 'draft') => {
  const bl = enquiry?.bl_details || {};
  const isLcl = (enquiry?.consignment_type?.toUpperCase() === 'LCL' || enquiry?.consignmentType?.toUpperCase() === 'LCL');

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const freightLabel = isLcl ? 'FREIGHT PREPAID<br/>LCL/LCL<br/>CFS/CFS' : 'FREIGHT PREPAID<br/>FCL/FCL<br/>CY/CY';
  const enquiryContainers = enquiry?.containers || [];
  let autoContainerNumbers = "";
  let autoSealNumbers = "";
  if (enquiryContainers.length > 0 && enquiryContainers.some(c => c.container_number || c.custom_seal || c.line_seal)) {
    autoContainerNumbers = enquiryContainers.map(c => c.container_number).filter(Boolean).join("\n");
    autoSealNumbers = enquiryContainers.map(c => {
      const parts = [];
      if (c.custom_seal) parts.push(`CUSTOM: ${c.custom_seal}`);
      if (c.line_seal) parts.push(`LINE: ${c.line_seal}`);
      return parts.length > 0 ? (c.container_number ? c.container_number + ": " : "") + parts.join(' / ') : '';
    }).filter(Boolean).join("\n");
  }
  const isOriginal = mode === 'original';

  // Split logic for description overflow
  const desc = bl.description_of_goods || "";
  const packagesDesc = bl.packages_description || "[NUMBER & KIND OF PACKAGES]";
  const hsnCode = bl.hsn_code || "";
  const { p1: p1_desc, p2: p2_desc } = splitDescription(desc, packagesDesc, hsnCode);

  // Borders are rendered transparent in Original mode to keep text placement identical
  const bColor = isOriginal ? 'transparent' : '#000';
  const b22 = `border: 2.2px solid ${bColor};`;
  const b18 = `border: 1.8px solid ${bColor};`;
  const bb22 = `border-bottom: 2.2px solid ${bColor};`;
  const bb2 = `border-bottom: 2px solid ${bColor};`;
  const bb18 = `border-bottom: 1.8px solid ${bColor};`;
  const br22 = `border-right: 2.2px solid ${bColor};`;
  const br18 = `border-right: 1.8px solid ${bColor};`;
  const br12 = `border-right: 1.2px solid ${bColor};`;

  const watermark = !isOriginal ? `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; color: rgba(0,0,0,0.08); font-weight: 900; pointer-events: none; z-index: 0; text-transform: uppercase;">DRAFT</div>
  ` : '';

  return `
    <div style="font-family: 'Helvetica', 'Arial', sans-serif; color: #000; width: 750px; margin: 0 auto; background-color: #fff; line-height: 1.15; padding-left: 0px; padding-right: 0px; box-sizing: border-box;">
      
      <!-- FIRST PAGE (MAIN BL) -->
      <div style="${b22} box-sizing: border-box; width: 750px; height: 1040px; max-height: 1040px; overflow-y: hidden; overflow-x: visible; ${p2_desc ? 'page-break-after: always; break-after: page;' : ''} position: relative; padding-left: 20px; padding-right: 20px;">
        ${watermark}
        <!-- TOP HEADER BOX -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
          <tr>
            <td style="width: 53%; ${br22} padding: 12px 10px; vertical-align: middle;">
              <div style="font-size: 19px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">MULTIMODAL TRANSPORT DOCUMENT</div>
            </td>
            <td style="width: 47%; padding: 0; vertical-align: top;">
               <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: ${isOriginal ? '2px 10px 0px' : '4px 10px'}; ${bb2}; height: 32px; box-sizing: border-box; vertical-align: middle;">
                       <table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: ${isOriginal ? '10px' : '0px'};">
                         <tr>
                           <td style="width: 60px; font-weight: 900; font-size: 10px; white-space: nowrap; color: ${isOriginal ? 'transparent' : '#000'}; vertical-align: middle;">MTD. No.</td>
                           <td style="padding-left: 6px; vertical-align: middle;">
                             <div style="${b18} height: 20px; line-height: 14px; text-align: center; font-weight: 700; font-size: 11.5px; box-sizing: border-box; overflow: hidden; position: relative; top: ${isOriginal ? '-10px' : '-3px'};">${enquiry?.hbl_no || ""}</div>
                           </td>
                         </tr>
                       </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: ${isOriginal ? '6px 10px' : '4px 10px'}; height: 32px; box-sizing: border-box; vertical-align: middle;">
                       <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                         <tr>
                           <td style="width: 105px; font-weight: 900; font-size: 10px; white-space: nowrap; color: ${isOriginal ? 'transparent' : '#000'}; vertical-align: middle;">Shipment Ref. No.</td>
                           <td style="padding-left: 6px; vertical-align: middle;">
                             <div style="${b18} height: 20px; line-height: 14px; text-align: center; font-weight: 700; font-size: 11.5px; box-sizing: border-box; overflow: hidden; position: relative; top: ${isOriginal ? '0px' : '-3px'};">${""}</div>
                           </td>
                         </tr>
                       </table>
                    </td>
                  </tr>
               </table>
            </td>
          </tr>
        </table>

        <!-- PARTIES & BRANDING & LEGAL -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
          <tr>
            <td style="width: 53%; ${br22} vertical-align: top; padding: 0; ${isOriginal ? 'position: relative; height: 255px;' : ''}">
               <div style="padding: ${isOriginal ? '8px 10px 8px 0px' : '3px 8px'}; ${bb18} height: 85px; box-sizing: border-box; overflow: ${isOriginal ? 'visible' : 'hidden'}; ${isOriginal ? 'position: absolute; top: -25px; left: -10px; width: 100%;' : ''}">
                  ${isOriginal ? '' : '<div style="font-weight: 900; margin-bottom: 1px; font-size: 8.5px;">Consignor</div>'}
                  <div style="font-weight: 700; text-transform: uppercase; font-size: ${isOriginal ? '12px' : '9px'}; line-height: ${isOriginal ? '1.3' : '1.15'}; white-space: normal;">${formatAddress(bl.consignor || enquiry?.organization_name || "")}</div>
               </div>
               <div style="padding: ${isOriginal ? '8px 10px 8px 0px' : '3px 8px'}; ${bb18} height: 85px; box-sizing: border-box; overflow: ${isOriginal ? 'visible' : 'hidden'}; ${isOriginal ? 'position: absolute; top: 105px; left: -10px; width: 100%;' : ''}">
                  ${isOriginal ? '' : '<div style="font-weight: 900; margin-bottom: 1px; font-size: 8.5px;">Consignee (Or Order)</div>'}
                  <div style="font-weight: 700; text-transform: uppercase; font-size: ${isOriginal ? '12px' : '9px'}; line-height: ${isOriginal ? '1.3' : '1.15'}; white-space: normal;">${formatAddress(bl.consignee || "TO ORDER")}</div>
               </div>
               <div style="padding: ${isOriginal ? '8px 10px 8px 0px' : '3px 8px'}; height: 85px; box-sizing: border-box; overflow: ${isOriginal ? 'visible' : 'hidden'}; ${isOriginal ? 'position: absolute; top: 230px; left: -10px; width: 100%;' : ''}">
                  ${isOriginal ? '' : '<div style="font-weight: 900; margin-bottom: 1px; font-size: 8.5px;">Notify Address</div>'}
                  <div style="font-weight: 700; text-transform: uppercase; font-size: ${isOriginal ? '12px' : '9px'}; line-height: ${isOriginal ? '1.3' : '1.15'}; white-space: normal;">${formatAddress(bl.notify_party || "SAME AS CONSIGNEE")}</div>
               </div>
            </td>
            <td style="width: 47%; vertical-align: top; padding: 10px 12px; text-align: center;">
               <img src="${logo}" alt="Suraj Logo" style="width: 170px; margin: 0 auto 6px; display: block; opacity: ${isOriginal ? 0 : 1};" />
               <div style="font-size: 8.5px; line-height: 1.25; margin-bottom: 8px; font-weight: 700; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">
                  A-204,205, Wall Street II, Opp Orient Club, Ellis Bridge,<br/>
                  Ahmedabad - 380 006, (Gujarat) INDIA<br/>
                  Ph : (079) 3008 2020 / 21 / 22 | Fax : (079) 2640 1929<br/>
                  Email : info@surajforwarders.com | Site : www.surajforwarders.co
               </div>
               <div style="font-weight: 900; font-size: 12px; margin-bottom: 8px; border-bottom: 1.2px solid ${isOriginal ? 'transparent' : '#000'}; display: inline-block; padding-bottom: 2px; color: ${isOriginal ? 'transparent' : '#000'};">REGN NO. MTO/DGS/1148/JAN/2026</div>
               <div style="font-size: 7px; text-align: justify; margin-bottom: 6px; font-weight: 700; line-height: 1.2; color: ${isOriginal ? 'transparent' : '#000'};">${LEGAL_TEXT_1}</div>
               <div style="font-size: 7px; text-align: justify; margin-bottom: 12px; font-weight: 700; line-height: 1.2; color: ${isOriginal ? 'transparent' : '#000'};">${LEGAL_TEXT_2}</div>
               
               <div style="border-top: 1.8px solid ${isOriginal ? 'transparent' : '#000'}; padding-top: 8px; text-align: left; position: relative; top: ${isOriginal ? '30px' : '0'};">
                  <div style="font-weight: 900; border-bottom: 1.2px solid ${isOriginal ? 'transparent' : '#000'}; padding-bottom: 3px; margin-bottom: 6px; font-size: 10px; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">Agent Details</div>
                  <div style="font-size: 11.5px; line-height: 1.3; font-weight: 700; text-transform: uppercase; white-space: pre-wrap;">${bl.agent_details || '[OVERSEAS AGENT NAME]\n[OFFICE ADDRESS]\n[CITY / PORT], [COUNTRY]\nTEL: [PHONE]'}</div>
               </div>
            </td>
          </tr>
        </table>

        <!-- Wrapper to shift everything below the main table up by 30px in Original mode -->
        <div style="position: relative; top: ${isOriginal ? '-30px' : '0'};">

        <!-- PORT DATA GRID -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
          <tr style="${bb18}">
            <td style="width: 50%; ${br18} padding: 6px 10px 6px ${isOriginal ? '0px' : '8px'}; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Place of Acceptance</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '-3px' : '0'}; left: ${isOriginal ? '-10px' : '0'};">${bl.place_of_acceptance || enquiry?.place_of_receipt || ""}</div>
            </td>
            <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Port of Loading</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; left: ${isOriginal ? '-172px' : '0'}; top: ${isOriginal ? '-3px' : '0'};">${enquiry?.port_of_loading || ""}</div>
            </td>
          </tr> 
          <tr>
            <td style="width: 50%; ${br18} padding: 6px 10px 6px ${isOriginal ? '0px' : '8px'}; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Port of Discharge</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '-3px' : '0'}; left: ${isOriginal ? '-10px' : '0'};">${enquiry?.port_of_destination || ""}</div>
            </td>
            <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Place of Delivery</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; left: ${isOriginal ? '-172px' : '0'}; top: ${isOriginal ? '-3px' : '0'};">${enquiry?.port_of_destination || ""}</div>
            </td>
          </tr>
        </table> 

        <!-- VESSEL & TRANSPORT INFO -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
          <tr style="min-height: 40px;">
            <td style="width: 50%; ${br18} padding: 0; vertical-align: top;">
               <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                     <td style="width: 75%; ${br12} padding: 6px 10px 6px ${isOriginal ? '0px' : '8px'}; font-weight: 900; font-size: 9.5px; height: 31px; line-height: 1; color: ${isOriginal ? 'transparent' : '#000'};">Vessel & Voyage No.</td>
                     <td style="width: 25%; padding: 6px 10px; font-weight: 900; height: 31px; line-height: 1; font-size: 9.5px;">&nbsp;</td>
                  </tr>
                  <tr>
                     <td style="padding: 2px 10px 6px ${isOriginal ? '0px' : '8px'}; font-weight: 700; text-transform: uppercase; font-size: 12px;"><div style="position: relative; left: ${isOriginal ? '-10px' : '0'};">${bl.vessel_name || "[MV NAME AND VOY]"}</div></td>
                     <td style="padding: 2px 10px 6px; font-weight: 700; text-transform: uppercase; text-align: center;">&nbsp;</td>
                  </tr>
               </table>
            </td>
            <td style="width: 25%; ${br18} padding: 0; vertical-align: top;">
               <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 10px; font-weight: 900; font-size: 9.5px; height: 31px; line-height: 1; color: ${isOriginal ? 'transparent' : '#000'};">Mode of Transport</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 10px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px;">${bl.mode_of_transport || (enquiry?.shipment_type?.toUpperCase().includes('SEA') ? 'SEA' : 'AIR')}</td>
                  </tr>
               </table>
            </td>
            <td style="width: 25%; padding: 0; vertical-align: top;">
               <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 10px; font-weight: 900; font-size: 9.5px; height: 31px; line-height: 1; color: ${isOriginal ? 'transparent' : '#000'};">Route / transshipment</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 10px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px;">${bl.route_transshipment || ""}</td>
                  </tr>
               </table>
            </td>
          </tr>
        </table>

        <!-- CARGO DETAILS TABLE -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
          <tr style="${bb18}; background-color: ${isOriginal ? 'transparent' : '#fcfcfc'};">
            <th style="width: 18%; ${br18} padding: 8px 10px 8px ${isOriginal ? '6px' : '8px'}; font-size: 8.5px; font-weight: 900; text-align: left; color: ${isOriginal ? 'transparent' : '#000'};">Container No (s)</th>
            <th style="width: 15%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: left; color: ${isOriginal ? 'transparent' : '#000'};">Marks & Numbers</th>
            <th style="width: 37%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: left; color: ${isOriginal ? 'transparent' : '#000'};">Number and kind of packages, general description of goods</th>
            <th style="width: 15%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">Gross Weight</th>
            <th style="width: 15%; padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">Measurement</th>
          </tr>
          <tr>
            <td style="${br18} min-height: 280px; height: 280px; vertical-align: top; padding: ${isOriginal ? '8px' : '12px'} 14px ${isOriginal ? '8px' : '12px'} ${isOriginal ? '0px' : '8px'}; font-size: 11.5px; line-height: 1.45; overflow-wrap: break-word; word-wrap: break-word;">
               <div style="${isOriginal ? 'position: relative; left: -10px;' : ''}">
                  <div style="font-weight: 900; white-space: pre-wrap;">${bl.container_numbers || autoContainerNumbers || "[CONTAINER DETAILS]"}</div> 
                  <div style="font-weight: 700; font-size: 10px; margin-top: 6px; white-space: pre-wrap;">${(bl.seal_numbers || autoSealNumbers) ? 'SEALS: ' + (bl.seal_numbers || autoSealNumbers) : ''}</div>
               </div>
            </td>
            <td style="${br18} vertical-align: top; padding: ${isOriginal ? '8px' : '12px'} 14px; font-size: 11.5px; line-height: 1.45; font-weight: 900; white-space: pre-wrap; overflow-wrap: break-word; word-wrap: break-word;">${bl.marks_numbers || "[SHIPPING MARKS]"}</td>
            <td style="${br18} vertical-align: top; padding: ${isOriginal ? '8px' : '12px'} 14px; font-size: 11.5px; line-height: 1.45; font-weight: 700; overflow-wrap: break-word; word-wrap: break-word;">
               <div style="max-height: 295px; overflow: hidden; display: flex; flex-direction: column; position: relative; left: ${isOriginal ? '10px' : '0'};">
                  <div style="font-weight: 900; margin-bottom: 10px; white-space: pre-wrap;">${bl.packages_description || "[NUMBER & KIND OF PACKAGES]"}</div>
                  <div style="white-space: pre-wrap; flex: 1;">${p1_desc || "[GOODS DESCRIPTION]"}</div>
                  <div style="margin-top: 5px;">${bl.hsn_code ? 'HSN: ' + bl.hsn_code : ''}</div>
               </div>
            </td>
            <td style="${br18} vertical-align: top; padding: ${isOriginal ? '8px' : '12px'} 14px; font-size: 12px; font-weight: 900; text-align: right;">
               ${bl.gross_weight || enquiry?.gross_weight || "0.000"} KGS
               <br/><br/>
               <span style="font-size: 11px; font-weight: 700; color: #333;">NET WEIGHT<br/>${enquiry?.net_weight || "0.000"} KGS</span>
            </td>
            <td style="vertical-align: top; padding: ${isOriginal ? '8px' : '12px'} 14px; font-size: 12px; font-weight: 900; text-align: right;">
               ${bl.measurement || "[CBM] CBM"}
                <br/><br/><br/><br/><br/>
                <div style="font-size: 11.5px; font-weight: 900; text-align: center; border-top: 1px solid ${isOriginal ? 'transparent' : '#eee'}; padding-top: 12px; line-height: 1.35; color: #000;">${freightLabel}</div>
            </td>
          </tr>
          </table>

        <!-- FREIGHT & ORIGINALS INFO -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22} ${isOriginal ? 'margin-top: 12px;' : ''}">
          <tr style="min-height: 45px;">
            <td style="width: 25%; ${br18} padding: 6px 10px 6px ${isOriginal ? '0px' : '8px'}; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Freight Amount</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '45px' : '0'};">${bl.freight_amount || "AS AGREED"}</div>
            </td>
            <td style="width: 25%; ${br18} padding: 6px 10px; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Freight Payable at</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '45px' : '0'};">AHMEDABAD</div>
            </td>
            <td style="width: 25%; ${br18} padding: 6px 10px 6px 10px; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9px; color: ${isOriginal ? 'transparent' : '#000'};">Number of Original MTD (s)</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '45px' : '0'}; left: ${isOriginal ? '10px' : '0'};">${bl.no_of_originals || "3 (THREE)"}</div>
            </td>
            <td style="width: 25%; padding: 6px 10px 6px 20px; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Place and Date of Issue</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '40px' : '0'}; left: ${isOriginal ? '10px' : '0'};">${bl.place_of_issue || "AHMEDABAD"}<br/>${formatDate(enquiry?.sailing_date) || bl.date_of_issue || new Date().toLocaleDateString('en-GB')}</div>
            </td>
          </tr>
        </table>

        <!-- OTHER PARTICULARS & SIGNATORY -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="width: 58%; padding: ${isOriginal ? '10px 12px 10px 0px' : '6px 12px 10px 8px'}; vertical-align: top; ${br22}">
               <div style="font-weight: 900; margin-top: ${isOriginal ? '18px' : '4px'}; margin-bottom: 4px; font-size: 10px; color: ${isOriginal ? 'transparent' : '#000'};">Other Particulars (If any)</div>
               <div style="white-space: pre-wrap; font-size: 11px; font-weight: 700; margin-bottom: 4px; position: relative; top: ${isOriginal ? '40px' : '0'};">${bl.other_particulars || ""}</div>
               <div style="margin-top: ${isOriginal ? '30px' : '10px'}; font-size: 9px; font-weight: 900; text-align: center; letter-spacing: 0.1px; color: ${isOriginal ? 'transparent' : '#000'};">Weight & Measurement of container not to be Included.</div>
               <div style="font-size: 9px; font-weight: 900; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">(TERMS CONTINUED ON BACK HERE OF)</div>
            </td>
            <td style="width: 42%; padding: 10px 15px; vertical-align: top; text-align: center;">
               <div style="font-weight: 900; font-size: 14.5px; margin-bottom: ${isOriginal ? '65px' : '45px'}; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">FOR SURAJ FORWARDERS PVT. LTD.</div>
               <div style="font-weight: 900; font-size: 12.5px; color: ${isOriginal ? 'transparent' : '#000'};">(Authorised Signatory)</div>
            </td>
          </tr>
        </table>
        </div>
      </div>
      ${p2_desc ? `
      <!-- SECOND PAGE (ANNEXURE) -->
      <div style="border: 2.2px solid ${isOriginal ? 'transparent' : '#000'}; padding: 20px 30px; width: 750px; height: 1040px; max-height: 1040px; overflow-y: hidden; overflow-x: visible; box-sizing: border-box; background-color: #fff; position: relative;">
        ${watermark}
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
          <div style="font-size: 15px; font-weight: 700; color: #000; text-align: left; margin: 0; line-height: 1.2;">Annexure to the Multimodal Transport Document.</div>
          <div style="font-size: 12px; font-weight: 700; color: #000; text-align: right; text-transform: uppercase;">MTD NO. : ${enquiry?.hbl_no || ""}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed;">
            <tr>
               <td style="width: 20%; vertical-align: top; padding: 0;">&nbsp;</td>
               <td style="width: 18%; vertical-align: top; padding: 0;">&nbsp;</td>
               <td style="width: 47%; vertical-align: top; padding: 0px 14px; font-size: 11.5px; line-height: 1.45; font-weight: 700; overflow-wrap: break-word; word-wrap: break-word;">
                  <div style="white-space: pre-wrap;">${p2_desc}</div>
               </td>
               <td style="width: 15%; vertical-align: top; padding: 0;">&nbsp;</td>
            </tr>
        </table>
      </div>
      ` : ''}
    </div>`;
};

const CFreightBillOfLadingGenerator = ({ enquiry, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const buildTemplate = (e, mode = 'draft') => {
    if (e?.stopPropagation) e.stopPropagation();
    if (e?.preventDefault) e.preventDefault();

    const template = generateBLTemplate(enquiry, mode);
    setHtmlContent(template);
    setChoiceOpen(true);
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/public/bl-form/${enquiry._id}`;
    navigator.clipboard.writeText(publicUrl);
    setSnackbar({ open: true, message: "Public BL Form link copied to clipboard!" });
  };

  const handleTriggerClick = (e, originalOnClick) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (e?.preventDefault) e.preventDefault();
    if (typeof originalOnClick === "function") {
      originalOnClick(e);
    }
    buildTemplate(e, 'draft');
    setChoiceOpen(true);
  };

  const handleEdit = () => {
    setChoiceOpen(false);
    setEditorOpen(true);
  };

  const handleDownloadDraft = async (e) => {
    setChoiceOpen(false);
    await triggerDownload('draft');
  };

  const handleDownloadOriginal = async (e) => {
    setChoiceOpen(false);
    await triggerDownload('original');
  };

  const triggerDownload = async (mode) => {
    const templateMarkup = generateBLTemplate(enquiry, mode);

    try {
      const element = document.createElement("div");
      element.innerHTML = templateMarkup;

      await html2pdf()
        .from(element)
        .set({
          margin: [10, 5, 0, 5],
          filename: `${mode === 'original' ? 'Original' : 'Draft'}_MTD_${enquiry?.hbl_no || enquiry?.enquiry_no || "Freight"}.pdf`,
          image: { type: "jpeg", quality: 0.85 },
          html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 784 },
          jsPDF: { unit: "pt", format: "a4", orientation: "portrait", compress: true },
          pagebreak: { mode: ["css", "legacy"], avoid: "tr" },
        })
        .save();
      setChoiceOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF");
    }
  };

  return (
    <>
      {children ? (
        React.cloneElement(children, {
          onClick: (e) => handleTriggerClick(e, children.props.onClick),
        })
      ) : (
        <Button onClick={buildTemplate} variant="contained">
          Generate BL
        </Button>
      )}

      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: "#1a237e", textAlign: "center" }}>
          MTD / Bill of Lading Output
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            You can download a <b>Draft</b> soft copy of the Bill of Lading or the Freight Certificate.
          </Alert>
          <div style={{ textAlign: "center", marginBottom: "10px", color: "#666" }}>
            Select your download type:
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 0, gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
          <Button
            onClick={() => triggerDownload('draft')}
            variant="contained"
            color="primary"
            sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            Download Draft
          </Button>
          <CFreightCertificateGenerator jobNo={enquiry?.success_no || enquiry?.enquiry_no}>
            <Button
              variant="contained"
              sx={{ fontWeight: 700, borderRadius: 2, px: 3, bgcolor: "#f59e0b", color: "#fff", '&:hover': { bgcolor: "#d97706" } }}
            >
              Freight Certificate
            </Button>
          </CFreightCertificateGenerator>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CFreightBillOfLadingGenerator;
