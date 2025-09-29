// Get job counts for Gandhidham importer

import mongoose from "mongoose";
import JobModel from "../models/jobModel.js";

// Connect to Gandhidham DB using a separate mongoose connection
const gandhidhamConnection = mongoose.createConnection(
  process.env.Gandhidham_URI,
  {
    useUnifiedTopology: true,
  }
);

const GandhidhamJobModel = gandhidhamConnection.model("Job", JobModel.schema);
const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escaping special regex characters
};

const buildSearchQuery = (search) => ({
  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Generates a MongoDB search query based on the search string.
   * The query uses regex matching against several fields, with
   * case-insensitive matching.
   *
   * @param {string} search - The search string
   * @returns {object} MongoDB search query
   */
  /*******  630b8e0a-3077-48f7-a741-5349a88f6397  *******/ $or: [
    { job_no: { $regex: escapeRegex(search), $options: "i" } },
    { type_of_b_e: { $regex: escapeRegex(search), $options: "i" } },
    { supplier_exporter: { $regex: escapeRegex(search), $options: "i" } },
    { consignment_type: { $regex: escapeRegex(search), $options: "i" } },
    { importer: { $regex: escapeRegex(search), $options: "i" } },
    { custom_house: { $regex: escapeRegex(search), $options: "i" } },
    { awb_bl_no: { $regex: escapeRegex(search), $options: "i" } },
    { vessel_berthing: { $regex: escapeRegex(search), $options: "i" } },
    { gateway_igm_date: { $regex: escapeRegex(search), $options: "i" } },
    { discharge_date: { $regex: escapeRegex(search), $options: "i" } },
    { be_no: { $regex: escapeRegex(search), $options: "i" } },
    { be_date: { $regex: escapeRegex(search), $options: "i" } },
    { loading_port: { $regex: escapeRegex(search), $options: "i" } },
    { port_of_reporting: { $regex: escapeRegex(search), $options: "i" } },

    {
      "container_nos.container_number": {
        $regex: escapeRegex(search),
        $options: "i",
      },
    },
    {
      "container_nos.arrival_date": {
        $regex: escapeRegex(search),
        $options: "i",
      },
    },
    {
      "container_nos.detention_from": {
        $regex: escapeRegex(search),
        $options: "i",
      },
    },
  ],
});

// Status mapping for detailed status filtering
const statusMapping = {
  billing_pending: "Billing Pending",
  eta_date_pending: "ETA Date Pending",
  estimated_time_of_arrival: "Estimated Time of Arrival",
  gateway_igm_filed: "Gateway IGM Filed",
  discharged: "Discharged",
  rail_out: "Rail Out",
  be_noted_arrival_pending: "BE Noted, Arrival Pending",
  be_noted_clearance_pending: "BE Noted, Clearance Pending",
  pcv_done_duty_payment_pending: "PCV Done, Duty Payment Pending",
  custom_clearance_completed: "Custom Clearance Completed",
};

const statusRank = {
  "Billing Pending": { rank: 1, field: "emptyContainerOffLoadDate" },
  "Custom Clearance Completed": { rank: 2, field: "detention_from" },
  "PCV Done, Duty Payment Pending": { rank: 3, field: "detention_from" },
  "BE Noted, Clearance Pending": { rank: 4, field: "detention_from" },
  "BE Noted, Arrival Pending": { rank: 5, field: "be_date" },
  "Rail Out": { rank: 6, field: "rail_out" },
  Discharged: { rank: 7, field: "discharge_date" },
  "Gateway IGM Filed": { rank: 8, field: "gateway_igm_date" },
  "Estimated Time of Arrival": { rank: 9, field: "vessel_berthing" },
};

const parseDate = (dateStr) => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};
const defaultFields = `
  job_no year importer custom_house awb_bl_no container_nos vessel_berthing transporter job_net_weight url net_weight origin_country weight_shortage checklist is_checklist_aprroved_date is_checklist_clicked invoice_number invoice_date inv_currency total_inv_value detention_from do_shipping_line_invoice
  gateway_igm_date discharge_date detailed_status be_no be_date loading_port goods_delivery free_time net_weight delivery_address per_kg_cost   net_weight_calculator description ie_code_no weighment_slip_images is_checklist_aprroved remark_client emptyContainerOffLoadDate container_rail_out_date by_road_movement_date consignment_type
  port_of_reporting type_of_b_e consignment_type shipping_line_airline bill_date out_of_charge pcv_date delivery_date emptyContainerOffLoadDate do_completed do_validity  do_copies rail_out_date cth_documents payment_method supplier_exporter gross_weight job_net_weight processed_be_attachment ooc_copies gate_pass_copies do_planning_history doPlanning do_planning_date
`;

const additionalFieldsByStatus = {
  be_noted_clearance_pending: "",
  pcv_done_duty_payment_pending: "out_of_charge pcv_date",
  custom_clearance_completed: "out_of_charge",
};

