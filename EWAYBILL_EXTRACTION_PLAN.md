# EWAY BILL EXTRACTION PLAN
**Generated:** 2026-07-03  
**Source Backend:** `C:\project\eximtransport` (Transport API — Node.js/Express ESM, port 9007)  
**Source Frontend:** `C:\project\eximclientnew` (React CRA, port 3001 — talks to eximclientnew/server at port 9003 which proxies to the Transport API)  
**Target:** A new, fully independent full-stack project with its own Express backend + React frontend  

---

## 1. Overview of the Feature and Its Data Flow

### Feature Summary
The **E-Way Bill (EWB) feature** is a full GST compliance module for generating, managing, and tracking government-mandated E-Way Bills for goods in transit across India. It integrates with the **Masters India GSP (GST Suvidha Provider)** API on behalf of the company's GSTIN.

### Data Flow (End-to-End)

```
Browser (React)
  │
  │  1. User opens /ewaybill or triggers EWB dialog from Transport LR table
  │
  ▼
React Frontend (eximclientnew/client)
  │  REACT_APP_API_STRING → points to eximclientnew/server (port 9003)
  │  OR directly to eximtransport/server (port 9007) depending on env
  │
  │  API calls: GET/POST /api/eway-bill/...
  │
  ▼
eximclientnew/server (Express proxy / auth layer, port 9003)
  │  Authenticates user (JWT cookie: exim_token)
  │  Proxies transport requests downstream
  │
  ▼
eximtransport/server (Transport API, port 9007)
  │  Route: app.use("/api/eway-bill", ewayBillRoutes)
  │  Middleware: protect (JWT auth) → authMiddleware.mjs
  │
  ▼
ewayBillRoutes.mjs
  │  Handles all /api/eway-bill/* endpoints
  │  Imports: EwayBill model, EwayBillErrorLog model, PrData model,
  │           BulkRequest model, JobModel, Organisation model
  │           ewayBillService, ewbValidationService, addressParserService
  │
  ▼
ewayBillService.mjs
  │  JWT token management for Masters India API
  │  Wraps all Masters India API calls
  │  Reads EWAY_BILL_ENV + per-env credential env vars
  │
  ▼
Masters India GSP API
  │  Sandbox:    https://sandb-api.mastersindia.co/api/v1
  │  Testing:    https://clientbasic.mastersindia.co
  │  Production: https://pro.mastersindia.co
  │  Auth: POST /token-auth/ or /oauth/access_token → returns JWT
  │  Operations: generate, cancel, update-vehicle, extend-validity,
  │              multi-vehicle, get-ewb-details, distance lookup
  │
  ▼
MongoDB Atlas (shared DB)
  │  Collections: ewaybills, ewaybillerrorlogs, prdatas, bulkrequests,
  │               jobs, organisations, users
```

### Entry Points (Frontend)
| Path | Component | Purpose |
|---|---|---|
| `/ewaybill` | `EwayBillForm` → renders `CImportDSR` | Standalone E-Way Bill page (legacy wrapper) |
| `/transport` | `TransportModule` → `TransportTable` | LR list with inline E-Way Bill buttons |
| Any LR row | `LrEwayBillDialog` | Full EWB generate/manage dialog from Transport |
| Any BE number | `BEnumberCell` | Quick EWB Part-A view for import jobs |

---

## 2. Backend Files to Extract

### 2.1 CORE E-WAY BILL FILES (Must Extract — 100% EWB-specific)

