import JobModel from "../models/jobModel.js";

// Helper to build search conditions
const buildSearchQuery = (search) => {
  const escapeRegex = (string) => {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  };

  return {
    $or: [
      { status: { $regex: escapeRegex(search), $options: "i" } },
      { be_no: { $regex: escapeRegex(search), $options: "i" } },
      { bill_date: { $regex: escapeRegex(search), $options: "i" } },
    ],
  };
};

const getOverviewPipeline = (startDateStr, endDateStr, importer) => {
  // startDateStr and endDateStr are now YYYY-MM-DD strings directly
  const sevenDaysAgoStr = startDateStr;
  const todayStr = endDateStr;

  // Handle importer filtering: accept array or comma-separated string
  let importerList = [];
  if (Array.isArray(importer)) {
    importerList = importer;
  } else if (typeof importer === 'string' && importer) {
    importerList = importer.split(',');
  }

  const importerMatch = importerList.length > 0
    ? { importer: { $in: importerList } }
    : {};

  return [
    {
      $facet: {
        jobs_created_today: [
          {
            $match: {
              job_date: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$job_date",
            },
          },
        ],
        operations_completed: [
          {
            $match: {
              completed_operation_date: {
                $gte: startDateStr,
                $lte: endDateStr,
              },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$completed_operation_date",
            },
          },
        ],
        examination_planning: [
          {
            $match: {
              examination_planning_date: {
                $gte: startDateStr,
                $lte: endDateStr,
              },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$examination_planning_date",
            },
          },
        ],
        jobs_trend: [
          {
            $match: {
              job_date: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$job_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        ops_trend: [
          {
            $match: {
              completed_operation_date: {
                $gte: sevenDaysAgoStr,
                $lte: todayStr,
              },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$completed_operation_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        exam_trend: [
          {
            $match: {
              examination_planning_date: {
                $gte: sevenDaysAgoStr,
                $lte: todayStr,
              },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$examination_planning_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        arrival_trend: [
          { $match: { ...importerMatch } },
          { $unwind: "$container_nos" },
          {
            $match: {
              "container_nos.arrival_date": {
                $gte: sevenDaysAgoStr,
                $lte: todayStr,
              },
            },
          },
          {
            $group: {
              _id: { $substr: ["$container_nos.arrival_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        rail_out_trend: [
          { $match: { ...importerMatch } },
          { $unwind: "$container_nos" },
          {
            $match: {
              "container_nos.container_rail_out_date": {
                $gte: sevenDaysAgoStr,
                $lte: todayStr,
              },
            },
          },
          {
            $group: {
              _id: {
                $substr: ["$container_nos.container_rail_out_date", 0, 10],
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        be_trend: [
          {
            $match: {
              be_date: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$be_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        ooc_trend: [
          {
            $match: {
              out_of_charge: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$out_of_charge", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        do_trend: [
          {
            $match: {
              do_completed: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$do_completed", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        billing_trend: [
          {
            $match: {
              bill_document_sent_to_accounts: {
                $gte: sevenDaysAgoStr,
                $lte: todayStr,
              },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$bill_document_sent_to_accounts", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        eta_trend: [
          {
            $match: {
              vessel_berthing: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$vessel_berthing", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        gateway_igm_trend: [
          {
            $match: {
              gateway_igm_date: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$gateway_igm_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        discharge_trend: [
          {
            $match: {
              discharge_date: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$discharge_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        arrivals_today: [
          { $match: { ...importerMatch } },
          { $unwind: "$container_nos" },
          {
            $match: {
              "container_nos.arrival_date": {
                $gte: startDateStr,
                $lte: endDateStr,
              },
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$container_nos.arrival_date",
              container_number: "$container_nos.container_number",
            },
          },
        ],
        rail_out_today: [
          { $match: { ...importerMatch } },
          { $unwind: "$container_nos" },
          {
            $match: {
              "container_nos.container_rail_out_date": {
                $gte: startDateStr,
                $lte: endDateStr,
              },
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$container_nos.container_rail_out_date",
              container_number: "$container_nos.container_number",
            },
          },
        ],
        be_filed: [
          {
            $match: {
              be_date: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$be_date",
              processed_be_attachment: 1,
            },
          },
        ],
        ooc: [
          {
            $match: {
              out_of_charge: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$out_of_charge",
              ooc_copies: 1,
            },
          },
        ],
        do_completed: [
          {
            $match: {
              do_completed: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$do_completed",
            },
          },
        ],
        billing_sent: [
          {
            $match: {
              bill_document_sent_to_accounts: {
                $gte: startDateStr,
                $lte: endDateStr,
              },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$bill_document_sent_to_accounts",
            },
          },
        ],
        eta: [
          {
            $match: {
              vessel_berthing: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$vessel_berthing",
            },
          },
        ],
        gateway_igm_date: [
          {
            $match: {
              gateway_igm_date: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$gateway_igm_date",
            },
          },
        ],
        discharge_date: [
          {
            $match: {
              discharge_date: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$discharge_date",
            },
          },
        ],
        empty_offload: [
          { $match: { ...importerMatch } },
          { $unwind: "$container_nos" },
          {
            $match: {
              "container_nos.emptyContainerOffLoadDate": {
                $gte: startDateStr,
                $lte: endDateStr,
              },
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$container_nos.emptyContainerOffLoadDate",
              container_number: "$container_nos.container_number",
            },
          },
        ],
      },
    },
    {
      $project: {
        summary: {
          jobs_created_today: { $size: "$jobs_created_today" },
          operations_completed: { $size: "$operations_completed" },
          examination_planning: { $size: "$examination_planning" },
          arrivals_today: { $size: "$arrivals_today" },
          rail_out_today: { $size: "$rail_out_today" },
          be_filed: { $size: "$be_filed" },
          ooc: { $size: "$ooc" },
          do_completed: { $size: "$do_completed" },
          billing_sent: { $size: "$billing_sent" },
          eta: { $size: "$eta" },
          gateway_igm_date: { $size: "$gateway_igm_date" },
          discharge_date: { $size: "$discharge_date" },
          empty_offload: { $size: "$empty_offload" },
        },
        details: {
          jobs_created_today: "$jobs_created_today",
          jobs_trend: "$jobs_trend",
          ops_trend: "$ops_trend",
          exam_trend: "$exam_trend",
          arrival_trend: "$arrival_trend",
          rail_out_trend: "$rail_out_trend",
          be_trend: "$be_trend",
          ooc_trend: "$ooc_trend",
          do_trend: "$do_trend",
          billing_trend: "$billing_trend",
          eta_trend: "$eta_trend",
          gateway_igm_trend: "$gateway_igm_trend",
          discharge_trend: "$discharge_trend",
          operations_completed: "$operations_completed",
          examination_planning: "$examination_planning",
          arrivals_today: "$arrivals_today",
          rail_out_today: "$rail_out_today",
          be_filed: "$be_filed",
          ooc: "$ooc",
          do_completed: "$do_completed",
          billing_sent: "$billing_sent",
          eta: "$eta",
          gateway_igm_date: "$gateway_igm_date",
          discharge_date: "$discharge_date",
          empty_offload: "$empty_offload",
        },
      },
    },
  ];
};

export async function getUserDashboardStats(req, res) {
  try {
    const { importer, date, startDate, endDate } = req.query;
    const user = req.user;
   
    // Determine start and end dates
    // Prioritize explicit start/end dates, fallback to 'date' param, then fallback to today
    let startStr, endStr;

    if (startDate && endDate) {
      startStr = startDate;
      endStr = `${endDate}T23:59:59`;
    } else {
      // Fallback to single date logic
      let singleDate;
      if (date) {
        singleDate = date;
      } else {
        // Default to today in local timezone
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        singleDate = `${year}-${month}-${day}`;
      }
      startStr = singleDate;
      endStr = `${singleDate}T23:59:59`;
    }

    let targetImporters = null; // null implies fetch all (for superadmin)

    // Check if user is restricted (not superadmin)
    if (user && user.role !== "superadmin") {
      const assignments = user.ie_code_assignments || [];
      let assignedNames = assignments.map((a) => a.importer_name);

      // Fallback for legacy single assignment
      if (assignedNames.length === 0 && user.assignedImporterName) {
        assignedNames = [user.assignedImporterName];
      }

      // If user has no assignments, return empty result
      if (assignedNames.length === 0) {
        return res.json({ summary: {}, details: {} });
      }

      // If user requested specific importers, filter them against their assignments
      if (importer) {
        const requested = importer.split(",");
        targetImporters = requested.filter((name) =>
          assignedNames.includes(name)
        );
      } else {
        // Default to all assigned importers
        targetImporters = assignedNames;
      }

      // If filtering resulted in no valid importers, return empty result
      if (targetImporters.length === 0) {
        return res.json({ summary: {}, details: {} });
      }
    } else {
      // Superadmin or no user validation (though middleware should catch this)
      if (importer) {
        targetImporters = importer.split(",");
      }
    }

    // Pass targetImporters (array or null) directly to pipeline helper
    const importerParam = targetImporters;
    console.log("Filtering Pipeline Params:", { startStr, endStr, importerParam });
    console.log("Filtering by Importers:", importerParam);
    console.log("Date Range:", { startStr, endStr });

    // Pass the calculated start and end strings
    const pipeline = getOverviewPipeline(startStr, endStr, importerParam);
    const result = await JobModel.aggregate(pipeline);

    const stats = result[0] || { summary: {}, details: {} };
    res.json(stats);
  } catch (error) {
    console.error("Error fetching user dashboard stats:", error);
    res.status(500).json({ error: "Error fetching user dashboard stats" });
  }
}

// * Controller function to get jobs overview by YEARRR
export async function getJobsOverview(req, res) {
  try {
    const { year } = req.params;
    const status = req.query.status;
    const search = req.query.search;
    const importer = req.query.importer;
    const user = req.user;

    const statusLower = status ? status.toLowerCase() : null;

    // Start building the match query
    const matchQuery = { $and: [{ year: year }] };

    let targetImporters = null;

    // Check if user is restricted (not superadmin)
    if (user && user.role !== "superadmin") {
      const assignments = user.ie_code_assignments || [];
      let assignedNames = assignments.map((a) => a.importer_name);

      // Fallback for legacy single assignment
      if (assignedNames.length === 0 && user.assignedImporterName) {
        assignedNames = [user.assignedImporterName];
      }

      // If user has no assignments, return empty result
      if (assignedNames.length === 0) {
        return res.json({
          pendingJobs: 0,
          completedJobs: 0,
          cancelledJobs: 0,
          totalJobs: 0,
        });
      }

      // If importer requested, filter against assignments
      if (importer) {
        const requested = importer.split(",");
        targetImporters = requested.filter((name) =>
          assignedNames.includes(name)
        );
      } else {
        targetImporters = assignedNames;
      }

      if (targetImporters.length === 0) {
        return res.json({
          pendingJobs: 0,
          completedJobs: 0,
          cancelledJobs: 0,
          totalJobs: 0,
        });
      }
    } else {
      // Superadmin can filter by requested importer
      if (importer) {
        targetImporters = importer.split(",");
      }
    }

    if (targetImporters && targetImporters.length > 0) {
      matchQuery.$and.push({ importer: { $in: targetImporters } });
    }

    // Conditions based on status
    if (statusLower === "pending") {
      matchQuery.$and.push(
        { status: { $regex: "^pending$", $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        {
          $or: [
            { bill_date: { $in: [null, ""] } },
            { status: { $regex: "^pending$", $options: "i" } },
          ],
        },
      );
    } else if (statusLower === "completed") {
      matchQuery.$and.push(
        { status: { $regex: "^completed$", $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        {
          $or: [
            { bill_date: { $nin: [null, ""] } },
            { status: { $regex: "^completed$", $options: "i" } },
          ],
        },
      );
    } else if (statusLower === "cancelled") {
      matchQuery.$and.push({
        $or: [
          { status: { $regex: "^cancelled$", $options: "i" } },
          { be_no: { $regex: "^cancelled$", $options: "i" } },
        ],
      });
    }

    // Add search conditions if provided
    if (search) {
      matchQuery.$and.push(buildSearchQuery(search));
    }

    const jobCounts = await JobModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          pendingJobs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: [{ $toLower: "$status" }, "pending"] },
                    { $ne: [{ $toLower: "$be_no" }, "cancelled"] },
                    {
                      $or: [
                        { $eq: ["$bill_date", null] },
                        { $eq: ["$bill_date", ""] },
                        { $eq: [{ $toLower: "$status" }, "pending"] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          completedJobs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: [{ $toLower: "$status" }, "completed"] },
                    { $ne: [{ $toLower: "$be_no" }, "cancelled"] },
                    {
                      $or: [
                        // completed means either bill_date is not null/empty OR status is completed
                        { $ne: ["$bill_date", null] },
                        { $ne: ["$bill_date", ""] },
                        { $eq: [{ $toLower: "$status" }, "completed"] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          cancelledJobs: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: [{ $toLower: "$status" }, "cancelled"] },
                    { $eq: [{ $toLower: "$be_no" }, "cancelled"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalJobs: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          pendingJobs: 1,
          completedJobs: 1,
          cancelledJobs: 1,
          totalJobs: 1,
        },
      },
    ]);

    const responseObj = jobCounts[0] || {
      pendingJobs: 0,
      completedJobs: 0,
      cancelledJobs: 0,
      totalJobs: 0,
    };

    res.json(responseObj);
  } catch (error) {
    console.error("Error fetching job counts:", error);
    res.status(500).json({ error: "Error fetching job counts" });
  }
}