const getSelectedFields = (status) =>
  `${defaultFields} ${additionalFieldsByStatus[status] || ""}`.trim();

export async function getJobsByStatusAndImporterGandhidham(req, res) {
  try {
    const { year, status, detailedStatus, customHouse } = req.params;
    const {
      page = 1,
      limit = 100,
      search = "",
      exporter = "",
      ieCodes = "",
      importers = "",
    } = req.query;
    const skip = (page - 1) * limit;

    // Handle IE codes from multiple sources
    let ieCodeArray = [];

    if (ieCodes) {
      // If ieCodes are provided in query (existing functionality)
      ieCodeArray = ieCodes.split(",").map((code) => code.trim().toUpperCase());
    } else if (req.user) {
      // Extract IE codes from authenticated user (new functionality)
      ieCodeArray = extractIECodes(req.user);
    }

    if (ieCodeArray.length === 0) {
      return res.status(400).json({
        message:
          "No IE Codes found. Please ensure you have assigned IE codes or provide them in the request.",
      });
    }

    console.log("IE Codes being used for query:", ieCodeArray);

    const importerArray = importers
      ? importers.split(";").map((imp) => imp.trim())
      : [];

    const query = {
      year,
      ie_code_no: { $in: ieCodeArray },
      $and: [],
    };

    if (importerArray.length > 0) {
      query.$and.push({
        importer: {
          $in: importerArray.map(
            (imp) => new RegExp(`^${escapeRegex(imp)}$`, "i")
          ),
        },
      });
    }

    // Handle custom house filtering
    if (customHouse && customHouse.toLowerCase() !== "all") {
      query.custom_house = {
        $regex: `^${escapeRegex(customHouse)}$`,
        $options: "i",
      };
    }

    // Status filtering logic (same as before)
    const statusLower = status.toLowerCase();
    if (statusLower === "pending") {
      query.$and.push(
        { status: { $regex: "^pending$", $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        {
          $or: [
            { bill_date: { $in: [null, ""] } },
            { status: { $regex: "^pending$", $options: "i" } },
          ],
        }
      );
    } else if (statusLower === "completed") {
      query.$and.push(
        { status: { $regex: "^completed$", $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        {
          $or: [
            { bill_date: { $nin: [null, ""] } },
            { status: { $regex: "^completed$", $options: "i" } },
          ],
        }
      );
    } else if (statusLower === "cancelled") {
      query.$and.push({
        $or: [
          { status: { $regex: "^cancelled$", $options: "i" } },
          { be_no: { $regex: "^cancelled$", $options: "i" } },
        ],
      });
    } else if (statusLower !== "all") {
      query.$and.push(
        { status: { $regex: `^${status}$`, $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } }
      );
    } else {
      // For 'all' status, just exclude cancelled jobs
      query.$and.push(
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        { status: { $not: { $regex: "^cancelled$", $options: "i" } } }
      );
    }

    if (detailedStatus !== "all") {
      query.detailed_status = statusMapping[detailedStatus] || detailedStatus;
    }

    if (search) {
      query.$and.push(buildSearchQuery(search));
    }

    if (exporter && exporter !== "all") {
      query.$and.push({
        supplier_exporter: {
          $regex: new RegExp(`^${escapeRegex(exporter)}$`, "i"),
        },
      });
    }

    if (query.$and && query.$and.length === 0) {
      delete query.$and;
    }

    console.log("Final query:", JSON.stringify(query, null, 2));

    const jobs = await GandhidhamJobModel.find(query).select(
      getSelectedFields(detailedStatus === "all" ? "all" : detailedStatus)
    );

    // console.log(
    //   `Found ${jobs.length} jobs for IE codes: ${ieCodeArray.join(", ")}`
    // );

    // Rest of your sorting and pagination logic remains the same
    const rankedJobs = jobs.filter((job) => statusRank[job.detailed_status]);
    const unrankedJobs = jobs.filter((job) => !statusRank[job.detailed_status]);

    const sortedRankedJobs = Object.entries(statusRank).reduce(
      (acc, [status, { field }]) => [
        ...acc,
        ...rankedJobs
          .filter((job) => job.detailed_status === status)
          .sort(
            (a, b) =>
              parseDate(a.container_nos?.[0]?.[field] || a[field]) -
              parseDate(b.container_nos?.[0]?.[field] || b[field])
          ),
      ],
      []
    );

    const allJobs = [...sortedRankedJobs, ...unrankedJobs];
    const paginatedJobs = allJobs.slice(skip, skip + parseInt(limit));

    res.json({
      message: " Gandhidham Jobs fetched successfully",
      data: paginatedJobs,
      total: allJobs.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(allJobs.length / limit),
      ieCodesUsed: ieCodeArray, // Include this for debugging
    });
  } catch (error) {
    console.error("Error fetching jobs by IE codes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Utility function to format importer name
function formatImporter(importer) {
  return importer
    .toLowerCase()
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[\.\-\/,\(\)\[\]]/g, "") // Remove unwanted symbols
    .replace(/_+/g, "_"); // Remove multiple underscores
}

export async function getImporterJobCountsGandhidham(req, res) {
  try {
    const { year, importerURL } = req.params;
    const formattedImporter = formatImporter(importerURL);

    // Format importer if needed (reuse formatImporter if available)

    // Aggregation to count jobs efficiently in Gandhidham DB
    const jobCounts = await GandhidhamJobModel.aggregate([
      {
        $match: {
          year: year,
          importerURL: new RegExp(`^${formattedImporter}$`, "i"), // Case-insensitive matching
        },
      },
      {
        $group: {
          _id: null,
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] },
          },
          totalCount: { $sum: 1 },
        },
      },
    ]).allowDiskUse(true); // Enable disk use for large data

    // Prepare response array
    const responseArray =
      jobCounts.length > 0
        ? [
            jobCounts[0].totalCount,
            jobCounts[0].pendingCount,
            jobCounts[0].completedCount,
            jobCounts[0].cancelledCount,
          ]
        : [0, 0, 0, 0];

    res.json(responseArray);
  } catch (error) {
    console.error("Error fetching Gandhidham job counts by importer:", error);
    res
      .status(500)
      .json({ error: "Error fetching Gandhidham job counts by importer" });
  }
}

export async function getExportersGandhidham(req, res) {
  try {
    const { importer, year, status } = req.query;

    if (!importer) {
      return res.status(400).json({
        success: false,
        message: "Importer parameter is required",
      });
    }

    // Base match including importer and supplier_exporter must exist and be non-empty
    const matchQuery = {
      importer: { $regex: importer, $options: "i" },
      supplier_exporter: { $exists: true, $ne: null, $ne: "" },
    };

    // Add year filter if provided
    if (year) {
      matchQuery.year = year;
    }

    // Add status filters if provided and not "all"
    if (status && status.toLowerCase() !== "all") {
      const statusLower = status.toLowerCase();
      if (statusLower === "pending") {
        matchQuery.$and = [
          { status: { $regex: "^pending$", $options: "i" } },
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
          {
            $or: [
              { bill_date: { $in: [null, ""] } },
              { status: { $regex: "^pending$", $options: "i" } },
            ],
          },
        ];
      } else if (statusLower === "completed") {
        matchQuery.$and = [
          { status: { $regex: "^completed$", $options: "i" } },
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
          {
            $or: [
              { bill_date: { $nin: [null, ""] } },
              { status: { $regex: "^completed$", $options: "i" } },
            ],
          },
        ];
      } else if (statusLower === "cancelled") {
        matchQuery.$and = [
          {
            $or: [
              { status: { $regex: "^cancelled$", $options: "i" } },
              { be_no: { $regex: "^cancelled$", $options: "i" } },
            ],
          },
        ];
      }
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: "$supplier_exporter",
        },
      },
      {
        $project: {
          _id: 0,
          exporter: "$_id",
        },
      },
      { $sort: { exporter: 1 } },
    ];

    const result = await GandhidhamJobModel.aggregate(pipeline);

    const exporters = result.map((item) => item.exporter);

    // Return clean array of distinct exporters
    res.status(200).json({
      message: "Exporters fetched successfully",
      success: true,
      count: exporters.length,
      exporters,
    });
  } catch (error) {
    console.error("Error fetching exporters:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exporters",
      error: error.message,
    });
  }
}