#### Routes
| File | Path | Purpose |
|---|---|---|
| `ewayBillRoutes.mjs` | `C:\project\eximtransport\server\routes\ewaybill\ewayBillRoutes.mjs` | All REST endpoints for /api/eway-bill/* — 3929 lines, monolithic route file |
| `readme.md` | `C:\project\eximtransport\server\routes\ewaybill\readme.md` | Route documentation |

**All endpoints defined in `ewayBillRoutes.mjs`:**
- `POST /token-auth` — Proxy Masters India auth token (CORS workaround)
- `GET /boe-list` — Fetch BOE numbers for autocomplete from PrData
- `GET /test-prs` — Debug: test PrData lookup by document_no
- `GET /boe-lr-data` — Fetch full LR details for a BOE number (auto-populate form)
- `GET /boe-value-calc` — Calculate proportional assessable value from external BOE API
- `GET /boe-extract` — Fetch + parse full BOE details from external API
- `GET /distance` — Get PIN-to-PIN distance via Masters India API
- `GET /pincode/:pinCode` — Indian Postal API lookup for city/state by pincode
- `GET /lr-details` — Fetch LR + container details for EWB generation pre-fill
- `GET /lr-list` — List all LRs eligible for EWB generation
- `GET /list` — List stored EWBs with filters (status, date, search, lrId)
- `GET /ewb-part-a` — Fetch Part-A EWB details from Masters India
- `GET /transporters` — List transporter organisations
- `GET /multi-vehicle/:ewbId` — Get multi-vehicle group data for an EWB
- `GET /multi-vehicle/list` — List all vehicles in a multi-vehicle group
- `GET /pdf-proxy` and `GET /proxy-pdf` — Proxy EWB PDF download (CORS bypass)
- `POST /generate` — Generate new E-Way Bill (main endpoint)
- `POST /update-vehicle` — Part-B vehicle update
- `POST /update-transporter` — Update transporter ID
- `POST /extend-validity` — Extend EWB validity
- `POST /cancel` — Cancel an EWB
- `POST /reject` — Reject an incoming EWB
- `POST /multi-vehicle/initiate` — Start multi-vehicle movement
- `POST /multi-vehicle/add-vehicle` — Add vehicle to multi-vehicle group
- `POST /bulk-generate` — Bulk EWB generate (BulkRequest model)
- `POST /boe-upload` — Upload BOE PDF/Excel for data extraction

#### Services
| File | Path | Purpose |
|---|---|---|
| `ewayBillService.mjs` | `C:\project\eximtransport\server\services\ewayBillService.mjs` | Masters India API wrapper: auth token management, generate, cancel, update-vehicle, extend-validity, get-details, distance, multi-vehicle. 2074 lines. |
| `ewbValidationService.mjs` | `C:\project\eximtransport\server\services\ewbValidationService.mjs` | Pre-generation validators: distance override +-10%, duplicate invoice check, GSTIN format, pincode/state consistency, rejection window check. 459 lines. |
| `addressParserService.mjs` | `C:\project\eximtransport\server\services\addressParserService.mjs` | NLP-based address parser using node-nlp for extracting name/address/city/state/pincode from raw BOE address strings. Used by /boe-extract route. |

#### Models
| File | Path | Purpose |
|---|---|---|
| `EwayBill.mjs` | `C:\project\eximtransport\server\model\srcc\EwayBill.mjs` | Primary EWB record schema — stores all EWB data, vehicle update history, extension history, multi-vehicle groups. |
| `Ewaybillerrorlog.mjs` | `C:\project\eximtransport\server\model\srcc\Ewaybillerrorlog.mjs` | Validation and API error log schema. |
| `BulkRequest.mjs` | `C:\project\eximtransport\server\model\srcc\BulkRequest.mjs` | Bulk EWB generation request tracking. |

#### Documentation / Reference (copy to new project docs/)
| File | Path |
|---|---|
| `EWAY_BILL_GENERATION_FLOW_DOCUMENTATION.md` | `C:\project\eximtransport\EWAY_BILL_GENERATION_FLOW_DOCUMENTATION.md` |
| `EWB_IMPLEMENTATION_VERIFICATION.md` | `C:\project\eximtransport\EWB_IMPLEMENTATION_VERIFICATION.md` |
| `LR_EWAY_BILL_IMPLEMENTATION_GUIDE.md` | `C:\project\eximtransport\LR_EWAY_BILL_IMPLEMENTATION_GUIDE.md` |
| `LR_EWAY_BILL_QUICK_START.md` | `C:\project\eximtransport\LR_EWAY_BILL_QUICK_START.md` |
| `ewaybill_swagger.yaml` | `C:\project\eximtransport\ewaybill\ewaybill_swagger.yaml` |
| `ewaybill_api.MD` | `C:\project\eximtransport\ewaybill\ewaybill_api.MD` |
| `EWB API_EnterpriseDoc (Complete).pdf` | `C:\project\eximtransport\ewaybill\EWB API_EnterpriseDoc (Complete).pdf` |
| `SAMPLE_PAYLOADS.md` | `C:\project\eximtransport\ewaybill\SAMPLE_PAYLOADS.md` |
| `Eway_Bill_Management_Postman_Collection.json` | `C:\project\eximtransport\server\Eway_Bill_Management_Postman_Collection.json` |
| `EWB_Production_MastersIndia.postman_collection.json` | `C:\project\eximtransport\server\EWB_Production_MastersIndia.postman_collection.json` |

---

### 2.2 INDIRECT BACKEND DEPENDENCIES (Must Port or Stub)

#### A. Auth Middleware — Must Port
| File | Path | Notes |
|---|---|---|
| `authMiddleware.mjs` | `C:\project\eximtransport\server\middleware\authMiddleware.mjs` | JWT cookie (exim_token) + Bearer token auth. Reads JWT_SECRET. Fetches UserModel to validate tokenVersion. |
| `roleGuard.mjs` | `C:\project\eximtransport\server\middleware\roleGuard.mjs` | normalizeRole() helper used by authMiddleware |
| `thirdPartyApiKey.mjs` | `C:\project\eximtransport\server\middleware\thirdPartyApiKey.mjs` | Optional API key bypass used in app.mjs global auth guard |

> **Decision:** In standalone project you can simplify to a single protect JWT middleware. The thirdPartyApiKey pattern is optional but useful for service-to-service calls.

#### B. Shared Models — Must Port (Full Schema or Slim)

| Model | Path | Why EWB Needs It |
|---|---|---|
| `pr.mjs` (PrData) | `C:\project\eximtransport\server\model\srcc\pr.mjs` | LR (Lorry Receipt) record. EwayBill.lr references it. Routes /boe-lr-data, /lr-details, /boe-value-calc, /lr-list all query PrData. Contains containers sub-doc with eWay_bill, vehicle_no, goods_pickup, goods_delivery. |
| `Organisation.mjs` | `C:\project\eximtransport\server\model\srcc\Directory_Management\Organisation.mjs` | Consignor/Consignee/Transporter directory. /boe-extract queries by GSTIN. /transporters fetches all Transporter-type orgs. PrData references it via consignor/consignee ObjectId refs. |
| `userModel.mjs` | `C:\project\eximtransport\server\model\userModel.mjs` | Auth middleware fetches user by decoded.id. EwayBill references User for generatedBy, cancelledBy, rejectedBy, etc. |
| `jobModel.mjs` | `C:\project\eximtransport\server\model\jobModel.mjs` | /boe-extract does JobModel.findOne({ be_no }) to get pr_no for cross-referencing PrData. |

**Minimal PrData fields needed by EWB routes (can slim the schema):**
- `pr_no`, `pr_date`, `document_no`, `document_date`, `import_export`, `status`
- `consignor` (ref Organisation), `consignee` (ref Organisation)
- `description`
- `containers[]`: `_id`, `tr_no`, `vehicle_no`, `container_number`, `gross_weight`, `net_weight`, `no_of_pkg`, `goods_pickup` (ref Location), `goods_delivery` (ref Location), `type_of_vehicle` (ref VehicleType), `lr_completed`, `eWay_bill` (embedded EWB reference)

#### C. Logger — Must Port
| File | Path | Notes |
|---|---|---|
| `logger.js` | `C:\project\eximtransport\server\logger.js` | Winston logger with file + MongoDB transport. Both ewayBillService.mjs and ewayBillRoutes.mjs import it. In standalone you can simplify to console + winston file-only (drop the MongoDB transport). |

#### D. Utility Files — Assess Per Function
| File | Path | Used By EWB? |
|---|---|---|
| `s3.mjs` | `C:\project\eximtransport\server\utils\s3.mjs` | YES — ewayBillRoutes.mjs uses S3 for storing EWB PDFs (pdfUrl field in EwayBill). Must port if PDF upload is needed. |
| `tokens.mjs` | `C:\project\eximtransport\server\utils\tokens.mjs` | Used by login routes for JWT generation. Must port if you implement auth in standalone. |
| `shutdown.mjs` | `C:\project\eximtransport\server\utils\shutdown.mjs` | Graceful shutdown helper. Low priority — copy as-is. |
| `regex.mjs` | `C:\project\eximtransport\server\utils\regex.mjs` | Generic regex patterns. Check if referenced in EWB routes. |
| `generateBillNumber.js` | `C:\project\eximtransport\server\utils\generateBillNumber.js` | Counter-based bill numbering. Only if EWB standalone needs internal bill references. |

#### E. External API Dependencies — Standalone Config Needed
| Dependency | URL | Purpose |
|---|---|---|
| BOE (Bill of Entry) External API | `http://3.108.244.38:8002/api/v1` (hardcoded as BOE_API_BASE in ewayBillRoutes.mjs line 185) | Used by /boe-value-calc and /boe-extract to fetch customs duty data. This is a separate internal service. Must be made configurable via env var. |
| Indian Postal API | Called inside /pincode/:pinCode route (proxies to api.postalpincode.in or equivalent) | City/state lookup by pincode |
| Masters India GSP API | See env vars section | Core EWB API |

---

## 3. Frontend Files to Extract

### 3.1 CORE E-WAY BILL COMPONENTS (Must Extract)

#### Pages / Route Entry
| File | Path | Purpose |
|---|---|---|
| `EwayBillForm.js` | `c:\project\eximclientnew\client\src\components\ewaybill\EwayBillForm.js` | Route /ewaybill entry wrapper — renders CImportDSR. Currently wraps the import DSR component which contains the full EWB dashboard. |
| `CImportDSR.jsx` | `c:\project\eximclientnew\client\src\components\CImportDSR.jsx` | **IMPORTANT:** This is the parent that embeds the EWB dashboard for the /ewaybill route. Inspect for non-EWB logic (import DSR). **Risk: possible non-EWB entanglement.** |

#### Primary EWB Components
| File | Path | Size | Purpose |
|---|---|---|---|
| `EwayBillDashboard.js` | `c:\project\eximclientnew\client\src\components\ewaybill\EwayBillDashboard.js` | 69KB | Main EWB dashboard — tabs for active EWBs, pending LRs, bulk ops, reports. Calls metrics, listing, alerts. |
| `EwayBillGenerate.js` | `c:\project\eximclientnew\client\src\components\ewaybill\EwayBillGenerate.js` | 190KB | BOE-based EWB generation form — full 3-step wizard for import/export EWBs. Calls /boe-list, /boe-lr-data, /boe-extract, /distance, /generate. |
| `EwayBillGenerateLR.js` | `c:\project\eximclientnew\client\src\components\ewaybill\EwayBillGenerateLR.js` | 162KB | LR-based EWB generation form — 3-step wizard for LR-linked EWBs. Calls /lr-list, /lr-details, /distance, /generate. |
| `EwayBillBulkOperations.js` | `c:\project\eximclientnew\client\src\components\ewaybill\EwayBillBulkOperations.js` | 24KB | Bulk EWB consolidation and multi-vehicle operations UI. |
| `EwayBillLookup.js` | `c:\project\eximclientnew\client\src\components\ewaybill\EwayBillLookup.js` | 12KB | EWB lookup/search component. Calls /api/eway-bill endpoints. |
| `EwayBillReports.js` | `c:\project\eximclientnew\client\src\components\ewaybill\EwayBillReports.js` | 18KB | Reports component for EWB history. |
| `ewbContainerCoverage.js` | `c:\project\eximclientnew\client\src\components\ewaybill\ewbContainerCoverage.js` | 3KB | Helper to check EWB coverage across containers. |
| `ewbValidationHelpers.js` | `c:\project\eximclientnew\client\src\components\ewaybill\ewbValidationHelpers.js` | 15KB | Client-side EWB field validators: GSTIN, pincode, vehicle number, HSN, state matching, SEZ GSTIN detection, runClientSideValidations(). |

#### Modals (all under `Modals/`)
| File | Path | Size | Purpose |
|---|---|---|---|
| `LrEwayBillDialog.jsx` | `c:\project\eximclientnew\client\src\components\ewaybill\Modals\LrEwayBillDialog.jsx` | 111KB | Full-featured dialog for LR-based EWB operations: generate, update vehicle, extend validity, cancel, reject, multi-vehicle. Calls all /api/eway-bill/* endpoints. |
| `EWBGenerationModal.jsx` | `c:\project\eximclientnew\client\src\components\ewaybill\Modals\EWBGenerationModal.jsx` | 19KB | Simpler 3-step EWB generation modal (used by dashboard pending LRs). |
| `EwayBillActionModal.jsx` | `c:\project\eximclientnew\client\src\components\ewaybill\Modals\EwayBillActionModal.jsx` | 59KB | Action modal: update vehicle, update transporter, extend validity, cancel, multi-vehicle initiate/add. |
| `EwayBillMultiContainerDialog.jsx` | `c:\project\eximclientnew\client\src\components\ewaybill\Modals\EwayBillMultiContainerDialog.jsx` | 19KB | Multi-container EWB generation dialog — handles multiple containers on same BOE. |
| `PartAEwayBillModal.jsx` | `c:\project\eximclientnew\client\src\components\ewaybill\Modals\PartAEwayBillModal.jsx` | 17KB | Part-A EWB viewer modal — fetch and display EWB Part-A from Masters India. |
| `PartAPreview.jsx` | `c:\project\eximclientnew\client\src\components\ewaybill\Modals\PartAPreview.jsx` | 13KB | Part-A data preview panel (rendered inside PartAEwayBillModal). |

#### Dashboard Sub-components
| File | Path | Purpose |
|---|---|---|
| `MetricCards.jsx` | `c:\project\eximclientnew\client\src\components\ewaybill\Dashboard\MetricCards.jsx` | Dashboard KPI cards (active, expiring, expired, cancelled) |
| `MetricCards.scss` | `c:\project\eximclientnew\client\src\components\ewaybill\Dashboard\MetricCards.scss` | Styles for MetricCards |
| `PendingLRsTab.jsx` | `c:\project\eximclientnew\client\src\components\ewaybill\Dashboard\PendingLRsTab.jsx` | Tab showing LRs without an EWB |
| `TabNavigation.jsx` | `c:\project\eximclientnew\client\src\components\ewaybill\Dashboard\TabNavigation.jsx` | Tab bar component |
| `TabNavigation.scss` | `c:\project\eximclientnew\client\src\components\ewaybill\Dashboard\TabNavigation.scss` | Styles for TabNavigation |

#### Stylesheets
| File | Path | Notes |
|---|---|---|
| `ewaybill.scss` | `c:\project\eximclientnew\client\src\styles\ewaybill.scss` | All EWB-specific SCSS styles (1064+ lines). Referenced by all EWB components. |
| `EwayBillLookup.css` | `c:\project\eximclientnew\client\src\components\ewaybill\EwayBillLookup.css` | Lookup component styles |
| `EwayBillReports.css` | `c:\project\eximclientnew\client\src\components\ewaybill\EwayBillReports.css` | Reports component styles |

---

### 3.2 TRANSPORT TABLE INTEGRATION (Partial Extract — EWB Portion Only)

The `TransportTable.jsx` is NOT an EWB-only component, but it contains EWB integration:
- `c:\project\eximclientnew\client\src\components\Transport\TransportTable.jsx`
  - Imports `LrEwayBillDialog` from ewaybill/Modals
  - State: `isLrEwayBillDialogOpen`, `lrEwayBillMode`
  - Handler: `handleEwayBillClick()` — calls `/api/eway-bill/boe-lr-data` + `/api/eway-bill/list`
  - Renders `<LrEwayBillDialog>` for EWB generation/update from LR table rows

**Decision:** In standalone EWB project, this table integration must be rebuilt as a simple LR list page.

---

### 3.3 OTHER FRONTEND INDIRECT DEPENDENCIES

#### Utility — Must Port
| File | Path | Purpose |
|---|---|---|
| `getCityAndStateByPinCode.js` | `c:\project\eximclientnew\client\src\utils\getCityAndStateByPinCode.js` | Calls /api/eway-bill/pincode/:pinCode proxy. Used by EWB forms for address auto-fill. |
| `axiosConfig.js` | `c:\project\eximclientnew\client\src\utils\axiosConfig.js` | Axios instance config with credentials/cookie logic. All EWB API calls flow through this. |
| `cookies.js` | `c:\project\eximclientnew\client\src\utils\cookies.js` | getJsonCookie(), getCookie() used by auth check in App.js |

#### Component with EWB API Call
| File | Path | Notes |
|---|---|---|
| `BEnumberCell.jsx` | `c:\project\eximclientnew\client\src\components\BEnumberCell.jsx` | Calls /api/eway-bill/ewb-part-a and /api/eway-bill/proxy-pdf. If you want the BE number cell EWB quick-view, extract this too. |

#### Context / State Management
The EWB feature does **NOT** use Redux. All state is local React useState within each component. No Redux slices or Context to extract beyond UserContext.

| File | Path | Notes |
|---|---|---|
| `UserContext.js` | `c:\project\eximclientnew\client\src\context\UserContext.js` | Provides user object to the whole app. EWB components need user GSTIN and credentials. Must recreate in standalone. |

---

### 3.4 FRONTEND API CALL MAP

All API calls use `process.env.REACT_APP_API_STRING` as the base URL prefix.

| Component | Endpoint | Method |
|---|---|---|
| `EwayBillDashboard.js` | `/eway-bill/list` | GET |
| `EwayBillDashboard.js` | `/eway-bill/metrics` | GET |
| `EwayBillDashboard.js` | `/eway-bill/expiring-alerts` | GET |
| `EwayBillDashboard.js` | `/eway-bill/pending-lrs` | GET |
| `EwayBillGenerate.js` | `/eway-bill/boe-list` | GET |
| `EwayBillGenerate.js` | `/eway-bill/boe-lr-data` | GET |
| `EwayBillGenerate.js` | `/eway-bill/boe-extract` | GET |
| `EwayBillGenerate.js` | `/eway-bill/ewb-part-a` | GET |
| `EwayBillGenerate.js` | `/eway-bill/lr-list` | GET |
| `EwayBillGenerate.js` | `/eway-bill/transporters` | GET |
| `EwayBillGenerate.js` | `/eway-bill/distance` | GET |
| `EwayBillGenerate.js` | `/eway-bill/boe-upload` | POST |
| `EwayBillGenerate.js` | `/eway-bill/generate` | POST |
| `EwayBillGenerateLR.js` | `/eway-bill/lr-list` | GET |
| `EwayBillGenerateLR.js` | `/eway-bill/lr-details` | GET |
| `EwayBillGenerateLR.js` | `/eway-bill/distance` | GET |
| `EwayBillGenerateLR.js` | `/eway-bill/generate` | POST |
| `EwayBillLookup.js` | `/eway-bill/list` | GET |
| `EwayBillReports.js` | `/eway-bill/list` | GET (with report filters) |
| `LrEwayBillDialog.jsx` | `/eway-bill/ewb-part-a` | GET |
| `LrEwayBillDialog.jsx` | `/eway-bill/list` | GET |
| `LrEwayBillDialog.jsx` | `/eway-bill/boe-value-calc` | GET |
| `LrEwayBillDialog.jsx` | `/eway-bill/boe-extract` | GET |
| `LrEwayBillDialog.jsx` | `/eway-bill/boe-lr-data` | GET |
| `LrEwayBillDialog.jsx` | `/eway-bill/multi-vehicle/list` | GET |
| `LrEwayBillDialog.jsx` | `/eway-bill/update-vehicle` | POST |
| `LrEwayBillDialog.jsx` | `/eway-bill/extend-validity` | POST |
| `LrEwayBillDialog.jsx` | `/eway-bill/update-transporter` | POST |
| `LrEwayBillDialog.jsx` | `/eway-bill/multi-vehicle/initiate` | POST |
| `LrEwayBillDialog.jsx` | `/eway-bill/multi-vehicle/add-vehicle` | POST |
| `LrEwayBillDialog.jsx` | `/eway-bill/reject` | POST |
| `LrEwayBillDialog.jsx` | `/eway-bill/cancel` | POST |
| `LrEwayBillDialog.jsx` | `/eway-bill/pdf-proxy` | GET |
| `EWBGenerationModal.jsx` | `/eway-bill/lr-details` | GET |
| `EWBGenerationModal.jsx` | `/eway-bill/distance` | GET |
| `EWBGenerationModal.jsx` | `/eway-bill/generate` | POST |
| `EwayBillActionModal.jsx` | `/eway-bill/multi-vehicle/:ewbId` | GET |
| `EwayBillActionModal.jsx` | `/eway-bill/update-vehicle` | POST |
| `EwayBillActionModal.jsx` | `/eway-bill/update-transporter` | POST |
| `EwayBillActionModal.jsx` | `/eway-bill/extend-validity` | POST |
| `EwayBillActionModal.jsx` | `/eway-bill/cancel` | POST |
| `EwayBillActionModal.jsx` | `/eway-bill/multi-vehicle/initiate` | POST |
| `EwayBillActionModal.jsx` | `/eway-bill/multi-vehicle/add-vehicle` | POST |
| `EwayBillActionModal.jsx` | `/eway-bill/reject` | POST |
| `EwayBillMultiContainerDialog.jsx` | `/eway-bill/boe-value-calc` | GET |
| `PartAEwayBillModal.jsx` | `/eway-bill/list` | GET |
| `BEnumberCell.jsx` | `/eway-bill/ewb-part-a` | GET |
| `BEnumberCell.jsx` | `/eway-bill/proxy-pdf` | GET |
| `TransportTable.jsx` | `/eway-bill/boe-lr-data` | GET |
| `TransportTable.jsx` | `/eway-bill/list` | GET |
| `getCityAndStateByPinCode.js` | `/eway-bill/pincode/:pinCode` | GET |

---

## 4. Required Environment Variables

### 4.1 Backend Environment Variables

#### Masters India GSP API Credentials
| Variable | Example Value | Purpose |
|---|---|---|
| `EWAY_BILL_ENV` | `Testing` | Switch between Development (sandbox), Testing, Production environments. Controls which credential set is active. |
| `EWAY_BILL_DEV_API_URL` | `https://sandb-api.mastersindia.co/api/v1` | Masters India Sandbox base URL |
| `EWAY_BILL_DEV_AUTH_ENDPOINT` | `/token-auth/` | Sandbox auth endpoint path |
| `EWAY_BILL_DEV_USERNAME` | `cloud@novusha.com` | Sandbox Masters India account username |
| `EWAY_BILL_DEV_PASSWORD` | `Support@0987#!` | Sandbox Masters India account password |
| `EWAY_BILL_DEV_GSTIN` | `05AAABB0639G1Z8` | GSTIN used for sandbox EWB generation |
| `EWAY_BILL_TESTING_API_URL` | `https://clientbasic.mastersindia.co` | Testing environment base URL |
| `EWAY_BILL_TESTING_AUTH_ENDPOINT` | `/oauth/access_token` | Testing environment OAuth endpoint |
| `EWAY_BILL_TESTING_USERNAME` | `cloud@novusha.com` | Testing account username |
| `EWAY_BILL_TESTING_PASSWORD` | `Support@0987#!` | Testing account password |
| `EWAY_BILL_TESTING_GSTIN` | `05AAABB0639G1Z8` | GSTIN used for testing |
| `EWAY_BILL_PROD_API_URL` | `https://pro.mastersindia.co` | Production Masters India API base URL |
| `EWAY_BILL_PROD_AUTH_ENDPOINT` | `/oauth/access_token` | Production OAuth endpoint |
| `EWAY_BILL_PROD_USERNAME` | `cloud@novusha.com` | Production account username |
| `EWAY_BILL_PROD_PASSWORD` | `Masters@1234` | Production account password |
| `EWAY_BILL_PROD_GSTIN` | `24ANGPR7652E1Z7` | Real production GSTIN for the company |

#### Legacy / Alias Vars (also present in .env — may be used in older code paths)
| Variable | Purpose |
|---|---|
| `EWAY_BILL_API_URL` | Legacy alias for Masters India base URL |
| `EWAY_BILL_USERNAME` | Legacy alias for username |
| `EWAY_BILL_PASSWORD` | Legacy alias for password |
| `EWAY_BILL_USER_GSTIN` | Legacy alias for GSTIN |

#### Database
| Variable | Example | Purpose |
|---|---|---|
| `SERVER_MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string (used when NODE_ENV=server) |
| `PROD_MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string for production |
| `DEV_MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string for development |

#### Authentication
| Variable | Example | Purpose |
|---|---|---|
| `JWT_SECRET` | 64-char hex | Secret for signing/verifying exim_token JWTs issued by auth routes |
| `JWT_ACCESS_EXPIRES_IN` | `18h` | JWT access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | JWT refresh token TTL |

#### S3 (for EWB PDF storage)
| Variable | Example | Purpose |
|---|---|---|
| `S3_BUCKET` | `exim-images-p1` | S3 bucket name for storing generated EWB PDF URLs |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | AWS credentials for S3 upload |
| `AWS_SECRET_ACCESS_KEY` | `...` | AWS secret |
| `AWS_REGION` | `ap-south-1` | AWS region |

#### External API and Server
| Variable | Example | Purpose |
|---|---|---|
| `BOE_API_BASE_URL` | `http://3.108.244.38:8002/api/v1` | BOE extraction API. **Currently hardcoded in ewayBillRoutes.mjs line 185 as BOE_API_BASE — must be moved to env var.** |
| `PORT` | `9007` | HTTP port for the EWB backend |
| `NODE_ENV` | `production` | Runtime environment (controls MongoDB URI selection, rate limiting, log level) |
| `THIRD_PARTY_API_KEY` | `1234567890` | Optional API key for service-to-service access bypass |

#### Frontend GSTIN Config (referenced in backend .env, may be consumed by frontend build)
| Variable | Example | Purpose |
|---|---|---|
| `REACT_APP_TRANSPORTER_GSTIN` | `05AAABB0639G1Z8` | Default transporter GSTIN shown in EWB forms |
| `REACT_APP_DEFAULT_GSTIN` | `05AAABB0639G1Z8` | Default GSTIN for sandbox operations |

---

### 4.2 Frontend Environment Variables

| Variable | Example | Purpose |
|---|---|---|
| `REACT_APP_API_STRING` | `http://localhost:9007/api` | Base URL for all backend API calls. In standalone, point directly to the new EWB backend. |
| `REACT_APP_VERSION` | `12.06.02` | App version displayed in UI |
| `PORT` | `3001` | React dev server port |
| `GENERATE_SOURCEMAP` | `false` | Disable source maps in production build |

---

## 5. NPM / Package Dependencies

### 5.1 Backend (required subset from eximtransport/server/package.json)

**Required — EWB directly uses:**
```
axios              — Masters India API calls + BOE API calls
express            — HTTP server
mongoose           — MongoDB ODM (EwayBill, PrData, Organisation models)
jsonwebtoken       — JWT auth middleware
cookie-parser      — exim_token cookie extraction in authMiddleware
cors               — CORS for browser clients
dotenv             — .env loading
multer             — File upload for /boe-upload endpoint
form-data          — form-data for BOE file forwarding
winston            — Logger
node-nlp           — NLP address parsing in addressParserService
bcryptjs           — Password hashing for auth
body-parser        — req.body parsing
node-cache         — Token caching in ewayBillService
compression        — gzip compression
```

**Optional — Swagger docs:**
```
swagger-ui-express
yamljs
```

**Optional — S3 PDF storage:**
```
@aws-sdk/client-s3
```

**Can Drop (not used by EWB):**
```
mqtt, socket.io, socket.io-client  — ELock real-time
bull                               — job queue
handlebars                         — email templates
imap-simple                        — email reading
nodemailer                         — email sending
geolib                             — geolocation (fleet/elock)
exceljs, xlsx                      — fleet/DSR Excel reports
node-schedule                      — cron jobs (not used by EWB)
```

### 5.2 Frontend (required subset from eximclientnew/client/package.json)

**Required:**
```
react, react-dom            — Core framework
react-router-dom (v6)       — Routing (/ewaybill, /login)
axios                       — API calls
sweetalert2                 — Swal.fire alerts used throughout EWB components
@mui/material               — MUI TextField, Dialog, Button, Autocomplete, etc.
@mui/icons-material         — MUI icons
@emotion/react              — MUI peer dep
@emotion/styled             — MUI peer dep
sass                        — For ewaybill.scss compilation
```

**Verify if used in EWB components (grep before adding):**
```
antd                        — App.js uses ConfigProvider + antdTheme; check if EWB components use Ant Design
dayjs / moment              — Date formatting in forms
```

**Can Drop:**
```
Redux Toolkit / react-redux — EWB uses no Redux
socket.io-client            — ELock only
All Elock-specific packages
```

---

## 6. Suggested Folder Structure for New Standalone Project

```
ewb-standalone/
├── README.md
├── docker-compose.yml
│
├── backend/
│   ├── .env                                          # All EWAY_BILL_*, JWT_*, MongoDB, AWS vars
│   ├── .env.example
│   ├── package.json
│   ├── nodemon.json
│   ├── app.mjs                                       # NEW: minimal express app
│   ├── logger.js                                     # PORTED: eximtransport/server/logger.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.mjs                        # PORTED: eximtransport/server/middleware/authMiddleware.mjs
│   │   └── roleGuard.mjs                             # PORTED: eximtransport/server/middleware/roleGuard.mjs
│   │
│   ├── routes/
│   │   └── ewaybill/
│   │       └── ewayBillRoutes.mjs                    # PORTED: eximtransport/server/routes/ewaybill/ewayBillRoutes.mjs
│   │
│   ├── services/
│   │   ├── ewayBillService.mjs                       # PORTED: eximtransport/server/services/ewayBillService.mjs
│   │   ├── ewbValidationService.mjs                  # PORTED: eximtransport/server/services/ewbValidationService.mjs
│   │   └── addressParserService.mjs                  # PORTED: eximtransport/server/services/addressParserService.mjs
│   │
│   ├── model/
│   │   ├── EwayBill.mjs                              # PORTED: eximtransport/server/model/srcc/EwayBill.mjs
│   │   ├── EwayBillErrorLog.mjs                      # PORTED: eximtransport/server/model/srcc/Ewaybillerrorlog.mjs
│   │   ├── BulkRequest.mjs                           # PORTED: eximtransport/server/model/srcc/BulkRequest.mjs
│   │   ├── PrData.mjs                                # PORTED (slimmed): eximtransport/server/model/srcc/pr.mjs
│   │   ├── Organisation.mjs                          # PORTED: eximtransport/server/model/srcc/Directory_Management/Organisation.mjs
│   │   ├── Job.mjs                                   # PORTED (minimal): eximtransport/server/model/jobModel.mjs
│   │   └── User.mjs                                  # PORTED: eximtransport/server/model/userModel.mjs
│   │
│   ├── utils/
│   │   ├── s3.mjs                                    # PORTED: eximtransport/server/utils/s3.mjs
│   │   ├── tokens.mjs                                # PORTED: eximtransport/server/utils/tokens.mjs
│   │   └── shutdown.mjs                              # PORTED: eximtransport/server/utils/shutdown.mjs
│   │
│   └── docs/
│       └── ewaybill_swagger.yaml                     # PORTED: eximtransport/ewaybill/ewaybill_swagger.yaml
│
└── frontend/
    ├── .env                                          # REACT_APP_API_STRING=http://localhost:9007/api
    ├── .env.example
    ├── package.json
    ├── public/
    └── src/
        ├── App.js                                    # NEW: minimal router with /ewaybill + /login routes
        ├── index.js
        ├── index.css
        │
        ├── components/
        │   └── ewaybill/                             # PORTED: all from client/src/components/ewaybill/
        │       ├── EwayBillDashboard.js
        │       ├── EwayBillGenerate.js
        │       ├── EwayBillGenerateLR.js
        │       ├── EwayBillBulkOperations.js
        │       ├── EwayBillLookup.js
        │       ├── EwayBillReports.js
        │       ├── EwayBillForm.js
        │       ├── ewbContainerCoverage.js
        │       ├── ewbValidationHelpers.js
        │       ├── EwayBillLookup.css
        │       ├── EwayBillReports.css
        │       ├── Dashboard/
        │       │   ├── MetricCards.jsx
        │       │   ├── MetricCards.scss
        │       │   ├── PendingLRsTab.jsx
        │       │   ├── TabNavigation.jsx
        │       │   └── TabNavigation.scss
        │       └── Modals/
        │           ├── LrEwayBillDialog.jsx
        │           ├── EWBGenerationModal.jsx
        │           ├── EwayBillActionModal.jsx
        │           ├── EwayBillMultiContainerDialog.jsx
        │           ├── PartAEwayBillModal.jsx
        │           └── PartAPreview.jsx
        │
        ├── pages/
        │   ├── LoginPage.jsx                         # NEW: simplified login page
        │   └── EwayBillPage.jsx                      # NEW: wraps EwayBillDashboard for /ewaybill route
        │
        ├── context/
        │   └── UserContext.js                        # PORTED: client/src/context/UserContext.js
        │
        ├── utils/
        │   ├── getCityAndStateByPinCode.js           # PORTED: client/src/utils/getCityAndStateByPinCode.js
        │   ├── axiosConfig.js                        # PORTED/ADAPTED: client/src/utils/axiosConfig.js
        │   └── cookies.js                            # PORTED: client/src/utils/cookies.js
        │
        └── styles/
            └── ewaybill.scss                         # PORTED: client/src/styles/ewaybill.scss
```

---

## 7. Known Risks and Coupling Points

### RISK 1 — PrData (LR) Is a Large, Deeply Coupled Model — SEVERITY: HIGH
**Problem:** `ewayBillRoutes.mjs` queries `PrData` with `.populate("consignor", ...)`, `.populate("consignee", ...)`, `.populate("containers.goods_pickup", ...)`, etc. PrData's full schema (`pr.mjs`) references `Organisation`, `PortICDcode`, `VehicleType`, `DriverDetails`, and more.

**Mitigation:** Create a slimmed-down `PrData` schema for the standalone app that keeps only the fields EWB routes actually read. Write a data migration script to sync needed LRs from the main DB.

---

### RISK 2 — EwayBillForm.js Renders CImportDSR — SEVERITY: HIGH
**Problem:** The `/ewaybill` route renders `EwayBillForm` which renders `CImportDSR.jsx` — a large import job DSR component. If EWB logic is embedded inside CImportDSR rather than being a clean tab/import, the entanglement will be deep.

**Mitigation:** Inspect `CImportDSR.jsx` to determine if it is a parent wrapper that merely routes to EWB components, or if EWB logic is interleaved with import DSR logic. If entangled, extract only the EWB tab/section.

---

### RISK 3 — BOE_API_BASE Hardcoded in Routes — SEVERITY: MEDIUM
**Problem:** Line 185 of `ewayBillRoutes.mjs`:
```
const BOE_API_BASE = "http://3.108.244.38:8002/api/v1";
```
This IP address is an internal API for Bill of Entry extraction. It is hardcoded — not read from .env.

**Mitigation:** Replace with `process.env.BOE_API_BASE_URL` before extraction.

---

### RISK 4 — S3 PDF URLs Stored but S3 Utils May Not Be Included — SEVERITY: MEDIUM
**Problem:** The `pdfUrl` field in `EwayBill.mjs` stores S3 URLs. The `/pdf-proxy` and `/proxy-pdf` routes serve PDFs. `s3.mjs` handles uploads. If S3 credentials are not configured in the standalone project, PDF storage/download will fail silently.

**Mitigation:** Configure AWS env vars and port `utils/s3.mjs`. Alternatively, store PDFs in a local filesystem as a simple alternative for v1.

---

### RISK 5 — Shared MongoDB Database — SEVERITY: HIGH
**Problem:** Both the existing full-stack app and the standalone EWB project will write to the same `EwayBill`, `PrData`, `Organisation`, and `User` collections in MongoDB Atlas. Race conditions and data conflicts are possible.

**Mitigation options:**
1. Give the standalone project read-only access to `PrData`/`Organisation`/`User` from the production DB, but read-write access to `EwayBill` and `EwayBillErrorLog` only.
2. Create a separate MongoDB database for the standalone EWB project and sync needed data via a migration/replication script.
3. Route all EWB operations through the existing transport backend API rather than having the standalone project write directly to MongoDB.

---

### RISK 6 — Auth Coupling Between eximclientnew/server and eximtransport/server — SEVERITY: HIGH
**Problem:** The frontend authenticates via `eximclientnew/server` (port 9003). That server issues the `exim_token` JWT cookie. The transport backend validates the same JWT using the same `JWT_SECRET`. In the standalone project, you will need your own auth service issuing your own JWT — requiring all users to re-authenticate.

**Mitigation:** Copy the login route from either server, use the same `JWT_SECRET` initially for compatibility, then rotate it once independent.

---

### RISK 7 — node-nlp Alpha Package for Address Parsing — SEVERITY: LOW-MEDIUM
**Problem:** `addressParserService.mjs` uses `node-nlp@5.0.0-alpha.5` which is in alpha. It also calls an external Postal API for pincode lookups. This creates a double external API dependency for the `/boe-extract` endpoint.

**Mitigation:** This is only used for the `/boe-extract` route's NLP address parsing. If BOE extraction is not critical in v1, stub this service and return the raw address string.

---

### RISK 8 — EwayBillDashboard.js Calls Endpoints That Need Verification — SEVERITY: MEDIUM
**Problem:** `EwayBillDashboard.js` calls `/eway-bill/metrics`, `/eway-bill/expiring-alerts`, and `/eway-bill/pending-lrs` endpoints. These need to be verified as present in the 3929-line `ewayBillRoutes.mjs`. If they exist as inline handlers, they may query multiple other models.

**Mitigation:** Grep the route file for these exact path strings and verify their implementations before extraction.

---

### RISK 9 — TransportTable EWB Integration Requires LR List — SEVERITY: MEDIUM
**Problem:** The LR table-based EWB flow (Transport → LR row → E-Way Bill button) requires a fully functional LR management table in the standalone project. Recreating even a read-only LR list requires `PrData` and associated models.

**Mitigation:** For v1 standalone, drop the LR table integration and use only the `/ewaybill` dashboard route which loads LRs from the backend. Add LR table later.

---

### RISK 10 — EwayBill.lr ObjectId Ref to PrData — SEVERITY: MEDIUM
**Problem:** The `EwayBill.lr` field is an ObjectId reference to `PrData`. If the standalone project uses a different MongoDB database, these ObjectIds will not resolve. Mongoose `.populate("lr")` calls will return null.

**Mitigation:** Either share the same DB, or store `pr_no` as a string denormalized field alongside the ObjectId, and skip `.populate()` in the standalone project.

---

### RISK 11 — Axios Global Interceptor in ewayBillService.mjs — SEVERITY: MEDIUM
**Problem:** `ewayBillService.mjs` attaches a global `axios.interceptors.response` handler for 401 auto-retry. This mutates the global axios instance and could interfere with other axios calls in the standalone backend.

**Mitigation:** Use `axios.create()` to create a scoped instance inside `EwayBillService` instead of modifying the global `axios` object.

---

### RISK 12 — useFetchJobsData.jsx Has EWB-Specific Pathname Checks — SEVERITY: LOW
**Problem:** `c:\project\eximclientnew\client\src\customHooks\useFetchJobsData.jsx` has `if (window.location.pathname.includes("ewaybill"))` checks (lines 177, 251) that alter data fetching behavior when on the EWB page. This hook is used by other components too.

**Mitigation:** This hook is likely not needed in the standalone EWB app. Do not extract it.

---

## 8. Bootstrap Task Checklist

| # | Task | Priority |
|---|---|---|
| 1 | Copy `ewayBillRoutes.mjs`, `ewayBillService.mjs`, `ewbValidationService.mjs`, `addressParserService.mjs` | P0 |
| 2 | Copy `EwayBill.mjs`, `Ewaybillerrorlog.mjs`, `BulkRequest.mjs` models | P0 |
| 3 | Port slim `PrData` schema (only EWB-needed fields) | P0 |
| 4 | Port `Organisation.mjs`, `User.mjs` models | P0 |
| 5 | Port `authMiddleware.mjs`, `roleGuard.mjs` | P0 |
| 6 | Port `logger.js` | P0 |
| 7 | Write new minimal `app.mjs` with CORS, cookie-parser, auth middleware, /api/eway-bill mount | P0 |
| 8 | Copy all EWAY_BILL_* vars, JWT_*, DB URI, AWS vars to new .env | P0 |
| 9 | Replace hardcoded `BOE_API_BASE` constant in ewayBillRoutes.mjs with `process.env.BOE_API_BASE_URL` | P0 |
| 10 | Copy all /ewaybill/ frontend components, modals, Dashboard sub-components | P0 |
| 11 | Copy `ewaybill.scss`, `EwayBillLookup.css`, `EwayBillReports.css` | P0 |
| 12 | Copy `getCityAndStateByPinCode.js`, `axiosConfig.js`, `cookies.js` | P0 |
| 13 | Copy `ewbValidationHelpers.js` | P0 |
| 14 | Write new `App.js` with minimal routing (/login, /ewaybill) | P0 |
| 15 | Write new `UserContext.js` | P0 |
| 16 | Set `REACT_APP_API_STRING` in frontend .env to point to new standalone backend | P0 |
| 17 | Investigate `CImportDSR.jsx` for EWB entanglement before deciding extraction approach | P1 |
| 18 | Port `utils/s3.mjs` + configure AWS env vars | P1 |
| 19 | Port `utils/tokens.mjs` for login route | P1 |
| 20 | Write minimal login route for standalone auth | P1 |
| 21 | Port `JobModel` (slim — just `be_no` + `pr_no` fields needed by /boe-extract) | P1 |
| 22 | Fix global axios interceptor in ewayBillService — use `axios.create()` scoped instance | P2 |
| 23 | Set `EWAY_BILL_ENV=Testing` and verify sandbox EWB generation end-to-end | P2 |
| 24 | Set up Swagger docs at /docs using `ewaybill_swagger.yaml` | P3 |
