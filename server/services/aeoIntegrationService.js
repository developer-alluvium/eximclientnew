// services/aeoIntegrationService.js
import CustomerKycModel from "../models/customerKycModel.js";
import EximclientUser from "../models/eximclientUserModel.js";
import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";

export class AEOIntegrationService {
  static AEOINDIA_CERT_VIEW =
    "https://www.aeoindia.gov.in/certificatedetailview";

  static HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  };

  static REQUEST_TIMEOUT = 30000;

  static cleanWhitespace(s) {
    if (s === undefined || s === null) return "";
    return String(s).replace(/\s+/g, " ").trim();
  }

  /**
   * Fetch AEO data from AEO India using certificate number
   */
  static async fetchFromAEOIndia(certificateNumber) {
    if (!certificateNumber) {
      throw new Error("Certificate number is required for AEO India lookup");
    }

    try {
      const axiosInstance = axios.create({
        headers: { ...this.HEADERS },
        timeout: this.REQUEST_TIMEOUT,
        maxRedirects: 5,
      });

      const payload = {
        tbx_nm_certificate_number: certificateNumber,
        sbtmbtn_nm_View_Certificate_Details: "",
      };

      console.log(
        `Fetching AEO India data for certificate: ${certificateNumber}`
      );

      const response = await axiosInstance.post(
        this.AEOINDIA_CERT_VIEW,
        qs.stringify(payload),
        {
          headers: {
            ...this.HEADERS,
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: "https://www.aeoindia.gov.in",
            Referer: "https://www.aeoindia.gov.in/certificatedetailview",
          },
        }
      );

      const htmlText = response.data;
      const aeoIndiaData = this.parseAeoindiaResponse(htmlText);

      console.log("AEO India data fetched successfully:", aeoIndiaData);
      return this.formatAEOIndiaData(aeoIndiaData);
    } catch (error) {
      console.error("AEO India fetch error:", error.message);
      throw new Error(`AEO India fetch failed: ${error.message}`);
    }
  }

  /**
   * Parse AEO India response - Extract all fields from HTML
   */
  static parseAeoindiaResponse(htmlText) {
    const $ = cheerio.load(htmlText);
    const data = {};

    // Parse label-data pairs
    const labels = $(".tdCompanyDetailsLable");
    const datas = $(".tdCompanyDetailsdata");

    if (labels.length && datas.length && labels.length === datas.length) {
      for (let i = 0; i < labels.length; i++) {
        const lab = this.cleanWhitespace($(labels[i]).text()).replace(/:$/, "");
        const val = this.cleanWhitespace($(datas[i]).text());
        data[lab] = val;
      }
    }

    // Extract specific fields with fallbacks
    const fieldMappings = [
      "Company Name",
      "Company Address",
      "Certificate Number",
      "IEC Number",
      "AEO Tier",
      "Zone",
      "Certificate Issue Date",
      "Certificate Validaity Date", // Note: This is the correct spelling from the portal
      "Certificate Present Validity Date",
      "Certificate Present Validity Status",
    ];

    fieldMappings.forEach((field) => {
      const element = $(`*:contains('${field}')`)
        .filter(function () {
          return $(this).text().includes(field);
        })
        .first();

      if (element.length) {
        const parent = element.parent();
        if (parent.length) {
          const dataElement = parent.nextAll(".tdCompanyDetailsdata").first();
          if (dataElement.length) {
            data[field] = this.cleanWhitespace(dataElement.text());
          } else {
            const text = this.cleanWhitespace(parent.text());
            if (text.includes(":")) {
              data[field] = this.cleanWhitespace(text.split(":", 2)[1]);
            }
          }
        }
      }
    });

    return data;
  }

  /**
   * Format AEO India data for KYC storage
   */
  static formatAEOIndiaData(aeoIndiaData) {
    return {
      company_name: aeoIndiaData["Company Name"] || "",
      company_address: aeoIndiaData["Company Address"] || "",
      iec_number: aeoIndiaData["IEC Number"] || "",
      aeo_tier: aeoIndiaData["AEO Tier"] || "",
      certificate_no: aeoIndiaData["Certificate Number"] || "",
      zone: aeoIndiaData["Zone"] || "",
      certificate_issue_date: this.parseDate(
        aeoIndiaData["Certificate Issue Date"]
      ),
      certificate_validity_date: this.parseDate(
        aeoIndiaData["Certificate Validaity Date"]
      ),
      certificate_present_validity_date: this.parseDate(
        aeoIndiaData["Certificate Present Validity Date"]
      ),
      certificate_present_validity_status:
        aeoIndiaData["Certificate Present Validity Status"] || "",
    };
  }

  /**
   * Parse date strings (DD/MM/YYYY format from AEO India)
   */
  static parseDate(dateString) {
    if (!dateString) return null;

    try {
      const cleanDate = this.cleanWhitespace(dateString);

      // Try DD/MM/YYYY format (most common from AEO India)
      const parts = cleanDate.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      }

      // Try direct parsing as fallback
      const parsed = new Date(cleanDate);
      if (!isNaN(parsed.getTime())) return parsed;

      return null;
    } catch (error) {
      console.warn("Date parsing error:", error);
      return null;
    }
  }

  /**
   * Lookup AEO data from menu (quick lookup)
   */
  static async lookupAEOFromMenu(certificateNumber) {
    try {
      console.log(
        `Starting AEO lookup from menu for certificate: ${certificateNumber}`
      );

      const aeoData = await this.fetchFromAEOIndia(certificateNumber);

      return {
        success: true,
        source: "aeoindia",
        data: aeoData,
      };
    } catch (error) {
      console.error("AEO menu lookup error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete AEO lookup flow for profile click
   */
  static async lookupAEOFromProfile(certificateNumber, ieCode) {
    try {
      console.log(
        `Starting complete AEO lookup from profile for certificate: ${certificateNumber}`
      );
      const cleanIeCode = ieCode.replace(/\s+/g, "").toUpperCase();
console.log("Certificate Number:", certificateNumber);
      // Get official data from AEO India
      const aeoData = await this.fetchFromAEOIndia(certificateNumber);

      // Save to CustomerKyc
      const kycRecord = await this.saveToCustomerKyc(cleanIeCode, aeoData);

      console.log("AEO profile lookup completed successfully");

      return {
        success: true,
        source: "aeoindia",
        data: aeoData,
        kyc_record: kycRecord,
      };
    } catch (error) {
      console.error("AEO profile lookup error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Save AEO data to CustomerKyc model
   * Updates all fields based on API response
   */
  static async saveToCustomerKyc(ieCode, aeoData) {
    try {
      let kycRecord = await CustomerKycModel.findOne({
        iec_no: ieCode,
      });

      const kycData = {
        module: "AEO Verification",
        category: "Importer",
        name_of_individual: aeoData.company_name, // Company Name from API
        status: "verified",
        iec_no: ieCode,
        principle_business_address_line_1: aeoData.company_address, // Company Address from API
        aeo_tier: aeoData.aeo_tier, // AEO Tier from API
        certificate_no: aeoData.certificate_no, // Certificate Number from API
        certificate_issue_date: aeoData.certificate_issue_date, // Certificate Issue Date from API
        certificate_validity_date: aeoData.certificate_validity_date, // Certificate Validity Date from API
        certificate_present_validity_status:
          aeoData.certificate_present_validity_status, // Status from API
        last_aeo_verification: new Date(),
      };

      if (kycRecord) {
        kycRecord = await CustomerKycModel.findOneAndUpdate(
          { iec_no: ieCode },
          { $set: kycData },
          { new: true, runValidators: true }
        );
        console.log(
          `Updated KYC record for IE code: ${ieCode} with data from AEO India`
        );
      } else {
        kycRecord = new CustomerKycModel(kycData);
        await kycRecord.save();
        console.log(
          `Created new KYC record for IE code: ${ieCode} with data from AEO India`
        );
      }

      return kycRecord;
    } catch (error) {
      console.error("Error saving to CustomerKyc:", error);
      throw error;
    }
  }

  /**
   * Update certificate number and automatically fetch & update all AEO details
   */
  static async updateCertificateNumber(ieCode, newCertificateNumber, userId) {
    let kycRecord = null;
    console.log("User ID:", userId);

    try {
      const cleanIeCode = ieCode.replace(/\s+/g, "").toUpperCase();
      const cleanCertNumber = newCertificateNumber
        .replace(/\s+/g, "")
        .toUpperCase();

      console.log(
        `Updating certificate number for ${cleanIeCode} to: ${cleanCertNumber}`
      );

      // Step 1: Fetch data from AEO India using the certificate number
      const aeoData = await this.fetchFromAEOIndia(cleanCertNumber);

      if (!aeoData.company_name) {
        throw new Error("Certificate not found or invalid certificate number");
      }

      // Step 2: Update CustomerKyc with ALL data from API response
      kycRecord = await CustomerKycModel.findOneAndUpdate(
        { iec_no: cleanIeCode },
        {
          $set: {
            // Update from API response
            name_of_individual: aeoData.company_name, // Company Name from API
            principle_business_address_line_1: aeoData.company_address, // Company Address
            certificate_no: aeoData.certificate_no, // Certificate Number
            aeo_tier: aeoData.aeo_tier, // AEO Tier
            certificate_issue_date: aeoData.certificate_issue_date, // Issue Date
            certificate_validity_date: aeoData.certificate_validity_date, // Validity Date
            certificate_present_validity_status:
              aeoData.certificate_present_validity_status, // Status
            status: "verified",
            last_aeo_verification: new Date(),
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true, upsert: true } // upsert creates if not exists
      );

      console.log(`Successfully updated KYC record with AEO data:`, {
        company_name: aeoData.company_name,
        certificate_no: aeoData.certificate_no,
        aeo_tier: aeoData.aeo_tier,
        status: aeoData.certificate_present_validity_status,
      });

      return {
        success: true,
        message: "Certificate verified successfully and all details updated",
        kyc_record: kycRecord,
        aeo_data: aeoData,
      };
    } catch (error) {
      console.error("Update certificate number error:", error);

      if (error.message.includes("Certificate not found")) {
        throw new Error(
          "Invalid certificate number or certificate not found in AEO India database"
        );
      } else if (error.name === "ValidationError") {
        throw new Error(`Validation failed: ${error.message}`);
      } else if (error.code === 11000) {
        throw new Error("Duplicate IE code found");
      } else {
        throw new Error(`Update failed: ${error.message}`);
      }
    }
  }

  /**
   * Auto-verify all user importers - SKIP if already exists
   */
  static async autoVerifyUserImporters(userId) {
    try {
      const user = await EximclientUser.findById(userId).select(
        "ie_code_assignments name email"
      );

      if (
        !user ||
        !user.ie_code_assignments ||
        user.ie_code_assignments.length === 0
      ) {
        return { success: false, message: "No importers assigned" };
      }

      const results = [];

      for (const assignment of user.ie_code_assignments) {
        try {
          const cleanIeCode = assignment.ie_code_no
            .replace(/\s+/g, "")
            .toUpperCase();

          // Check if KYC record exists
          const existingKyc = await CustomerKycModel.findOne({
            iec_no: cleanIeCode,
          });

          if (!existingKyc || !existingKyc.certificate_no) {
            console.log(
              `Skipping auto-verification for ${assignment.ie_code_no} - No certificate number found`
            );
            results.push({
              ie_code_no: assignment.ie_code_no,
              importer_name: assignment.importer_name,
              success: false,
              skipped: true,
              message:
                "No certificate number found. Please add certificate number to verify.",
            });
            continue;
          }

          // Check if already has valid AEO data
          if (existingKyc.aeo_tier && existingKyc.certificate_validity_date) {
            console.log(
              `Skipping auto-verification for ${assignment.ie_code_no} - AEO data already exists`
            );
            results.push({
              ie_code_no: assignment.ie_code_no,
              importer_name:
                existingKyc.name_of_individual || assignment.importer_name,
              success: true,
              skipped: true,
              message: "AEO data already exists in database",
              existing_data: {
                company_name: existingKyc.name_of_individual,
                aeo_tier: existingKyc.aeo_tier,
                certificate_no: existingKyc.certificate_no,
                last_verification: existingKyc.last_aeo_verification,
              },
            });
            continue;
          }

          // Verify using existing certificate number
          const result = await this.lookupAEOFromProfile(
            existingKyc.certificate_no,
            assignment.ie_code_no
          );
          results.push({
            ie_code_no: assignment.ie_code_no,
            importer_name:
              result.data?.company_name || assignment.importer_name,
            ...result,
          });
        } catch (error) {
          console.error(
            `AEO verification failed for ${assignment.ie_code_no}:`,
            error
          );
          results.push({
            ie_code_no: assignment.ie_code_no,
            importer_name: assignment.importer_name,
            success: false,
            error: error.message,
            can_retry: true,
          });
        }
      }

      return {
        success: true,
        message: `Processed ${results.length} importers`,
        results,
      };
    } catch (error) {
      console.error("Auto-verify importers error:", error);
      throw error;
    }
  }

  /**
   * Get KYC summary for user
   */
  static async getUserKYCSummary(userId) {
    try {
      const user = await EximclientUser.findById(userId).select(
        "ie_code_assignments name email"
      );

      if (!user) {
        return { success: false, message: "User not found" };
      }

      const kycSummaries = [];

      for (const assignment of user.ie_code_assignments) {
        const cleanIeCode = assignment.ie_code_no
          .replace(/\s+/g, "")
          .toUpperCase();
        const kycRecord = await CustomerKycModel.findOne({
          iec_no: cleanIeCode,
        }).select(
          "name_of_individual aeo_tier certificate_no certificate_issue_date certificate_validity_date certificate_present_validity_status status updatedAt last_aeo_verification"
        );

        const displayName =
          kycRecord?.name_of_individual || assignment.importer_name;

        kycSummaries.push({
          importer_name: displayName,
          name_of_individual: displayName,
          ie_code_no: assignment.ie_code_no,
          kyc_status: kycRecord?.status || "not_found",
          aeo_tier: kycRecord?.aeo_tier || "Not Available",
          certificate_no: kycRecord?.certificate_no || "Not Available",
          certificate_issue_date: kycRecord?.certificate_issue_date || null,
          certificate_validity_date:
            kycRecord?.certificate_validity_date || null,
          certificate_present_validity_status:
            kycRecord?.certificate_present_validity_status || "Unknown",
          last_updated: kycRecord?.updatedAt || null,
          last_verification: kycRecord?.last_aeo_verification || null,
          has_aeo_data: !!(
            kycRecord?.aeo_tier && kycRecord.aeo_tier !== "Not Available"
          ),
          has_certificate_no: !!(
            kycRecord?.certificate_no &&
            kycRecord.certificate_no !== "Not Available"
          ),
        });
      }

      return {
        success: true,
        user: {
          name: user.name,
          email: user.email,
        },
        kyc_summaries: kycSummaries,
      };
    } catch (error) {
      console.error("Get KYC summary error:", error);
      throw error;
    }
  }
}