export async function getJobNumbersByMultipleIECodesGandhidham(req, res) {
  try {
    const { ieCodes, year, search } = req.query; // All from query parameters

    console.log("Multiple IE Codes Request:", { ieCodes, year, search }); // Debug log

    if (!ieCodes) {
      return res.status(400).json({
        success: false,
        message: "ieCodes parameter is required in query string",
      });
    }

    // Parse comma-separated IE codes
    const ieCodeArray = ieCodes
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code);

    console.log("Parsed IE Codes:", ieCodeArray); // Debug log

    if (ieCodeArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid IE codes are required",
      });
    }

    // Build query object
    const query = {
      ie_code_no: { $in: ieCodeArray },
    };

    // Add year filter if provided
    if (year) {
      query.year = year;
    }

    // Add search filter for job number or exporter name if provided
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ job_no: searchRegex }, { supplier_exporter: searchRegex }];
    }

    console.log("MongoDB Query:", JSON.stringify(query, null, 2)); // Debug log

    // Find all jobs with the given ie_code_no array
    const jobs = await GandhidhamJobModel.find(query, {
      job_no: 1,
      year: 1,
      job_date: 1,
      supplier_exporter: 1,
      ie_code_no: 1,
      importer: 1,
      _id: 0,
    }).sort({ year: -1, job_no: 1 });

    console.log(`Found ${jobs.length} jobs`); // Debug log

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: search
          ? `No jobs found for IE codes: ${ieCodeArray.join(
              ", "
            )} matching search: ${search}`
          : `No jobs found for IE codes: ${ieCodeArray.join(", ")}`,
      });
    }

    // Format response
    const jobNumbers = jobs.map((job) => ({
      job_no: job.job_no,
      year: job.year,
      job_date: job.job_date,
      supplier_exporter: job.supplier_exporter || "N/A",
      ie_code_no: job.ie_code_no,
      importer: job.importer || "N/A",
    }));

    res.status(200).json({
      success: true,
      message: `Found ${jobs.length} job(s) for IE codes: ${ieCodeArray.join(
        ", "
      )}`,
      data: jobNumbers,
      total_count: jobs.length,
      ie_codes_searched: ieCodeArray,
    });
  } catch (error) {
    console.error("Error fetching job numbers by multiple IE codes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching job numbers",
      error: error.message,
    });
  }
}

