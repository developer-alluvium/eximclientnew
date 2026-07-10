# E-Way Bill Module — QA Engagement Context File
Purpose: hand this file to any AI assistant or teammate so they have full context instantly, without re-reading the whole codebase.

## 1. What was provided
- Zip file: `eximclientnew-ewaybill.zip` — a full-stack (Node/Express + React) exim/logistics application. Only the E-Way Bill (EWB) related slice was in scope for this QA pass.
- Relevant files reviewed:
  - `server/routes/ewayBillProxyRoutes.js` (600 lines) — Node API layer for the EWB module.
  - `server/models/otherEwayBillModel.js` — Mongoose schema for "Others EWB / BOE upload" records.
  - `client/src/components/ewaybill/ewbValidationHelpers.js` (377 lines) — client-side business-rule validators (distance ±10%, HSN, vehicle number, rail doc, GSTIN, state-pin, cancellation/rejection/extension windows).
  - `client/src/components/ewaybill/EwayBillGenerate.js` (4,104 lines) — main generation UI (only partially reviewed; too large to fully trace line-by-line in this pass).
  - `client/src/components/ewaybill/Modals/*.jsx`, `EwayBillBulkOperations.js`, `EwayBillLookup.js`, `EwayBillReports.js`, `EwayBillDashboard.js` — listed but not deeply reviewed.
  - `server/app.js` — used to confirm global middleware order (no blanket auth wrapper before route mounting).

## 2. Critical architectural fact
`/api/eway-bill/*` is mostly a **proxy**: specific sub-routes (`/others/upload-boe`, `/others/list`, `/others/update-status`, `/others/update-cancellation`, `DELETE /others/:id`) are implemented locally against MongoDB, but everything else — including actual EWB **generation, extension, multi-vehicle operations, LR/BOE data lookups** — falls through to a catch-all `router.use(multipartHandler, proxyRequest)` that forwards to an EXTERNAL microservice:
- Dev: `http://localhost:9007/api/eway-bill`
- Prod: `https://eximbot.alvision.in/transport/api/eway-bill`

**That external microservice's source code was NOT included in the zip**, so its internal validation/authorization could not be reviewed. Several findings below are flagged "Blocked — needs the microservice source or a live environment" for this reason.

## 3. Methodology used (important — read before trusting any "Pass/Fail")
No live deployment, database, or EWB-GSTN sandbox credentials were available. All testing was **static code review / test design**, not live execution:
- Business-rule/validation-logic test cases: traced against actual source → Pass/Fail marked with high confidence.
- Authentication/authorization checks (IDOR, missing middleware): traced against actual source → Pass/Fail marked with high confidence.
- UI interaction, timing, concurrency, performance, accessibility, session-expiry, network-interruption cases: **cannot be executed without a live environment** → honestly marked "Not Executed - Live Env Required" rather than fabricated.

## 4. Deliverables produced
1. **`EwayBill_QA_Test_Report.xlsx`** — 3 tabs:
   - `Summary` — scope, methodology, pass/fail counts.
   - `Critical Findings` — 13 prioritized findings (3 Critical, 3 High, 4 Medium, 3 Low).
   - `Test Cases` — 80 detailed test cases (Test Case ID, Test Type, Module, Feature, Scenario, Steps, Test Data, Expected Result, Actual Result, Status, Verification Method).
2. This context file.

## 5. Top findings (see xlsx "Critical Findings" tab for full detail)
- **CRITICAL — IDOR on delete**: `DELETE /api/eway-bill/others/:id` never checks the record's `clientId` against the caller — any logged-in user of any client org can delete any other org's EWB record.
- **CRITICAL — Unauthenticated core operations**: the catch-all proxy handler (generation/extension/multi-vehicle/cancellation) has no `authenticateUser` middleware at the Node layer; it forwards using the app's own service token, not the caller's identity.
- **CRITICAL — Secret exposure**: a private key file `eximserver-SFPL.pem` and a `server/scratch/users_backup.json` + several password-reset scripts are bundled inside the delivered zip.
- **HIGH — likely same IDOR pattern** on `/others/update-status` and `/others/update-cancellation`.
- **HIGH — no file type/size validation** on the BOE upload endpoint (any file, any size, straight to S3 + an external parser).
- **MEDIUM** — internal error messages leaked to API responses; no pagination on `/others/list` (plus a write-on-every-GET "auto-heal" pattern); no duplicate-submission guard for BOE uploads or concurrent EWB generation; a date-parsing fallback that can silently misread DD/MM as MM/DD for 2-digit years.
- **LOW** — vehicle-number validator doesn't strip internal spaces and doesn't support the newer BH-series plates; HSN validator accepts non-numeric/overlong codes; no statutory ₹50,000 minimum-value guardrail.

## 6. What still needs to happen (open items for next session)
- [ ] Get access to a live/staging deployment (frontend + backend + DB) to execute the ~35 test cases marked "Not Executed - Live Env Required" (form rendering, double-submit behavior, session expiry, network interruption, concurrency timing, bulk operations, responsive/accessibility checks, performance under load).
- [ ] Get the source (or API contract/docs) for the external EWB microservice (`eximbot.alvision.in/transport/api/eway-bill`) to confirm whether it independently re-validates user identity/permissions and re-enforces the 24h/72h/±8h windows server-side.
- [ ] Fully trace `EwayBillGenerate.js` (only ~15% reviewed) and the modal components for additional UI-level gaps, especially the submit-button double-click/debounce question (TC-066, currently "Blocked").
- [ ] Confirm all call sites of `validateGstinFormat()` — specifically whether it's applied anywhere the legitimate value `"URP"` (unregistered person) could be entered (TC-039, currently "Blocked").
- [ ] Fix and re-test the IDOR issues (TC-054/TC-055) and the missing-auth-middleware issue (TC-056) as top priority before this goes further into any shared/staging environment.
- [ ] Remove `eximserver-SFPL.pem`, `users_backup.json`, and password-reset scratch scripts from the deliverable/repo, and rotate any credentials that may have been in them.

## 7. How to resume this work
Give the next AI assistant: (a) this file, (b) the same `eximclientnew-ewaybill.zip`, and (c) — ideally — live environment access or the external microservice's source. It can then pick up directly at the "open items" list above without re-deriving the architecture or re-reading the codebase from scratch.
