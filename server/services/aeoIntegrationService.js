// services/aeoIntegrationService.js
import CustomerKycModel from "../models/customerKycModel.js";
import EximclientUser from "../models/eximclientUserModel.js";
import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";

export class AEOIntegrationService {
  // Constants
  static AEODIR_BASE = "https://www.aeodirectory.com";
  static AEODIR_SEARCH = this.AEODIR_BASE + "/aeo/search/?";
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
   * STEP 1: Search AEODirectory by company name to get certificate number
   */
  static async searchAeodirectory(companyName) {
    try {
      const axiosInstance = axios.create({
        headers: { ...this.HEADERS },
        timeout: this.REQUEST_TIMEOUT,
        maxRedirects: 5,
      });

      const params = {
        company: companyName,
        industry: "",
        country: "",
      };

      const query = qs.stringify(params, {
        encode: true,
        arrayFormat: "brackets",
      });

      const url = this.AEODIR_SEARCH + query;
      console.log(`Searching AEODirectory for: ${companyName}`);

      const response = await axiosInstance.get(url);
      const html = response.data;
      const $ = cheerio.load(html);

      // Find first detail link
      let detailUrl = null;
      const link = $('a[href*="/aeo/dettaglio/"]').first();

      if (link.length && link.attr("href")) {
        detailUrl = new URL(link.attr("href"), this.AEODIR_BASE).toString();
        console.log(`Found detail URL: ${detailUrl}`);
      } else {
        // Fallback: check if company name appears on page
        const bodyText = $("body").text() || "";
        if (bodyText.toLowerCase().includes(companyName.toLowerCase())) {
          detailUrl = response.request.res.responseUrl || url;
          console.log(`Using current page as detail URL: ${detailUrl}`);
        }
      }

      if (!detailUrl) {
        throw new Error(`Company not found on AEODirectory: ${companyName}`);
      }

      // Get detail page
      const detailResponse = await axiosInstance.get(detailUrl);
      const detailData = this.parseAeodirectoryDetail(detailResponse.data);
      console.log("AEODirectory detail data extracted:", detailData);

      console.log("AEODirectory data extracted:", {
        companyName: detailData.company_name,
        certificateNumber: detailData.certificate_number,
        aeoCertificates: detailData.aeo_certificates,
      });

      return detailData;
    } catch (error) {
      console.error("AEODirectory search error:", error.message);
      throw new Error(`AEODirectory search failed: ${error.message}`);
    }
  }

  /**
   * Parse AEODirectory detail page
   */
  static parseAeodirectoryDetail(htmlText) {
    const $ = cheerio.load(htmlText);
    const data = {};

    // Extract company name
    const companyElem = $("*:contains('AEO Company Name')")
      .filter(function () {
        return $(this).children().length === 0
          ? $(this).text().includes("AEO Company Name")
          : $(this).text().includes("AEO Company Name");
      })
      .first();

    if (companyElem.length) {
      const parent = companyElem.parent();
      if (parent.length) {
        const txt = this.cleanWhitespace(parent.text());
        if (txt.includes(":")) {
          data.company_name = this.cleanWhitespace(txt.split(":", 2)[1]);
        }
      }
    }

    // Parse other fields from <p> blocks
    $("p").each((i, el) => {
      const text = this.cleanWhitespace($(el).text());

      if (text.startsWith("AEO Certificates")) {
        const parts = text.split(":", 2);
        if (parts.length === 2)
          data.aeo_certificates = this.cleanWhitespace(parts[1]);
      }
      if (text.startsWith("AEO Certificate Number")) {
        const parts = text.split(":", 2);
        if (parts.length === 2)
          data.certificate_number = this.cleanWhitespace(parts[1]);
      }
      if (text.startsWith("Issuing Country")) {
        const parts = text.split(":", 2);
        if (parts.length === 2)
          data.issuing_country = this.cleanWhitespace(parts[1]);
      }
      if (text.startsWith("Industry Sector")) {
        const parts = text.split(":", 2);
        if (parts.length === 2)
          data.industry_sector = this.cleanWhitespace(parts[1]);
      }
    });

    // Fallback: regex for certificate number
    if (!data.certificate_number) {
      const certMatch = htmlText.match(/[A-Z]{2,}\d{0,}[A-Z0-9\-]{5,}/);
      if (certMatch) {
        data.certificate_number = this.cleanWhitespace(certMatch[0]);
        data.certificate_number_heuristic = true;
      }
    }

    // Additional fallback
    if (!data.certificate_number) {
      const certMatch2 = htmlText.match(/IN[A-Z0-9]{12,}|[A-Z0-9]{8,}/);
      if (certMatch2) {
        data.certificate_number = this.cleanWhitespace(certMatch2[0]);
        data.certificate_number_heuristic2 = true;
      }
    }

    return data;
  }