export async function getBeNumbersByMultipleIECodesGandhidham(req, res) {
  try {
    const { ieCodes, year, search } = req.query; // All from query parameters

    console.log("Multiple IE Codes Request for BE Numbers:", {
      ieCodes,
      year,
      search,
    }); // Debug log

    if (!ieCodes) {
      return res.status(400).json({
        success: false,
        message: "ieCodes parameter is required in query string",
      });
    }

    // Parse comma-separated IE codes
    const ieCodeArray = ieCodes
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code);

    console.log("Parsed IE Codes:", ieCodeArray); // Debug log

    if (ieCodeArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid IE codes are required",
      });
    }

    // Build query object
    const query = {
      ie_code_no: { $in: ieCodeArray },
      be_no: { $exists: true, $ne: null }, // Only get jobs that have BE numbers
    };

    // Add year filter if provided
    if (year) {
      query.year = year;
    }

    // Add search filter for BE number or exporter name if provided
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ be_no: searchRegex }, { supplier_exporter: searchRegex }];
    }

    console.log(
      "MongoDB Query for BE Numbers:",
      JSON.stringify(query, null, 2)
    ); // Debug log

    // Find all jobs with the given ie_code_no array that have BE numbers
    const jobs = await GandhidhamJobModel.find(query, {
      be_no: 1,
      year: 1,
      job_date: 1,
      supplier_exporter: 1,
      ie_code_no: 1,
      importer: 1,
      _id: 0,
    }).sort({ year: -1, be_no: 1 });

    console.log(`Found ${jobs.length} jobs with BE numbers`); // Debug log

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: search
          ? `No jobs found for IE codes: ${ieCodeArray.join(
              ", "
            )} matching search: ${search}`
          : `No jobs found for IE codes: ${ieCodeArray.join(", ")}`,
      });
    }

    // Format response with be_no instead of job_no
    const beNumbers = jobs.map((job) => ({
      be_no: job.be_no,
      year: job.year,
      job_date: job.job_date,
      supplier_exporter: job.supplier_exporter || "N/A",
      ie_code_no: job.ie_code_no,
      importer: job.importer || "N/A",
    }));

    res.status(200).json({
      success: true,
      message: `Found ${
        jobs.length
      } job(s) with BE numbers for IE codes: ${ieCodeArray.join(", ")}`,
      data: beNumbers,
      total_count: jobs.length,
      ie_codes_searched: ieCodeArray,
    });
  } catch (error) {
    console.error("Error fetching BE numbers by multiple IE codes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching BE numbers",
      error: error.message,
    });
  }
}

