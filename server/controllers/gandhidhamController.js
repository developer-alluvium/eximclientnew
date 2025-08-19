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

export async function getJobsByStatusAndImporterGandhidham(req, res) {
  try {
    const { year, status, detailedStatus, importer } = req.params;
    const { page = 1, limit = 100, search = "", exporter = "" } = req.query;
    
    // Validate pagination parameters
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.max(parseInt(limit, 10) || 100, 1);
    const skip = (safePage - 1) * safeLimit;

    // Base query with year filter
    const query = { year };

    // Handle importer filtering with proper escaping
    if (importer && importer.toLowerCase() !== "all") {
      query.importer = {
        $regex: `^${escapeRegex(importer)}$`,
        $options: "i",
      };
    }

    // Handle case-insensitive status filtering and bill_date conditions
    const statusLower = status.toLowerCase();

    if (statusLower === "all") {
      // For 'all' status, just exclude cancelled jobs
      query.$and = [
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        { status: { $not: { $regex: "^cancelled$", $options: "i" } } }
      ];
    } else if (statusLower === "pending") {
      query.$and = [
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
      query.$and = [
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
      query.$and = [
        {
          $or: [
            { status: { $regex: "^cancelled$", $options: "i" } },
            { be_no: { $regex: "^cancelled$", $options: "i" } },
          ],
        },
      ];
      if (search) query.$and.push(buildSearchQuery(search));
    } else {
      query.$and = [
        { status: { $regex: `^${status}$`, $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
      ];
    }

    // Handle detailedStatus filtering
    if (detailedStatus !== "all") {
      query.detailed_status = statusMapping[detailedStatus] || detailedStatus;
    }

    // Add search filter if provided (for non-cancelled cases)
    if (search && statusLower !== "cancelled") {
      query.$and.push(buildSearchQuery(search));
    }

    // Add exporter filter if provided
    if (exporter && exporter !== "all") {
      query.supplier_exporter = {
        $regex: `^${escapeRegex(exporter)}$`,
        $options: "i",
      };
    }

    // Use the validated safePage and skip values consistently
    const jobs = await GandhidhamJobModel.find(query)
      .skip(skip) // Use the validated skip value
      .limit(safeLimit) // Use the validated limit value
      .lean();
    
    const total = await GandhidhamJobModel.countDocuments(query);
    const totalPages = Math.ceil(total / safeLimit);

    const rankedJobs = jobs.filter((job) => statusRank[job.detailed_status]);
    const unrankedJobs = jobs.filter((job) => !statusRank[job.detailed_status]);

    // Sort ranked jobs by status rank and date field
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

    // Combine ranked and unranked jobs
    const allJobs = [...sortedRankedJobs, ...unrankedJobs];

    // Paginate results using validated values
    const paginatedJobs = allJobs.slice(skip, skip + safeLimit);

    res.json({
      message: "Gandhidham", 
      data: paginatedJobs, 
      total, 
      totalPages, 
      currentPage: safePage // Use safePage for consistency
    });
  } catch (error) {
    console.error("Error fetching Gandhidham jobs:", error);
    res.status(500).json({ error: "Error fetching Gandhidham jobs" });
  }
}