  /**
   * STEP 2: Fetch from AEO India using certificate number
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

      console.log("AEO India data fetched successfully");
      return this.formatAEOIndiaData(aeoIndiaData);
    } catch (error) {
      console.error("AEO India fetch error:", error.message);
      throw new Error(`AEO India fetch failed: ${error.message}`);
    }
  }

  /**
   * Parse AEO India response
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
      "Certificate Number",
      "IEC Number",
      "AEO Tier",
      "Zone",
      "Certificate Issue Date",
      "Certificate Validaity Date",
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
      aeo_tier: aeoIndiaData["AEO Tier"] || "",
      certificate_no: aeoIndiaData["Certificate Number"] || "",
      certificate_issue_date: this.parseDate(
        aeoIndiaData["Certificate Issue Date"]
      ),
      certificate_validity_date: this.parseDate(
        aeoIndiaData["Certificate Validaity Date"]
      ),
      certificate_present_validity_status:
        aeoIndiaData["Certificate Present Validity Status"] || "",
    };
  }

  /**
   * Parse date strings
   */
  static parseDate(dateString) {
    if (!dateString) return null;

    try {
      const cleanDate = this.cleanWhitespace(dateString);

      // Try direct parsing
      const parsed = new Date(cleanDate);
      if (!isNaN(parsed.getTime())) return parsed;

      // Try DD/MM/YYYY format
      const parts = cleanDate.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      }

      return null;
    } catch (error) {
      console.warn("Date parsing error:", error);
      return null;
    }
  }

  /**
   * Complete AEO lookup flow for menu click
   */
  static async lookupAEOFromMenu(importerName) {
    try {
      console.log(`Starting AEO lookup from menu for: ${importerName}`);

      // Step 1: Get certificate number from AEODirectory
      const directoryData = await this.searchAeodirectory(importerName);

      if (!directoryData.certificate_number) {
        throw new Error(
          "Could not extract certificate number from AEODirectory"
        );
      }

      console.log(
        `Found certificate number: ${directoryData.certificate_number}`
      );

      // Return directory data for menu display
      return {
        success: true,
        source: "aeodirectory",
        data: {
          company_name: directoryData.company_name || importerName,
          certificate_number: directoryData.certificate_number,
          aeo_tier: directoryData.aeo_certificates || "",
          issuing_country: directoryData.issuing_country || "",
          industry_sector: directoryData.industry_sector || "",
        },
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
  static async lookupAEOFromProfile(importerName, ieCode) {
    try {
      console.log(
        `Starting complete AEO lookup from profile for: ${importerName}`
      );
      const cleanIeCode = ieCode.replace(/\s+/g, "").toUpperCase();

      // Step 1: Get certificate number from AEODirectory
      const directoryData = await this.searchAeodirectory(importerName);

      if (!directoryData.certificate_number) {
        throw new Error(
          "Could not extract certificate number from AEODirectory"
        );
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Get official data from AEO India
      const indiaData = await this.fetchFromAEOIndia(
        directoryData.certificate_number
      );

      // Step 3: Merge data (AEO India is authoritative)
      const finalData = {
        // Use AEO India data where available, fallback to directory data
        aeo_tier: indiaData.aeo_tier || directoryData.aeo_certificates || "",
        certificate_no:
          indiaData.certificate_no || directoryData.certificate_number || "",
        certificate_issue_date: indiaData.certificate_issue_date,
        certificate_validity_date: indiaData.certificate_validity_date,
        certificate_present_validity_status:
          indiaData.certificate_present_validity_status || "",
      };

      // Step 4: Save to CustomerKyc
      const kycRecord = await this.saveToCustomerKyc(
        cleanIeCode,
        importerName,
        finalData
      );

      console.log("AEO profile lookup completed successfully");

      return {
        success: true,
        source: "both",
        directory_data: directoryData,
        india_data: indiaData,
        final_data: finalData,
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
   */
  static async saveToCustomerKyc(ieCode, importerName, aeoData) {
    try {
      let kycRecord = await CustomerKycModel.findOne({
        iec_no: ieCode,
      });

      const kycData = {
        module: "AEO Verification",
        category: "Importer",
        name_of_individual: importerName, // This is crucial - save the name
        status: "pending",
        iec_no: ieCode,
        aeo_tier: aeoData.aeo_tier,
        certificate_no: aeoData.certificate_no,
        certificate_issue_date: aeoData.certificate_issue_date,
        certificate_validity_date: aeoData.certificate_validity_date,
        certificate_present_validity_status:
          aeoData.certificate_present_validity_status,
        last_aeo_verification: new Date(),
      };

      if (kycRecord) {
        kycRecord = await CustomerKycModel.findOneAndUpdate(
          { iec_no: ieCode },
          { $set: kycData },
          { new: true, runValidators: true }
        );
        console.log(
          `Updated KYC record for IE code: ${ieCode} with name: ${importerName}`
        );
      } else {
        kycRecord = new CustomerKycModel(kycData);
        await kycRecord.save();
        console.log(
          `Created new KYC record for IE code: ${ieCode} with name: ${importerName}`
        );
      }

      return kycRecord;
    } catch (error) {
      console.error("Error saving to CustomerKyc:", error);
      throw error;
    }
  }
  static async updateImporterName(ieCode, newImporterName, userId) {
    let kycRecord = null;
    let userUpdateResult = null;
    console.log("User=============================",userId);
    try {
      const cleanIeCode = ieCode.replace(/\s+/g, "").toUpperCase();

      // Update CustomerKyc model
      kycRecord = await CustomerKycModel.findOneAndUpdate(
        { iec_no: cleanIeCode },
        {
          $set: {
            name_of_individual: newImporterName,
            updatedAt: new Date(),
            aeo_tier: "",
            certificate_no: "",
            certificate_issue_date: null,
            certificate_validity_date: null,
            certificate_present_validity_status: "Unknown",
            status: "pending",
          },
        },
        { new: true, runValidators: true }
      );

      if (!kycRecord) {
        // Create a new KYC record if it doesn't exist
        kycRecord = new CustomerKycModel({
          module: "AEO Verification",
          category: "Importer",
          name_of_individual: newImporterName,
          status: "pending",
          iec_no: cleanIeCode,
        });
        await kycRecord.save();
        console.log(`Created new KYC record for IE code: ${cleanIeCode}`);
      } else {
        console.log(
          `Updated KYC importer name for ${cleanIeCode} to: ${newImporterName}`
        );
      }

      // Update EximclientUser's ie_code_assignments

      userUpdateResult = await EximclientUser.findOneAndUpdate(
        {
          _id: userId,
          "ie_code_assignments.ie_code_no": cleanIeCode,
        },
        {
          $set: {
            "ie_code_assignments.$.importer_name": newImporterName,
            "ie_code_assignments.$.updated_at": new Date(),
          },
        },
        { new: true, runValidators: true }
      );

      if (!userUpdateResult) {
        console.warn(
          `User or IE code assignment not found for update - userId: ${userId}, ieCode: ${cleanIeCode}`
        );
        // We'll still proceed as KYC update was successful
      } else {
        console.log(
          `Updated user assignment importer name for ${cleanIeCode} to: ${newImporterName}`
        );
      }

      // Trigger automatic re-verification
      try {
        const verificationResult = await this.lookupAEOFromProfile(
          newImporterName,
          ieCode
        );
        return {
          success: true,
          message: "Importer name updated and verification completed",
          kyc_record: kycRecord,
          user_updated: !!userUpdateResult,
          verification_result: verificationResult,
        };
      } catch (verificationError) {
        // Even if verification fails, the name update was successful
        return {
          success: true,
          message:
            "Importer name updated but verification failed - you can try verification again later",
          kyc_record: kycRecord,
          user_updated: !!userUpdateResult,
          verification_error: verificationError.message,
        };
      }
    } catch (error) {
      console.error("Update importer name error:", error);

      // Provide more specific error messages
      if (error.name === "ValidationError") {
        throw new Error(`Validation failed: ${error.message}`);
      } else if (error.code === 11000) {
        throw new Error("Duplicate IE code found");
      } else {
        throw new Error(`Update failed: ${error.message}`);
      }
    }
  }

  /**
   * Auto-verify all user importers (for profile access) - SKIP if already exists
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
          console.log(
            `Processing importer: ${assignment.importer_name} (${assignment.ie_code_no})`
          );

          // Check if KYC record already exists with valid AEO data
          const cleanIeCode = assignment.ie_code_no
            .replace(/\s+/g, "")
            .toUpperCase();
          const existingKyc = await CustomerKycModel.findOne({
            iec_no: cleanIeCode,
            aeo_tier: { $exists: true, $ne: "" },
            certificate_no: { $exists: true, $ne: "" },
          });

          if (existingKyc) {
            console.log(
              `Skipping auto-verification for ${assignment.ie_code_no} - AEO data already exists`
            );
            results.push({
              ie_code_no: assignment.ie_code_no,
              importer_name: assignment.importer_name,
              success: true,
              skipped: true,
              message: "AEO data already exists in database",
              existing_data: {
                aeo_tier: existingKyc.aeo_tier,
                certificate_no: existingKyc.certificate_no,
                last_verification: existingKyc.last_aeo_verification,
              },
            });
            continue;
          }

          // Only verify if no existing data
          const result = await this.lookupAEOFromProfile(
            assignment.importer_name,
            assignment.ie_code_no
          );
          results.push({
            ie_code_no: assignment.ie_code_no,
            importer_name: assignment.importer_name,
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
            can_retry: true, // Flag to indicate manual retry is possible
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

        // Use the updated name from KYC if available, otherwise fallback to assignment name
        const displayName =
          kycRecord?.name_of_individual || assignment.importer_name;

        kycSummaries.push({
          importer_name: displayName, // This is the key field for frontend
          name_of_individual: displayName, // Keep both for consistency
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
          // Add flags to track name source
          name_source: kycRecord?.name_of_individual
            ? "kyc_updated"
            : "original_assignment",
          original_importer_name: assignment.importer_name, // Keep original for reference
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