export const lookupGandhidam = async (req, res) => {
  try {
    const { hsCode, jobNo, year } = req.params;
    const userIeCodes = req.query.ie_code_nos; // Changed to support multiple IE codes

    console.log("Query parameters:", req.query);
    console.log("User IE Codes:", userIeCodes);

    // Parse comma-separated IE codes if provided
    let ieCodeArray = [];
    if (userIeCodes) {
      ieCodeArray = userIeCodes
        .split(",")
        .map((code) => code.trim())
        .filter((code) => code);
    }

    if (ieCodeArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IE codes are required",
      });
    }

    // Find the job by EITHER job_no OR be_no and check if its IE code is in the allowed list
    const job = await GandhidhamJobModel.findOne({
      $or: [{ job_no: jobNo }, { be_no: jobNo }],
      year: year,
      ie_code_no: { $in: ieCodeArray }, // Use $in to match any of the provided IE codes
    }).select(
      "cth_no total_duty total_inv_value assbl_value assessable_ammount exrate clearanceValue unit_price awb_bl_date job_net_weight loading_port shipping_line_airline port_of_reporting net_weight_calculator ie_code_no hs_code be_no job_no"
    );

    console.log("Database IE Code:", job?.ie_code_no);
    console.log("Allowed IE Codes:", ieCodeArray);
    console.log("Found job by:", job?.job_no === jobNo ? "job_no" : "be_no");

    // If no job found with matching IE codes, return job not found
    if (!job) {
      console.log("Job not found or IE code not authorized");
      return res.status(404).json({
        success: false,
        message: "Job not found or not authorized for this IE code",
      });
    }

    // Use HS code from job data (cth_no) or the passed hsCode parameter
    const hsCodeToLookup = job.hs_code || job.cth_no || hsCode;

    // Get CTH data only if job exists and IE codes match
    const cthEntry = await CthModel.findOne({
      hs_code: hsCodeToLookup,
    }).select("hs_code basic_duty_sch basic_duty_ntfn igst sws_10_percent");

    if (!cthEntry) {
      console.log("CTH entry not found for HS code:", hsCodeToLookup);
      return res.status(404).json({
        success: false,
        message: "HS Code data not found",
      });
    }

    // Logic to handle both assbl_value and assessable_ammount
    let finalAssessableValue = "0.00";

    const assblValue = parseFloat(job.assbl_value) || 0;
    const assessableAmount = parseFloat(job.assessable_ammount) || 0;

    if (assblValue > 0 && assessableAmount > 0) {
      // If both values are present, choose the larger one
      finalAssessableValue = Math.max(assblValue, assessableAmount).toFixed(2);
    } else if (assblValue > 0) {
      // If only assbl_value is present
      finalAssessableValue = assblValue.toFixed(2);
    } else if (assessableAmount > 0) {
      // If only assessable_ammount is present
      finalAssessableValue = assessableAmount.toFixed(2);
    }

    // Prepare response
    const result = {
      hs_code: cthEntry.hs_code,
      basic_duty_sch: cthEntry.basic_duty_sch,
      basic_duty_ntfn: cthEntry.basic_duty_ntfn,
      igst: cthEntry.igst,
      sws_10_percent: cthEntry.sws_10_percent,
      job_data: {
        job_no: job.job_no,
        be_no: job.be_no,
        total_duty: job.total_duty,
        total_inv_value: job.total_inv_value,
        assbl_value: job.assbl_value,
        assessable_ammount: job.assessable_ammount,
        final_assessable_value: finalAssessableValue,
        exrate: job.exrate,
        clearanceValue: job.clearanceValue,
        unit_price: job.unit_price,
        awb_bl_date: job.awb_bl_date,
        job_net_weight: job.job_net_weight,
        loading_port: job.loading_port,
        shipping_line_airline: job.shipping_line_airline,
        port_of_reporting: job.port_of_reporting,
        net_weight_calculator: job.net_weight_calculator || {
          duty: "0.00",
          shipping: "0.00",
          custom_clearance_charges: "0.00",
          detention: "0.00",
          cfs: "0.00",
          transport: "0.00",
          Labour: "0.00",
          miscellaneous: "0.00",
          weight: job.job_net_weight || "0.00",
          total_cost: "0.00",
          per_kg_cost: "0.00",
        },
        ie_code_no: job.ie_code_no,
        hs_code: job.hs_code,
      },
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error looking up job data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Updated updatePerKgCost API with IE code filtering
export const updatePerKgCostGandhidham = async (req, res) => {
  try {
    const { jobNo, perKgCost, ie_code_no } = req.body;
    const year = req.query.year; // Get year from query params

    // Support multiple IE codes from different sources
    const userIeCodes =
      req.query.ie_code_nos ||
      req.query.ie_code_no ||
      req.headers["x-ie-code"] ||
      ie_code_no;

    if (!jobNo || !year) {
      return res.status(400).json({
        success: false,
        message: "Job number and year are required",
      });
    }

    // Parse IE codes (handle both single and multiple)
    let ieCodeArray = [];
    if (userIeCodes) {
      if (typeof userIeCodes === "string") {
        ieCodeArray = userIeCodes
          .split(",")
          .map((code) => code.trim())
          .filter((code) => code);
      } else {
        ieCodeArray = [userIeCodes];
      }
    }

    // Build the query with $or for job_no and be_no
    const query = {
      $or: [{ job_no: jobNo }, { be_no: jobNo }],
      year: year,
    };

    // Add IE code filtering if provided
    if (ieCodeArray.length > 0) {
      query.ie_code_no = { $in: ieCodeArray };
    }

    console.log("Update Per Kg Cost Query:", JSON.stringify(query, null, 2));

    const updatedJob = await GandhidhamJobModel.findOneAndUpdate(
      query,
      {
        $set: {
          "net_weight_calculator.per_kg_cost": perKgCost,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message:
          ieCodeArray.length > 0
            ? "Job not found or you are not authorized to update this job"
            : "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Per kg cost updated successfully",
      data: {
        per_kg_cost: updatedJob.net_weight_calculator?.per_kg_cost || "0.00",
        job_no: updatedJob.job_no,
        be_no: updatedJob.be_no,
        ie_code_no: updatedJob.ie_code_no,
      },
    });
  } catch (error) {
    console.error("Error updating per kg cost:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update per kg cost",
      error: error.message,
    });
  }
};

// Add a new API for storing calculator data with IE code filtering
export const storeCalculatorDataGandhidham = async (req, res) => {
  try {
    const { jobNo } = req.params;
    const { year } = req.query;

    // Support multiple IE codes from different sources
    const userIeCodes =
      req.query.ie_code_nos ||
      req.query.ie_code_no ||
      req.headers["x-ie-code"] ||
      req.body.ie_code_no;

    if (!jobNo || !year) {
      return res.status(400).json({
        success: false,
        message: "Job number and year are required",
      });
    }

    // Parse IE codes (handle both single and multiple)
    let ieCodeArray = [];
    if (userIeCodes) {
      if (typeof userIeCodes === "string") {
        ieCodeArray = userIeCodes
          .split(",")
          .map((code) => code.trim())
          .filter((code) => code);
      } else {
        ieCodeArray = [userIeCodes];
      }
    }

    // Build the query with $or for job_no and be_no
    const query = {
      $or: [{ job_no: jobNo }, { be_no: jobNo }],
      year: year,
    };

    // Add IE code filtering if provided
    if (ieCodeArray.length > 0) {
      query.ie_code_no = { $in: ieCodeArray };
    }

    console.log("Store Calculator Data Query:", JSON.stringify(query, null, 2));

    // Extract calculator data from request body
    const {
      shipping,
      customclearancecharges,
      detention,
      cfs,
      transport,
      Labour,
      miscellaneous,
      weight,
      totalCost,
      custom_fields,
    } = req.body;

    // Prepare calculator data object
    const calculatorData = {
      duty: req.body.duty || "0.00",
      shipping: shipping || "0.00",
      custom_clearance_charges: customclearancecharges || "0.00",
      customclearancecharges: customclearancecharges || "0.00",
      detention: detention || "0.00",
      cfs: cfs || "0.00",
      transport: transport || "0.00",
      Labour: Labour || "0.00",
      miscellaneous: miscellaneous || "0.00",
      weight: weight || "0.00",
      total_cost: totalCost || "0.00",
      per_kg_cost: req.body.perKgCost || "0.00",
    };

    // Add custom fields if they exist
    if (custom_fields && Array.isArray(custom_fields)) {
      calculatorData.custom_fields = custom_fields;
    }

    // Use findOneAndUpdate to update calculator data
    const updatedJob = await GandhidhamJobModel.findOneAndUpdate(
      query,
      {
        $set: {
          net_weight_calculator: calculatorData,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message:
          ieCodeArray.length > 0
            ? "Job not found or you are not authorized to update this job"
            : "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Calculator data stored successfully",
      data: {
        net_weight_calculator: updatedJob.net_weight_calculator,
        job_no: updatedJob.job_no,
        be_no: updatedJob.be_no,
        ie_code_no: updatedJob.ie_code_no,
      },
    });
  } catch (error) {
    console.error("Error storing calculator data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to store calculator data",
      error: error.message,
    });
  }
};

export const updateJobDutyAndWeightGandhidham = async (req, res) => {
  try {
    const { jobNo } = req.params;
    const { year, total_duty, job_net_weight, ie_code_no } = req.body;

    if (!jobNo || !year) {
      return res.status(400).json({
        success: false,
        message: "Job number and year are required",
      });
    }

    // Build the query
    const query = {
      job_no: jobNo,
      be_no: jobNo,
      year: year,
    };

    if (ie_code_no) {
      query.ie_code_no = ie_code_no;
    }

    // Update the job with new duty and weight data
    // The pre-save middleware will automatically calculate per_kg_cost
    const updatedJob = await GandhidhamJobModel.findOneAndUpdate(
      query,
      {
        $set: {
          ...(total_duty !== undefined && {
            total_duty: total_duty.toString(),
          }),
          ...(job_net_weight !== undefined && {
            job_net_weight: job_net_weight.toString(),
          }),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message: ie_code_no
          ? "Job not found or you are not authorized to update this job"
          : "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Job updated successfully. Per kg cost calculated automatically.",
      data: {
        job_no: updatedJob.job_no,
        total_duty: updatedJob.total_duty,
        job_net_weight: updatedJob.job_net_weight,
        per_kg_cost: updatedJob.net_weight_calculator?.per_kg_cost || "0.00",
      },
    });
  } catch (error) {
    console.error("Error updating job duty and weight:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update job data",
      error: error.message,
    });
  }
};

export const getContainerDetailsGandhidham = async (req, res) => {
  try {
    const { year, status, size, ie_codes } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year parameter is required (25-26 or 24-25)",
      });
    }

    if (!ie_codes) {
      return res.status(400).json({
        success: false,
        message: "IE codes are required for authorization",
      });
    }

    if (!status || !["arrived", "transit"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status parameter is required (arrived or transit)",
      });
    }

    if (size && !["20", "40"].includes(size)) {
      return res.status(400).json({
        success: false,
        message: "Size parameter must be either '20' or '40'",
      });
    }

    // Parse comma-separated IE codes from query param
    const userIeCodes = ie_codes
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code);

    // Build match query - support multiple IE codes
    const matchQuery = {
      year: year,
      ie_code_no: { $in: userIeCodes }, // Changed to support multiple IE codes
      $or: [
        { bill_no: { $exists: false } },
        { bill_no: null },
        { bill_no: "" },
      ],
    };

    // Use aggregation pipeline to get detailed container information
    const pipeline = [
      {
        $match: matchQuery,
      },
      {
        $unwind: {
          path: "$container_nos",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "container_nos.size": { $in: size ? [size] : ["20", "40"] },
        },
      },
      {
        $project: {
          job_no: 1,
          job_date: 1,
          importer: 1,
          supplier_exporter: 1,
          awb_bl_no: 1,
          vessel_berthing: 1,
          discharge_date: 1,
          loading_port: 1,
          port_of_reporting: 1,
          shipping_line_airline: 1,
          ie_code_no: 1, // Include IE code for tracking
          container: {
            container_number: "$container_nos.container_number",
            size: "$container_nos.size",
            arrival_date: "$container_nos.arrival_date",
            delivery_date: "$container_nos.delivery_date",
            emptyContainerOffLoadDate:
              "$container_nos.emptyContainerOffLoadDate",
            container_rail_out_date: "$container_nos.container_rail_out_date",
            detention_from: "$container_nos.detention_from",
            transporter: "$container_nos.transporter",
            vehicle_no: "$container_nos.vehicle_no",
            delivery_address: "$container_nos.delivery_address",
            delivery_planning: "$container_nos.delivery_planning",
            net_weight_as_per_PL_document:
              "$container_nos.net_weight_as_per_PL_document",
          },
        },
      },
    ];

    const result = await GandhidhamJobModel.aggregate(pipeline);

    // Filter containers based on status and business logic (unchanged)
    const filteredContainers = result.filter((item) => {
      const container = item.container;

      const isFullyCompleted =
        container.emptyContainerOffLoadDate &&
        container.emptyContainerOffLoadDate.trim() !== "" &&
        container.emptyContainerOffLoadDate !== null;

      if (isFullyCompleted) {
        return false;
      }

      const hasArrivedAtPort =
        container.arrival_date &&
        container.arrival_date.trim() !== "" &&
        container.arrival_date !== null;

      if (status === "arrived") {
        return hasArrivedAtPort;
      } else if (status === "transit") {
        return !hasArrivedAtPort;
      }

      return false;
    });

    // Format the response with additional computed fields (unchanged)
    const formattedContainers = filteredContainers.map((item) => ({
      job_no: item.job_no,
      job_date: item.job_date,
      importer: item.importer,
      supplier_exporter: item.supplier_exporter,
      awb_bl_no: item.awb_bl_no,
      vessel_berthing: item.vessel_berthing,
      discharge_date: item.discharge_date,
      loading_port: item.loading_port,
      port_of_reporting: item.port_of_reporting,
      shipping_line_airline: item.shipping_line_airline,
      ie_code_no: item.ie_code_no, // Include IE code info
      container_number: item.container.container_number,
      container_size: item.container.size,
      arrival_date: item.container.arrival_date,
      delivery_date: item.container.delivery_date,
      emptyContainerOffLoadDate: item.container.emptyContainerOffLoadDate,
      container_rail_out_date: item.container.container_rail_out_date,
      detention_from: item.container.detention_from,
      transporter: item.container.transporter,
      vehicle_no: item.container.vehicle_no,
      delivery_address: item.container.delivery_address,
      delivery_planning: item.container.delivery_planning,
      net_weight_as_per_PL_document:
        item.container.net_weight_as_per_PL_document,
      container_status: status,
      days_since_arrival: item.container.arrival_date
        ? Math.floor(
            (new Date() - new Date(item.container.arrival_date)) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    }));

    // Sort containers (unchanged logic)
    if (status === "arrived") {
      formattedContainers.sort(
        (a, b) => new Date(b.arrival_date) - new Date(a.arrival_date)
      );
    } else {
      formattedContainers.sort((a, b) => a.job_no.localeCompare(b.job_no));
    }

    return res.status(200).json({
      success: true,
      data: formattedContainers,
      total_count: formattedContainers.length,
      filters: {
        year: year,
        status: status,
        size: size || "all",
        ie_codes: userIeCodes,
      },
      last_updated: new Date().toISOString(),
      message: `Found ${formattedContainers.length} container(s) with status '${status}' for year ${year}`,
    });
  } catch (error) {
    console.error("Error generating container details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate container details",
      error: error.message,
    });
  }
};

