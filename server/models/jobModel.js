import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema({
  url: { type: String, trim: true },
});

const cthDocumentSchema = new mongoose.Schema({
  cth: { type: Number, trim: true },
  document_name: { type: String, trim: true },
  document_code: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  irn: { type: String, trim: true },
  document_check_date: { type: String, trim: true },
});

const documentSchema = new mongoose.Schema({
  document_name: { type: String, trim: true },
  document_code: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  irn: { type: String, trim: true },
  document_check_date: { type: String, trim: true },
});

// const doPlanHistorySchema = new mongoose.Schema(
//   {
//     action: {
//       type: String,
//       enum: ["planned", "canceled"],
//       required: true,
//     },
//     timestamp: {
//       type: Date,
//       required: true,
//     },
//     jobId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//     },
//   },
//   { _id: false }
// );

const jobSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now, // Automatically sets the current date and time
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },

  job_date: {
    type: String,
    trim: true,
    default: () => new Date().toISOString(), // Optional for specific fields like `job_date`
  },
  do_planning_history: [
    {
      action: { type: String, required: true },
      timestamp: { type: String, required: true },
      jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" }, // optional
    },
  ],
  net_weight_calculator: {
  shipping: { type: String, trim: true, default: "0.00" },
  custom_clearance_charges: { type: String, trim: true, default: "0.00" },
  detention: { type: String, trim: true, default: "0.00" },
  cfs: { type: String, trim: true, default: "0.00" },
  transport: { type: String, trim: true, default: "0.00" },
  Labour: { type: String, trim: true, default: "0.00" },
  weight: { type: String, trim: true, default: "0.00" },
  total_cost: { type: String, trim: true, default: "0.00" },
  per_kg_cost: { type: String, trim: true, default: "0.00" },
  custom_fields: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      value: { type: String, default: "0.00" }
    }
  ]
},
  ////////////////////////////////////////////////// Excel sheet
  year: { type: String, trim: true },
  job_no: { type: String, trim: true },

  custom_house: { type: String, trim: true },
  job_date: { type: String, trim: true },
  importer: { type: String, trim: true },
  supplier_exporter: { type: String, trim: true },
  invoice_number: { type: String, trim: true },
  invoice_date: { type: String, trim: true },
  awb_bl_no: { type: String, trim: true },
  awb_bl_date: { type: String, trim: true },
  description: { type: String, trim: true },
  be_no: { type: String, trim: true },
  in_bond_be_no: { type: String, trim: true },
  be_date: { type: String, trim: true },
  in_bond_be_date: { type: String, trim: true },
  type_of_b_e: { type: String, trim: true },
  no_of_pkgs: { type: String, trim: true },
  unit: { type: String, trim: true },
  gross_weight: { type: String, trim: true },
  fristCheck: { type: String, trim: true },
  job_net_weight: { type: String, trim: true },
  priorityJob: { type: String, trim: true, default: "Normal" },
  unit_1: { type: String, trim: true },
  gateway_igm: { type: String, trim: true },
  gateway_igm_date: { type: String, trim: true },
  hss: { type: String, trim: true, default: "No" },
  Seller_name: { type: String, trim: true },
  igm_no: { type: String, trim: true },
  igm_date: { type: String, trim: true },
  loading_port: { type: String, trim: true },
  origin_country: { type: String, trim: true },
  port_of_reporting: { type: String, trim: true },
  shipping_line_airline: { type: String, trim: true },
  branchSrNo: { type: String, trim: true },
  adCode: { type: String, trim: true },
  isDraftDoc: { type: Boolean },
  fta_Benefit_date_time: { type: String, trim: true },
  exBondValue: { type: String, trim: true },
  scheme: { type: String, trim: true },
  clearanceValue: { type: String, trim: true },
  line_no: { type: String, trim: true },
  ie_code_no: { type: String, trim: true },


  container_nos: [
    {
      container_number: { type: String, trim: true },
      arrival_date: { type: String, trim: true },
      detention_from: { type: String, trim: true },
      size: { type: String, trim: true },
      physical_weight: { type: String, trim: true },
      tare_weight: { type: String, trim: true },
      net_weight: { type: String, trim: true },
      container_gross_weight: { type: String, trim: true },
      actual_weight: { type: String, trim: true },
      transporter: { type: String, trim: true },
      vehicle_no: { type: String, trim: true },
      driver_name: { type: String, trim: true },
      driver_phone: { type: String, trim: true },
      seal_no: { type: String, trim: true },
      pre_weighment: { type: String, trim: true },
      post_weighment: { type: String, trim: true },
      weight_shortage: { type: String, trim: true },
      weight_excess: { type: String, trim: true },
      weighment_slip_images: [{ type: String, trim: true }],
      container_pre_damage_images: [{ type: String, trim: true }],
      container_images: [{ type: String, trim: true }],
      loose_material: [{ type: String, trim: true }],
      examination_videos: [{ type: String, trim: true }],
      do_revalidation_date: { type: String, trim: true },
      do_validity_upto_container_level: { type: String, trim: true },
      required_do_validity_upto: { type: String, trim: true },
      seal_number: { type: String, trim: true },
      container_rail_out_date: {type: String, trim: true},
      by_road_movement_date: { type: String, trim: true },
      emptyContainerOffLoadDate: { type: String, trim: true },
       net_weight_as_per_PL_document: { type: String, trim: true },
       delivery_chalan_file: { type: String, trim: true },
      delivery_date: {
        type: String,
        trim: true,
      },
        
      do_revalidation: [
        {
          do_revalidation_upto: { type: String },
          remarks: { type: String },
          do_Revalidation_Completed: { type: Boolean, default: false },
        },
      ],
    },
  ],
  is_checklist_aprroved: { type: Boolean, default: false },
  is_checklist_aprroved_date: { type: String, trim: true },
  is_checklist_clicked: { type: Boolean, trim: true },
  remark_client: { type: String, trim: true },
  container_count: { type: String, trim: true },
  no_of_container: { type: String, trim: true },
  toi: { type: String, trim: true },
  unit_price: { type: String, trim: true },
  cif_amount: { type: String, trim: true },
  assbl_value: { type: String, trim: true },
  total_duty: { type: String, trim: true },
  out_of_charge: { type: String, trim: true },
  consignment_type: { type: String, trim: true },
  bill_no: { type: String, trim: true },
  bill_date: { type: String, trim: true },
  cth_no: { type: String, trim: true },
  exrate: { type: String, trim: true },
  inv_currency: { type: String, trim: true },
  vessel_berthing: {
    type: String,
    trim: true,
  },
  importer_address: { type: String },
  vessel_flight: { type: String },
  voyage_no: { type: String },
  job_owner: { type: String },
  hss_name: { type: String },
  total_inv_value: { type: String },

  ////////////////////////////////////////////////// DSR
  importerURL: { type: String, trim: true },
  checklist: [{ type: String }],
  checkedDocs: [{ type: String }],
  // *******
  status: { type: String, trim: true },
  detailed_status: { type: String, trim: true },
  // *******
  obl_telex_bl: { type: String },
  document_received_date: { type: String, trim: true },
  doPlanning: { type: Boolean, default: false },
  do_planning_date: { type: String, trim: true },
  type_of_Do: { type: String },
  do_validity_upto_job_level: { type: String, trim: true },
  do_revalidation_upto_job_level: { type: String, trim: true },
  do_revalidation: { type: Boolean },
  do_revalidation_date: { type: String },
  rail_out_date: { type: String },
  examinationPlanning: { type: Boolean },
  examination_planning_date: { type: String, trim: true },
  processed_be_attachment: [{ type: String }],
  ooc_copies: [{ type: String }],
  in_bond_ooc_copies: [{ type: String }],
  gate_pass_copies: [{ type: String }],
  // *******
  sims_reg_no: {
    type: String,
    trim: true,
  },
  pims_reg_no: {
    type: String,
    trim: true,
  },
  nfmims_reg_no: {
    type: String,
    trim: true,
  },
  sims_date: {
    type: String,
    trim: true,
  },
  pims_date: {
    type: String,
    trim: true,
  },
  nfmims_date: {
    type: String,
    trim: true,
  },
  // *******
  discharge_date: {
    type: String,
    trim: true,
  },
  assessment_date: {
    type: String,
    trim: true,
  },
  duty_paid_date: {
    type: String,
    trim: true,
  },
  do_validity: { type: String, trim: true },
  // delivery_date: {
  //   type: String,
  //   trim: true,
  // },
  containers_arrived_on_same_date: Boolean,
  // *******
  remarks: { type: String, trim: true },
  // *******
  free_time: { type: Number, trim: true },
  is_free_time_updated: { type: Boolean, default: false },
  factory_weighment_slip: { type: String, trim: true },
  assessable_ammount: { type: String, trim: true },

  ////////////////////////////////////////////////// E-sanchit
  esanchit_completed_date_time: { type: String, trim: true },

  ////////////////////////////////////////////////// DO
  shipping_line_bond_completed: { type: String, trim: true },
  shipping_line_bond_completed_date: { type: String, trim: true },
  shipping_line_kyc_completed: { type: String, trim: true },
  shipping_line_kyc_completed_date: { type: String, trim: true },
  shipping_line_invoice_received: { type: String, trim: true },
  shipping_line_invoice_received_date: { type: String, trim: true },
  shipping_line_insurance: [{ type: String, trim: true }],
  // *******
  security_deposit: { type: String },
  security_amount: { type: String },
  utr: [
    {
      type: String,
      trim: true,
    },
  ],
  shipping_line_attachment: [
    {
      type: String,
      trim: true,
    },
  ],
  other_invoices: { type: String, trim: true },
  other_invoices_img: [{ type: String, trim: true }],
  other_invoices_date: { type: String, trim: true },
  payment_made: { type: String, trim: true },
  payment_made_date: { type: String, trim: true },
  payment_method: { type: String, trim: true, default: "Transaction" },
  do_processed: { type: String, trim: true },
  do_documents: [{ type: String, trim: true }],
  do_processed_date: { type: String, trim: true },
  do_copies: [{ type: String }],
  shipping_line_invoice: { type: String, trim: true },
  shipping_line_invoice_date: { type: String },
  shipping_line_invoice_imgs: [{ type: String, trim: true }],
  do_queries: [{ query: { type: String }, reply: { type: String } }],
  do_completed: { type: String, trim: true },
  // *******
  icd_cfs_invoice: { type: String, trim: true },
  icd_cfs_invoice_img: [{ type: String, trim: true }],
  icd_cfs_invoice_date: { type: String, trim: true },
  bill_document_sent_to_accounts: { type: String, trim: true },

  do_received: { type: String, trim: true },
  do_received_date: { type: String, trim: true },

  ////////////////////////////////////////////////// documentation
  documentation_completed_date_time: { type: String, trim: true },

  ////////////////////////////////////////////////// Operations
  pcv_date: { type: String },
  examination_date: {
    type: String,
    trim: true,
  },
  concor_gate_pass_date: { type: String, trim: true },
  concor_gate_pass_validate_up_to: { type: String, trim: true },
  completed_operation_date: { type: String, trim: true },
  custodian_gate_pass: [{ type: String, trim: true }],
  concor_invoice_and_receipt_copy: [{ type: String, trim: true }],

  ////////////////////////////////////////////////// LR
  pr_no: { type: String, trim: true },
  pr_date: { type: String, trim: true },
  consignor: { type: String },
  consignee: { type: String },
  type_of_vehicle: { type: String },
  description_srcc: { type: String },
  container_loading: { type: String },
  container_offloading: { type: String },
  instructions: { type: String },
  goods_pickup: { type: String },
  goods_delivery: { type: String },

  ////////////////////////////////////////////////// CTH Documents
  cth_documents: [cthDocumentSchema],
  eSachitQueries: [{ query: { type: String }, reply: { type: String } }],

  ////////////////////////////////////////////////////// Documents
  documents: [documentSchema],
  all_documents: [{ type: String, trim: true }],

  ////////////////////////////////////////////////////// Documentation
  document_entry_completed: { type: Boolean },
  documentationQueries: [
    {
      query: { type: String },
      reply: { type: String },
    },
  ],
  /////////////////////////////////// Do Charges Details

  do_shipping_line_invoice: [{
  document_name: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  is_draft: { type: Boolean },
  is_final: { type: Boolean },
  document_check_date: { type: String, trim: true }, // This will store ISO string when checked
  document_check_status: { type: Boolean, default: false }, // New field to track if document is checked
  payment_mode: { type: String, trim: true }, // Odex or Wire Transfer
  wire_transfer_method: { type: String, trim: true }, // RTGS, NEFT, IMPS (new field)
  document_amount_details: { type: String, trim: true },
  payment_request_date: { type: String, trim: true },
  payment_made_date: { type: String, trim: true },
  is_tds: { type: Boolean, default: false },
  is_payment_made: { type: Boolean, default: false },
  is_payment_requested: { type: Boolean, default: false },
  is_non_tds: { type: Boolean, default: false },
  payment_recipt: [{ type: String, trim: true }],
  payment_recipt_date: { type: String, trim: true },
}],

