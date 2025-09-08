// Get job counts for Gandhidham importer

import mongoose from "mongoose";
import JobModel from "../models/jobModel.js";


// Connect to Gandhidham DB using a separate mongoose connection
const gandhidhamConnection = mongoose.createConnection(process.env.Gandhidham_URI, {
  useUnifiedTopology: true,
});

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
/*******  630b8e0a-3077-48f7-a741-5349a88f6397  *******/  $or: [
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
    const { page = 1, limit = 100, search = "", exporter = "", ieCodes = "", importers = "" } = req.query;
    const skip = (page - 1) * limit;

    // Handle IE codes from multiple sources
    let ieCodeArray = [];
    
    if (ieCodes) {
      // If ieCodes are provided in query (existing functionality)
      ieCodeArray = ieCodes.split(',').map(code => code.trim().toUpperCase());
    } else if (req.user) {
      // Extract IE codes from authenticated user (new functionality)
      ieCodeArray = extractIECodes(req.user);
    }

    if (ieCodeArray.length === 0) {
      return res.status(400).json({ 
        message: "No IE Codes found. Please ensure you have assigned IE codes or provide them in the request." 
      });
    }

    console.log('IE Codes being used for query:', ieCodeArray);

    const importerArray = importers ? importers.split(';').map(imp => imp.trim()) : [];

    const query = {
      year,
      ie_code_no: { $in: ieCodeArray },
      $and: [],
    };

    if (importerArray.length > 0) {
      query.$and.push({
        importer: { $in: importerArray.map(imp => new RegExp(`^${escapeRegex(imp)}$`, 'i')) },
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

    console.log('Final query:', JSON.stringify(query, null, 2));

    const jobs = await GandhidhamJobModel.find(query).select(
      getSelectedFields(detailedStatus === "all" ? "all" : detailedStatus)
    );

    console.log(`Found ${jobs.length} jobs for IE codes: ${ieCodeArray.join(', ')}`);

    // Rest of your sorting and pagination logic remains the same
    const rankedJobs = jobs.filter(job => statusRank[job.detailed_status]);
    const unrankedJobs = jobs.filter(job => !statusRank[job.detailed_status]);

    const sortedRankedJobs = Object.entries(statusRank).reduce(
      (acc, [status, { field }]) => [
        ...acc,
        ...rankedJobs
          .filter(job => job.detailed_status === status)
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
    res.status(500).json({ error: "Error fetching Gandhidham job counts by importer" });
  }
}