export const getContainerSummaryGandhidham = async (req, res) => {
  try {
    const { year, groupBy = "status", ie_codes } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year parameter is required (25-26 or 24-25)",
      });
    }

    if (!ie_codes) {
      return res.status(400).json({
        success: false,
        message: "IE codes are required for authorization",
      });
    }

    // Parse comma-separated IE codes from query param
    const userIeCodes = ie_codes
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code);

    // Validate groupBy parameter
    const validGroupByOptions = ["status", "size", "month", "port"];
    if (!validGroupByOptions.includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid groupBy parameter. Valid options: status, size, month, port",
      });
    }

    // Build match query - support multiple IE codes
    const matchQuery = {
      year: year,
      ie_code_no: { $in: userIeCodes }, // Changed to support multiple IE codes
      $or: [
        { bill_no: { $exists: false } },
        { bill_no: null },
        { bill_no: "" },
      ],
    };

    // Base pipeline - enhanced to support different groupBy options
    const pipeline = [
      {
        $match: matchQuery,
      },
      {
        $unwind: {
          path: "$container_nos",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "container_nos.size": { $in: ["20", "40"] },
        },
      },
    ];

    // Add additional fields for grouping if needed
    if (groupBy === "month" || groupBy === "port") {
      pipeline.push({
        $addFields: {
          "container_nos.arrival_month": {
            $cond: [
              {
                $and: [
                  { $ne: ["$container_nos.arrival_date", null] },
                  { $ne: ["$container_nos.arrival_date", ""] },
                ],
              },
              {
                $dateToString: {
                  format: "%Y-%m",
                  date: {
                    $dateFromString: {
                      dateString: "$container_nos.arrival_date",
                      onError: null,
                    },
                  },
                },
              },
              "Not Arrived",
            ],
          },
        },
      });
    }

    // Group containers data
    pipeline.push({
      $group: {
        _id: null,
        containers: {
          $push: {
            size: "$container_nos.size",
            arrival_date: "$container_nos.arrival_date",
            delivery_date: "$container_nos.delivery_date",
            emptyContainerOffLoadDate:
              "$container_nos.emptyContainerOffLoadDate",
            container_rail_out_date: "$container_nos.container_rail_out_date",
            delivery_planning: "$container_nos.delivery_planning",
            port_of_reporting: "$port_of_reporting",
            arrival_month: "$container_nos.arrival_month",
            ie_code_no: "$ie_code_no", // Include IE code for tracking
          },
        },
      },
    });

    const result = await GandhidhamJobModel.aggregate(pipeline);

    // Initialize counters
    let count20Arrived = 0;
    let count40Arrived = 0;
    let count20Transit = 0;
    let count40Transit = 0;

    // Process container data if results exist (business logic unchanged)
    if (result.length > 0 && result[0].containers) {
      result[0].containers.forEach((container) => {
        const isFullyCompleted =
          container.emptyContainerOffLoadDate &&
          container.emptyContainerOffLoadDate.trim() !== "" &&
          container.emptyContainerOffLoadDate !== null;

        const hasArrivedAtPort =
          container.arrival_date &&
          container.arrival_date.trim() !== "" &&
          container.arrival_date !== null;

        if (isFullyCompleted) {
          return;
        }

        if (container.size === "20") {
          if (hasArrivedAtPort) {
            count20Arrived++;
          } else {
            count20Transit++;
          }
        } else if (container.size === "40") {
          if (hasArrivedAtPort) {
            count40Arrived++;
          } else {
            count40Transit++;
          }
        }
      });
    }

    // Calculate totals
    const totalArrived = count20Arrived + count40Arrived;
    const totalTransit = count20Transit + count40Transit;
    const grandTotal = totalArrived + totalTransit;

    const summary = {
      "20_arrived": count20Arrived,
      "40_arrived": count40Arrived,
      "20_transit": count20Transit,
      "40_transit": count40Transit,
      total_arrived: totalArrived,
      total_transit: totalTransit,
      grand_total: grandTotal,
    };

    return res.status(200).json({
      success: true,
      summary: summary,
      year_filter: year,
      group_by: groupBy,
      ie_codes_used: userIeCodes,
      last_updated: new Date().toISOString(),
      message: `Container summary for year ${year} generated successfully`,
    });
  } catch (error) {
    console.error("Error generating container summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate container summary",
      error: error.message,
    });
  }
};