insurance_copy: [{
  document_name: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  document_check_date: { type: String, trim: true },
  document_amount_details: { type: String, trim: true },
}],

other_do_documents:[ {
  document_name: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  document_check_date: { type: String, trim: true },
  document_amount_details: { type: String, trim: true },
}],

security_deposit: [{
  document_name: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  document_check_date: { type: String, trim: true },
  document_amount_details: { type: String, trim: true },
  utr: { type: Number, trim: true },
  Validity_upto: { type: String, trim: true },
}],

  ////////////////////////////////////////////////////// Submission
  checklist_verified_on: { type: String },
  submission_date: { type: String },
  submissionQueries: [
    {
      query: { type: String },
      reply: { type: String },
    },
  ],
  verified_checklist_upload: [{ type: String, trim: true }],
  verified_checklist_upload_date_and_time: { type: String },
  submission_completed_date_time: { type: String },
  job_sticker_upload: [{ type: String, trim: true }],
  job_sticker_upload_date_and_time: { type: String },
});

// Automatically update `updatedAt` and calculate per_kg_cost before saving
jobSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  
  // Auto-calculate per_kg_cost if duty and weight are available
  const dutyAmount = parseFloat(this.total_duty) || 0;
  const netWeight = parseFloat(this.job_net_weight) || 0;
  
  if (dutyAmount > 0 && netWeight > 0) {
    const perKgCost = (dutyAmount / netWeight).toFixed(2);
    
    // Initialize net_weight_calculator if it doesn't exist
    if (!this.net_weight_calculator) {
      this.net_weight_calculator = {};
    }
    
    // Update per_kg_cost
    this.net_weight_calculator.per_kg_cost = perKgCost.toString();
  }
  
  next();
});

jobSchema.index({ importerURL: 1, year: 1, status: 1 });
jobSchema.index({ year: 1, job_no: 1 }, { unique: true });
jobSchema.index({ "do_planning_history.timestamp": 1 });

const JobModel = mongoose.models.Job || mongoose.model("Job", jobSchema);

export default JobModel;
