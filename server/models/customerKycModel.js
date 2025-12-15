import mongoose from "mongoose";

// Sub-schema for AEO Certificates
const aeoCertificateSchema = new mongoose.Schema({
  aeo_tier: String,
  certificate_no: String,
  certificate_issue_date: Date,
  certificate_validity_date: Date,
  certificate_present_validity_status: String,
  addedAt: { type: Date, default: Date.now },
});

const customerKycSchema = new mongoose.Schema(
  {
    module: String,
    category: String,
    name_of_individual: String,
    status: String,
    factory_addresses: [
      {
        factory_address_line_1: String,
        factory_address_line_2: String,
        factory_address_city: String,
        factory_address_state: String,
        factory_address_pin_code: String,
        gst: String,
        // CHANGED: String -> [String] because error said gst_reg was an array
        gst_reg: [String],
      },
    ],
    permanent_address_line_1: String,
    permanent_address_line_2: String,
    permanent_address_city: String,
    permanent_address_state: String,
    permanent_address_pin_code: String,
    permanent_address_telephone: String,
    permanent_address_email: String,
    principle_business_address_line_1: String,
    principle_business_address_line_2: String,
    principle_business_address_city: String,
    principle_business_address_state: String,
    principle_business_address_pin_code: String,
    principle_address_email: String,
    principle_business_telephone: String,
    principle_business_website: String,

    // CHANGED: String -> [String] for all document fields based on your error logs
    authorised_signatories: [String],
    authorisation_letter: [String],
    iec_no: String,
    iec_copy: [String],
    pan_no: String,
    pan_copy: [String],

    // AEO FIELDS (Using the sub-schema for multiple certificates)
    aeo_certificates: [aeoCertificateSchema],

    // Legacy/Top-level tracking fields
    last_aeo_verification: Date,
    aeo_reminder_sent: { type: Boolean, default: false },
    last_reminder_sent: { type: Date, default: null },
    reminder_count: { type: Number, default: 0 },

    banks: [
      {
        bankers_name: String,
        branch_address: String,
        account_no: String,
        ifsc: String,
        ad_code: String,
        ad_code_file: [String], // Updated to array just in case
      },
    ],

    // ALL DOCUMENT FIELDS UPDATED TO [String] TO FIX CAST ERRORS
    other_documents: [String],
    spcb_reg: [String],
    kyc_verification_images: [], // Already an array
    gst_returns: [], // Already an array

    // Individual Documents
    individual_passport_img: [String],
    individual_voter_card_img: [String],
    individual_driving_license_img: [String],
    individual_bank_statement_img: [String],
    individual_ration_card_img: [String],
    individual_aadhar_card: [String],

    // Partnership Documents
    partnership_registration_certificate_img: [String],
    partnership_deed_img: [String],
    partnership_power_of_attorney_img: [String],
    partnership_valid_document: [String],
    partnership_aadhar_card_front_photo: [String],
    partnership_aadhar_card_back_photo: [String],
    partnership_telephone_bill: [String],

    // Company Documents
    company_certificate_of_incorporation_img: [String],
    company_memorandum_of_association_img: [String],
    company_articles_of_association_img: [String],
    company_power_of_attorney_img: [String],
    company_telephone_bill_img: [String],
    company_pan_allotment_letter_img: [String],

    // Trust Documents
    trust_certificate_of_registration_img: [String],
    trust_power_of_attorney_img: [String],
    trust_officially_valid_document_img: [String],
    trust_resolution_of_managing_body_img: [String],
    trust_telephone_bill_img: [String],

    trust_name_of_trustees: String,
    trust_name_of_founder: String,
    trust_address_of_founder: String,
    trust_telephone_of_founder: String,
    trust_email_of_founder: String,

    approval: String,
    draft: String,
    remarks: String,
    approved_by: String,
  },
  {
    timestamps: true,
  }
);

const CustomerKycModel = mongoose.model("customerKyc", customerKycSchema);
export default CustomerKycModel;
