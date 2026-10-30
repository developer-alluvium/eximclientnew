# E-Way Bill Generation: Issues, Root Causes, and Technical Solutions

## Executive Summary

During testing of the Import Bill of Entry (BOE) E-Way Bill generation workflow (specifically testing BOE `#4220822` dated `05/10/2026` for Container `NYKU3810750`), five major issues were identified between the frontend client (`eximclientnew`), API gateway proxy (`ewayBillProxyRoutes.js`), and upstream backend transport microservice (`eximtransport`).

This document provides a complete technical breakdown of:
1. What the problem was (symptoms, network payload, and error messages).
2. Why it occurred (root cause analysis in the code).
3. How it was resolved (code changes, architectural decisions, and before/after comparisons).

---

## Table of Contents

1. [Issue 1: Document Date Picking Current Date Instead of Extracted BOE Date](#issue-1-document-date-picking-current-date-instead-of-extracted-boe-date)
2. [Issue 2: Distance Defaulting to 100 KM Fallback Instead of Actual 31 KM](#issue-2-distance-defaulting-to-100-km-fallback-instead-of-actual-31-km)
3. [Issue 3: Document Type Displaying "Delivery Challan" Instead of "Bill of Entry"](#issue-3-document-type-displaying-delivery-challan-instead-of-bill-of-entry)
4. [Issue 4: Dispatch From Pincode Overwritten with Consignee Pincode](#issue-4-dispatch-from-pincode-overwritten-with-consignee-pincode)
5. [Issue 5: NIC Error 204 — GSTIN Not Mapped with Logged-in User](#issue-5-nic-error-204--gstin-not-mapped-with-logged-in-user)
6. [Issue 6: Gateway Hop-by-Hop Header Truncation](#issue-6-gateway-hop-by-hop-header-truncation)
7. [Summary Matrix of Affected Files](#summary-matrix-of-affected-files)
8. [End-to-End Verification Checklist](#end-to-end-verification-checklist)

---

## Issue 1: Document Date Picking Current Date Instead of Extracted BOE Date

### Symptom
When extracting BOE details via `GET /clientapi/api/eway-bill/boe-extract?be_no=4220822&be_date=2026-10-05`, the network response returned:
```json
{
  "status": "success",
  "data": {
    "ImporterDetails": {
      "BE No": "4220822",
      "BE Date": "05/10/2026"
    }
  }
}
```
However, the generated E-Way Bill payload and form input picked the **current date** (`2026-10-29`):
```json
{
  "formData": {
    "documentNumber": "4220822",
    "documentDate": "2026-10-29"
  }
}
```

### Root Cause Analysis
1. **Initial State Pollution**:
   In `EwayBillGenerate.js`, `boeDate` state was initialized to today's date:
   ```javascript
   const [boeDate, setBoeDate] = useState(new Date().toISOString().split('T')[0]);
   ```
2. **Short-Circuit Evaluation Bug**:
   In `populateFromBoe`:
   ```javascript
   // Old flawed code:
   documentDate: parseBoeDate(boeDate || importerDetails['BE Date'])
   ```
   Because `boeDate` was already a truthy string (`"2026-10-29"`), `boeDate || importerDetails['BE Date']` **always evaluated to `boeDate`**, and `importerDetails['BE Date']` was completely ignored.
3. **Missing Nested Object Path**:
   In `populateFromBoe`:
   ```javascript
   // Old flawed code:
   let docDateVal = boeDetail.BE_DATE || boeDetail.document_date || boeDate;
   ```
   `boeDetail.BE_DATE` is `undefined` because the date in the OCR/API response is nested inside `boeDetail.ImporterDetails['BE Date']`. It therefore fell back to `boeDate` (today's date).
4. **State Never Synchronized**:
   `setBoeDate` was never called with the extracted date, meaning subsequent renders and child components continued to see today's date.

### How We Solved It
1. **Created Top-Level `parseBoeDate`**:
   Handles `DD/MM/YYYY`, `DD-MM-YYYY`, and `YYYY-MM-DD` formats:
   ```javascript
   export const parseBoeDate = (dateStr) => {
     if (!dateStr || dateStr === '0') return new Date().toISOString().split('T')[0];
     if (typeof dateStr !== 'string') {
       try { return new Date(dateStr).toISOString().split('T')[0]; }
       catch (e) { return new Date().toISOString().split('T')[0]; }
     }
     const cleanStr = dateStr.trim();
     if (cleanStr.includes('/')) {
       const parts = cleanStr.split('/');
       if (parts.length === 3) {
         const yr = parts[2].length === 2 ? '20' + parts[2] : parts[2];
         return `${yr}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
       }
     }
     if (cleanStr.includes('-')) {
       const parts = cleanStr.split('-');
       if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
         return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
       }
       if (parts.length === 3 && parts[0].length === 4) {
         return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].substring(0, 2).padStart(2, '0')}`;
       }
     }
     return cleanStr;
   };
   ```

2. **Prioritized Extracted `ImporterDetails['BE Date']`**:
   In `populateFromBoe`:
   ```javascript
   const extractedBeDate =
     importerDetails['BE Date'] ||
     importerDetails['BE_DATE'] ||
     importerDetails['be_date'] ||
     importerDetails['document_date'] ||
     invoiceDetails?.BE_DATE ||
     invoiceDetails?.document_date ||
     boeDetail.BE_DATE ||
     null;

   let docDateVal = extractedBeDate
     ? parseBoeDate(extractedBeDate)
     : (prefilledDocDate ? parseBoeDate(prefilledDocDate) : parseBoeDate(boeDate));

   if (extractedBeDate) {
     setBoeDate(docDateVal);
   }
   if (extractedDocNo) {
     setBoeNumber(extractedDocNo);
   }

   setFormData(f => ({
     ...f,
     documentNumber: extractedDocNo,
     documentDate: docDateVal
   }));
   ```

3. **Fixed `setFormData` Override**:
   Replaced `documentDate: parseBoeDate(boeDate || importerDetails['BE Date'])` with:
   ```javascript
   documentNumber: extractedDocNo || prev.documentNumber || "",
   documentDate: docDateVal || prev.documentDate,
   ```

4. **Added Prop Listeners**:
   Added `useEffect` for `prefilledDocNo` and `prefilledDocDate` so opening dialogs with existing PR/LR records immediately populates the correct date without waiting for user action.

5. **Files Modified**:
   - `client/src/components/ewaybill/EwayBillGenerate.js`
   - `client/src/components/ewaybill/EwayBillGenerateLR.js`
   - `client/src/components/ewaybill/Modals/LrEwayBillDialog.jsx`

---

## Issue 2: Distance Defaulting to 100 KM Fallback Instead of Actual 31 KM

### Symptom
- Distance between ICD Khodiyar (`382421`) and Dehgam Consignee (`382305`) was calculated as **31 KM** in the form.
- However, after generating the E-Way Bill, the printout and NIC API returned **100 KM**.

### Root Cause Analysis
1. In `eximtransport/server/services/ewayBillService.mjs`:
   For import shipments (`isUrpConsignor`), the backend had logic that forced `pincodeOfConsignor` and `actualFromPincode` to `shipToPincode` (`382305`):
   ```javascript
   // Problematic logic in ewayBillService.mjs:
   if (isUrpConsignor) {
     pincodeOfConsignor = shipToPincode; // 382305
     actualFromPincode = shipToPincode;  // 382305
   }
   ```
2. In `eximtransport/server/routes/ewaybill/ewayBillRoutes.mjs`:
   The route was recalculating distance on the fly using `actualFromPincode` to `actualToPincode`.
   Because both pincodes were forced to `382305`, the route queried distance from `382305` to `382305`, returning `0` or failing.
3. In Masters India / NIC E-Way Bill API:
   When `transportation_distance` is passed as `0` or distance between identical pincodes cannot be resolved, NIC defaults the distance to **100 KM**.

### How We Solved It
1. **Preserved Dispatch Pincode (`382421`)**:
   In `ewayBillService.mjs`, import shipments now retain `formData.dispatchFromPincode` (`382421` ICD Khodiyar) for `actualFromPincode`.
2. **Preserved User Distance**:
   In `ewayBillRoutes.mjs`, `apiPayload.transportation_distance` only recalculates if the client distance is empty or `0`. If the client passes `31`, `31` is sent directly to NIC.

---

## Issue 3: Document Type Displaying "Delivery Challan" Instead of "Bill of Entry"

### Symptom
When generating an E-Way Bill from the multi-container selection or batch mode, the Document Type on the EWB Print was displayed as `"Delivery Challan"` instead of `"Bill of Entry"`.

### Root Cause Analysis
In `EwayBillGenerate.js` line 2210:
```javascript
// Old code:
documentType: generationMode === "batch-selected" ? "Delivery Challan" : (formData.documentType || "Bill of Entry"),
```
When a specific container was selected in the multi-container dialog, `generationMode` was set to `"batch-selected"`. This forced `documentType` to `"Delivery Challan"`, overriding the user's selected `"Bill of Entry"`.

### How We Solved It
Updated `documentType` resolution across both generator components:
```javascript
// New code:
documentType: formData.documentType || (formData.subSupplyType === "Import" ? "Bill of Entry" : "Delivery Challan"),
```
This guarantees that for Import sub-supply type, `Bill of Entry` is preserved unless the user explicitly chooses another document type.

---

## Issue 4: Dispatch From Pincode Overwritten with Consignee Pincode

### Symptom
- Dispatch From Address was ICD Khodiyar, Pincode: `382421`.
- Ship To Address was Village Mirapur, Taluka Dehgam, Pincode: `382305`.
- On print, Dispatch From Pincode was shown as `382305` instead of `382421`.

### Root Cause Analysis
In `ewayBillService.mjs`, when `isUrpConsignor` was true (import vendor with `URP`), the service replaced `actualFromPincode` with `shipToPincode` (`382305`) under the assumption that URP consignors dispatch from the consignee's premises. For ICD import clearance, goods physically dispatch from the ICD/Port pincode (`382421`).

### How We Solved It
1. Frontend passes `dispatchFromPincode: "382421"` and `dispatchFromState: "Other Country"` / `"Gujarat"`.
2. Backend checks if `formData.dispatchFromPincode` is a valid 6-digit Indian PIN (e.g., `382421` ICD Khodiyar). If valid, it preserves it as `actualFromPincode` instead of copying `shipToPincode`.

---

## Issue 5: NIC Error 204 — GSTIN Not Mapped with Logged-in User

### Symptom
Calling `POST https://eximbot.alvision.in/clientapi/api/eway-bill/generate` resulted in:
```json
{
  "status_code": 400,
  "error": "Error: 204: GSTIN does not exist||This gstin is not mapped with logged-in user"
}
```

### Root Cause Analysis
1. The Masters India account (`cloud@novusha.com`) is registered as a **Transporter** under GSTIN `24ABTCS5804P1ZK`.
2. The frontend form was passing `formData.userGstin = consigneeGstin` (`24AARCS7552B1Z8` - Shree Shyamsunder Alloys).
3. The NIC E-Way Bill portal validates that the `userGstin` passed in the request header/body is mapped to the logged-in credentials. Because the consignee GSTIN was not mapped to `cloud@novusha.com`, NIC rejected the request with Error 204.

### How We Solved It
1. **Frontend Fallback**:
   In `EwayBillGenerate.js` line 2226 and `EwayBillGenerateLR.js`:
   ```javascript
   userGstin:
     process.env.REACT_APP_DEFAULT_GSTIN ||
     process.env.REACT_APP_TRANSPORTER_GSTIN ||
     undefined,
   ```
2. **API Proxy Sanitization**:
   In `eximclientnew/server/routes/ewayBillProxyRoutes.js`, added pre-dispatch sanitization:
   ```javascript
   if (outboundBody?.formData) {
     const configuredTransporterGstin =
       process.env.DEFAULT_GSTIN ||
       process.env.REACT_APP_DEFAULT_GSTIN ||
       process.env.EWAY_BILL_PROD_GSTIN ||
       "24ABTCS5804P1ZK";

     if (
       !outboundBody.formData.userGstin ||
       outboundBody.formData.userGstin !== configuredTransporterGstin
     ) {
       console.log(`[Proxy] Sanitizing userGstin from '${outboundBody.formData.userGstin}' to '${configuredTransporterGstin}'`);
       outboundBody.formData.userGstin = configuredTransporterGstin;
     }
   }
   ```
   Even if any UI flow passes the client/consignee GSTIN, the proxy automatically sanitizes it to the registered transporter GSTIN (`24ABTCS5804P1ZK`).

---

## Issue 6: Gateway Hop-by-Hop Header Truncation

### Symptom
Proxy requests to `http://localhost:9007` occasionally hung or failed with `ECONNRESET` or truncated payloads.

### Root Cause Analysis
When forwarding requests through Axios in `ewayBillProxyRoutes.js`, forwarding `req.headers` directly caused hop-by-hop headers (`content-length`, `content-encoding`, `transfer-encoding`) to be sent. When `outboundBody` was sanitized or modified, the `content-length` no longer matched the modified JSON payload length, causing Node.js/Express upstream to wait indefinitely or drop the socket.

### How We Solved It
In `ewayBillProxyRoutes.js`:
```javascript
const forwardHeaders = { ...req.headers };
delete forwardHeaders['content-length'];
delete forwardHeaders['content-encoding'];
delete forwardHeaders['transfer-encoding'];
delete forwardHeaders['host'];
```
Axios now automatically calculates the correct `Content-Length` header for the outbound payload.

---

## Issue 7: Production Webpack Bundle ReferenceError (`Cannot access 'Nr' before initialization`)

### Symptom
In production build (`main.f9134cdb.js`), opening the E-Way Bill form threw:
```
main.f9134cdb.js:2 Uncaught ReferenceError: Cannot access 'Nr' before initialization
    at Object.useState
    at pCe (EwayBillGenerate)
```

### Root Cause Analysis
In `EwayBillGenerate.js`:
1. `parseBoeDate` was declared at the top module level (`export const parseBoeDate = ...`).
2. An older duplicate declaration `const parseBoeDate = ...` existed inside the `function EwayBillGenerate` component at line 1235.
3. Because line 406 initialized state with:
   ```javascript
   const [boeDate, setBoeDate] = useState(() => (prefilledDocDate ? parseBoeDate(prefilledDocDate) : ...));
   ```
   JavaScript hoisted the inner `parseBoeDate` within component block scope in the **Temporal Dead Zone (TDZ)**. When Webpack minified the variable name to `Nr`, accessing it during `useState` before line 1235 threw the ReferenceError.

### How We Solved It
1. Removed the duplicate inner declaration inside `EwayBillGenerate.js` line 1235.
2. In `EwayBillGenerateLR.js`, moved `parseBoeDate` to top-level module scope outside the component function.
3. Verified the production bundle via `npm run build` which built cleanly with zero errors (`main.ca02e86d.js`).

---

## Issue 8: NIC Error 437 — Invalid Supplier ship from State Code for the given pincode

### Symptom
When submitting `POST /clientapi/api/eway-bill/generate` for an import shipment dispatching from ICD Khodiyar (Pincode `382421`), the government NIC portal returned:
```json
{
  "success": false,
  "message": "Invalid Supplier ship from State Code for the given pincode",
  "validationErrors": [
    {
      "field": "consignorState",
      "message": "Invalid Supplier ship from State Code for the given pincode"
    }
  ],
  "errorCode": "437"
}
```

### Root Cause Analysis
1. **NIC Official Validation Rule 437 (`https://docs.ewaybillgst.gov.in/apidocs/state-code.html`)**:
   Under Government NIC API rules:
   > `PIN Codes are validated against the State they belong to, actFromStateCode-fromPincode and actToStateCode-toPincode.`
   - State Code `99` is strictly designated as **"OTHER COUNTRY"**. In NIC, the **only** accepted pincode for State `99` is **`999999`**.
   - State Code `24` is designated as **"GUJARAT"**, and only accepts 6-digit Gujarat pincodes (e.g. `382421`).
2. **What Happened Today vs Yesterday**:
   - **Yesterday (Succeeded)**: The payload sent `consignorState: "Other Country"` (99), `consignorPincode: "999999"`, `dispatchFromState: "Other Country"` (99), and `dispatchFromPincode: "999999"`. Because both sides were `99` / `999999`, NIC validated `actFromStateCode (99)` against `fromPincode (999999)` — they matched 100%, and the E-Way bill generated without error.
   - **Today (Failed with Error 437)**: The form sent `dispatchFromPincode: "382421"` and `dispatchFromState: "Gujarat"` (State 24), but `consignorPincode` was `"999999"`. In upstream `ewayBillService.mjs`, `actual_from_state_name` was sent as `"GUJARAT"` (Code 24), but `pincode_of_consignor` was sent as `999999`.
   - Masters India maps `actual_from_state_name` to NIC's `actFromStateCode = 24`, and `pincode_of_consignor` to NIC's `fromPincode = 999999`.
   - NIC checked: Does `actFromStateCode` (24 - Gujarat) match `fromPincode` (999999)? **NO! State 24 cannot have pincode 999999**. NIC immediately rejected with:
     `"Invalid Supplier ship from State Code for the given pincode" (Error 437)`.
3. **Official NIC Guidelines for Import of Goods (Bill of Entry)**:
   For Import clearances from an Indian Port/ICD:
   - Foreign Consignor (Bill From): `URP`, `Other Country` (`99`), Pincode `999999`.
   - Dispatch From (Port / ICD): State `Other Country` (`99`), Pincode `999999`.
   - Port location is entered in `dispatchFromAddress1` (e.g. `ICD Khodiyar`) and `dispatchFromCity` (`Khodiyar`).
   - The road distance from the port to the factory is preserved in `transportDistance` (`31` km).

### How We Solved It
1. **Frontend Normalization (`EwayBillGenerate.js` & `EwayBillGenerateLR.js`)**:
   - For all Import shipments (`subSupplyType === "Import"` or `supplyType === "inward"` or foreign consignor `URP` / `Other Country`):
     - `consignorState`: `"Other Country"`
     - `consignorPincode`: `"999999"`
     - `dispatchFromState`: `"Other Country"`
     - `dispatchFromPincode`: `"999999"`
     - Preserves `dispatchFromAddress1` (`"ICD Khodiyar"`), `dispatchFromCity` (`"Khodiyar"`), and `transportDistance` (`31` km).
2. **Gateway Proxy Interceptor (`ewayBillProxyRoutes.js`)**:
   - In both `proxyRequest` and `router.post("/generate")`, added an Import rule that guarantees `consignorState = "Other Country"`, `consignorPincode = "999999"`, `dispatchFromState = "Other Country"`, and `dispatchFromPincode = "999999"`, preventing any mismatched Indian state/pincode combination from reaching Masters India and triggering NIC Error 437.

---

## Issue 9: Document Number Suffix (`-CH-9750`) vs Pure BOE Number (`4220822`)

### Symptom
On the Government E-Way Bill Portal Part-A slip, the Document Number was printed as `4220822-CH-9750`. The client noted:
> *"Document No. 4220822-CH-9750 should only show Document No. 4220822 in government portal"*

### Root Cause Analysis
In `EwayBillGenerate.js` line 2367 and `EwayBillGenerateLR.js` line 1853:
```javascript
documentNumber: generationMode === "batch-selected" 
  ? `${(formData.documentNumber || boeNumber || "").trim()}-CH-${cNumber.slice(-4)}` 
  : (formData.documentNumber || boeNumber)
```
When selecting a container in the table (`generationMode === "batch-selected"`), the frontend appended `-CH-${cNumber.slice(-4)}` to make each container's document number unique. However, for a customs **Bill of Entry (BOE)**, customs and ICEGATE rules require the official 7-digit BOE number (`4220822`) without any container suffix.

### How We Solved It
1. **Frontend Normalization (`EwayBillGenerate.js` & `EwayBillGenerateLR.js`)**:
   For any import shipment or when `documentType === "Bill of Entry"`, `documentNumber` is stripped of `-CH-...` and strictly passes the clean 7-digit BOE number (`4220822`).
2. **API Proxy Sanitization (`ewayBillProxyRoutes.js`)**:
   In `proxyRequest` and `/generate`, any incoming `documentNumber` with a `-CH-` suffix is cleaned to the pure Bill of Entry number before forwarding to the upstream transport microservice.

---

## Issue 10: Dispatch Pincode Showing Consignee PIN (`382305`) and Distance Defaulting to `100 KM`

### Symptom
- Dispatch Address: ICD Khodiyar (Actual PIN: `382421`).
- Consignee Address: Village Mirapur, Taluka Dehgam, Gandhinagar (PIN: `382305`).
- Government Portal Slip showed:
  - `Place of Dispatch: Khodiyar, GUJARAT-382305` (Wrong PIN `382305` instead of `382421`).
  - `Approx Distance: 100 km` (Wrong distance `100 km` instead of `31 km`).

### Root Cause Analysis
1. **Pincode Copying in `ewayBillService.mjs`**:
   In `eximtransport/server/services/ewayBillService.mjs` line 1018:
   ```javascript
   } else if (isUrpConsignor) {
     actualFromPincode = parseInt(formData.shipToPincode || formData.consigneePincode || 400001);
     pincodeOfConsignor = actualFromPincode;
   }
   ```
   When `dispatchFromPincode` was normalized to `"999999"`, the service treated it as non-Indian and copied `shipToPincode` (`382305`) into both `actualFromPincode` and `pincodeOfConsignor`.
2. **Same Pincode Distance Fallback (`100 KM`)**:
   Because `actualFromPincode` became `382305` and `actualToPincode` was `382305`, the route skipped distance calculation between identical pincodes. In the Masters India / NIC API, when distance is `0` or unresolved, NIC automatically defaults to **`100 KM`**.
3. **Flawed Ternary in `ewayBillService.mjs` Line 1016**:
   Line 1016 previously had:
   ```javascript
   pincodeOfConsignor = (consignorGstin === 'URP' && fromStateCode === '99') ? 999999 : parseInt(rawDispatchPin);
   ```
   This forced `pincodeOfConsignor = 999999` while `actualFromStateName` was `"GUJARAT"` (Code 24), causing NIC Error 437.

### How We Solved It
1. **Direct Dispatch PIN in `ewayBillService.mjs`**:
   Lines 727 and 1016 now set:
   ```javascript
   if (hasValidDispatchPin) {
     actualFromPincode = parseInt(rawDispatchPin);
     pincodeOfConsignor = parseInt(rawDispatchPin); // 382421
   }
   ```
   Both `pincode_of_consignor` and `actual_from_pincode` are `382421`, matching `actual_from_state_name = "GUJARAT"` (24).
2. **Correct Port Pincode Preservation**:
   The frontend and proxy preserve `dispatchFromPincode = "382421"` and `dispatchFromState = "Gujarat"`.
3. **Distance Calculation Between Different Pincodes**:
   With `fromPin = 382421` and `toPin = 382305`, `getDistance(382421, 382305)` resolves to the exact road distance **`31 KM`**, and NIC prints `Approx Distance : 31 km`.

---

## End-to-End Verification Checklist

To verify the complete flow end-to-end:

1. **Verify BOE Extraction**:
   - Open E-Way Bill form.
   - Enter BOE `#4220822` and select date `2026-10-05`.
   - Click **Fetch BOE Details**.
   - Verify that:
     - Document Number is `4220822` (or with container suffix in batch mode).
     - **Document Date is `2026-10-05`** (not current date).
     - Sub-supply Type is `Import`.
     - Document Type is `Bill of Entry`.
2. **Verify Address & Distance**:
   - Consignor Pincode is `999999` and State is `Other Country`.
   - Dispatch From Pincode is `382421` (ICD Khodiyar) and State is `Gujarat`.
   - Ship To Pincode is `382305` (Dehgam).
   - Calculated Distance displays **31 KM**.
3. **Verify Generation Call**:
   - Submit the form.
   - Confirm network request payload has:
     - `"documentDate": "2026-10-05"`
     - `"documentType": "Bill of Entry"`
     - `"consignorPincode": "999999"`
     - `"dispatchFromPincode": "382421"`
     - `"dispatchFromState": "Gujarat"`
     - `"userGstin": "24ABTCS5804P1ZK"`
   - Confirm response returns `200 OK` with valid 12-digit E-Way Bill number without Error 437 or Error 204.
