import JobModel from "../models/jobModel.js";
const analyticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to clear expired cache entries
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of analyticsCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      analyticsCache.delete(key);
    }
  }
};

// ----------------------------------------------------------------------
// HELPER 1: FOR HISTORICAL ANALYTICS (e.g., Import Clearance Report)
// ----------------------------------------------------------------------
const buildImportClearancePipeline = (year, monthInt, additionalMatch = {}) => {
  return [
    {
      $match: {
        year,
        out_of_charge: { $type: "string", $ne: "" },
        be_date: { $type: "string", $ne: "" },
        importer: { $ne: null, $ne: "" },
        ...additionalMatch,
      },
    },
    {
      $addFields: {
        oocDateObj: { $toDate: "$out_of_charge" },
        beDateObj: { $toDate: "$be_date" },
      },
    },
    {
      $addFields: {
        oocMonth: { $month: "$oocDateObj" },
        oocDay: { $dayOfMonth: "$oocDateObj" },
        oocWeek: { $week: "$oocDateObj" },
      },
    },
    { $match: { oocMonth: monthInt } },
    {
      $addFields: {
        containerStats: {
          $reduce: {
            input: "$container_nos",
            initialValue: { ft20: 0, ft40: 0, total: 0 },
            in: {
              ft20: {
                $add: [
                  "$$value.ft20",
                  { $cond: [{ $eq: ["$$this.size", "20"] }, 1, 0] },
                ],
              },
              ft40: {
                $add: [
                  "$$value.ft40",
                  { $cond: [{ $eq: ["$$this.size", "40"] }, 1, 0] },
                ],
              },
              total: { $add: ["$$value.total", 1] },
            },
          },
        },
        teus: {
          $sum: {
            $map: {
              input: "$container_nos",
              as: "c",
              in: {
                $cond: [
                  { $eq: ["$$c.size", "20"] },
                  1,
                  { $cond: [{ $eq: ["$$c.size", "40"] }, 2, 0] },
                ],
              },
            },
          },
        },
        commodityCategory: {
          $cond: [
            {
              $regexMatch: {
                input: "$description",
                regex: /scrap|waste|recyclable/i,
              },
            },
            "SCRAP",
            "GENERAL",
          ],
        },
      },
    },
    {
      $addFields: {
        containerSizeBreakdown: {
          $concat: [
            {
              $cond: [
                { $gt: ["$containerStats.ft20", 0] },
                { $concat: [{ $toString: "$containerStats.ft20" }, "x20"] },
                "",
              ],
            },
            {
              $cond: [
                {
                  $and: [
                    { $gt: ["$containerStats.ft20", 0] },
                    { $gt: ["$containerStats.ft40", 0] },
                  ],
                },
                " + ",
                "",
              ],
            },
            {
              $cond: [
                { $gt: ["$containerStats.ft40", 0] },
                { $concat: [{ $toString: "$containerStats.ft40" }, "x40"] },
                "",
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        job_no: 1,
        be_no: 1,
        be_date: 1,
        out_of_charge: 1,
        oocDay: 1,
        oocWeek: 1,
        location: "$custom_house",
        importer: 1,
        ie_code_no: 1,
        commodity: "$description",
        commodityCategory: 1,
        containerStats: 1,
        containerSizeBreakdown: 1,
        totalContainers: "$containerStats.total",
        teus: 1,
        consignment_type: 1,
        cth_no: 1,
      },
    },
  ];
};

// ----------------------------------------------------------------------
// HELPER 2: FOR HISTORICAL ANALYTICS (Grouping)
// ----------------------------------------------------------------------
const buildAnalyticsPipeline = (year, monthInt, additionalMatch = {}) => {
  const basePipeline = buildImportClearancePipeline(
    year,
    monthInt,
    additionalMatch
  );

  const analyticsStages = [
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        totalContainers: { $sum: "$totalContainers" },
        totalTEUs: { $sum: "$teus" },
        total20ft: { $sum: "$containerStats.ft20" },
        total40ft: { $sum: "$containerStats.ft40" },
        dailyBreakdown: {
          $groupBy: {
            _id: "$oocDay",
            count: { $sum: 1 },
            teus: { $sum: "$teus" },
          },
        },
        weeklyBreakdown: {
          $groupBy: {
            _id: "$oocWeek",
            count: { $sum: 1 },
            teus: { $sum: "$teus" },
          },
        },
        commodityBreakdown: {
          $groupBy: {
            _id: "$commodityCategory",
            count: { $sum: 1 },
            teus: { $sum: "$teus" },
          },
        },
        locationBreakdown: {
          $groupBy: {
            _id: "$location",
            count: { $sum: 1 },
            teus: { $sum: "$teus" },
          },
        },
        jobDetails: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: 0,
        summary: {
          totalJobs: 1,
          totalContainers: 1,
          totalTEUs: 1,
          total20ft: 1,
          total40ft: 1,
          containerRatio: {
            $concat: [
              {
                $toString: {
                  $round: [{ $divide: ["$total20ft", "$totalContainers"] }, 2],
                },
              },
              " (20ft) / ",
              {
                $toString: {
                  $round: [{ $divide: ["$total40ft", "$totalContainers"] }, 2],
                },
              },
              " (40ft)",
            ],
          },
        },
        charts: {
          daily: {
            $sortArray: { input: "$dailyBreakdown", sortBy: { _id: 1 } },
          },
          weekly: {
            $sortArray: { input: "$weeklyBreakdown", sortBy: { _id: 1 } },
          },
          commodities: "$commodityBreakdown",
          locations: "$locationBreakdown",
        },
        jobDetails: 1,
      },
    },
  ];

  return [...basePipeline, ...analyticsStages];
};

// ----------------------------------------------------------------------
// HELPER 3: FOR OPERATIONAL ANALYTICS (e.g., Daily Dashboard)
// ----------------------------------------------------------------------
const calculateOperationalStatuses = (today) => {
  const todayStr = today.toISOString().split("T")[0];

  return [
    {
      $addFields: {
        today: today,
        // Convert dates with error handling
        arrivalDate: {
          $cond: {
            if: { $ne: ["$container_nos.arrival_date", ""] },
            then: { $toDate: "$container_nos.arrival_date" },
            else: null,
          },
        },
        railOutDate: {
          $cond: {
            if: { $ne: ["$container_nos.container_rail_out_date", ""] },
            then: { $toDate: "$container_nos.container_rail_out_date" },
            else: null,
          },
        },
        doValidityDate: {
          $cond: {
            if: {
              $ne: ["$container_nos.do_validity_upto_container_level", ""],
            },
            then: {
              $toDate: "$container_nos.do_validity_upto_container_level",
            },
            else: null,
          },
        },
        detentionStartDate: {
          $cond: {
            if: { $ne: ["$container_nos.detention_from", ""] },
            then: { $toDate: "$container_nos.detention_from" },
            else: null,
          },
        },
      },
    },
    {
      $addFields: {
        // Calculate days with null checks
        daysUntilArrival: {
          $cond: {
            if: { $ne: ["$arrivalDate", null] },
            then: {
              $divide: [{ $subtract: ["$arrivalDate", "$today"] }, 86400000],
            },
            else: null,
          },
        },
        daysUntilRailOut: {
          $cond: {
            if: { $ne: ["$railOutDate", null] },
            then: {
              $divide: [{ $subtract: ["$railOutDate", "$today"] }, 86400000],
            },
            else: null,
          },
        },
        daysUntilDoExpiry: {
          $cond: {
            if: { $ne: ["$doValidityDate", null] },
            then: {
              $divide: [{ $subtract: ["$doValidityDate", "$today"] }, 86400000],
            },
            else: null,
          },
        },
        daysUntilDetention: {
          $cond: {
            if: { $ne: ["$detentionStartDate", null] },
            then: {
              $divide: [
                { $subtract: ["$detentionStartDate", "$today"] },
                86400000,
              ],
            },
            else: null,
          },
        },
      },
    },
    {
      $addFields: {
        // Simplified status calculations
        arrivalStatus: {
          $switch: {
            branches: [
              {
                case: {
                  $and: [
                    { $ne: ["$daysUntilArrival", null] },
                    { $lt: ["$daysUntilArrival", 0] },
                  ],
                },
                then: "ARRIVED",
              },
              {
                case: {
                  $and: [
                    { $ne: ["$daysUntilArrival", null] },
                    { $lt: ["$daysUntilArrival", 1] },
                  ],
                },
                then: "ARRIVING_TODAY",
              },
              {
                case: {
                  $and: [
                    { $ne: ["$daysUntilArrival", null] },
                    { $lt: ["$daysUntilArrival", 4] },
                  ],
                },
                then: "ARRIVING_SOON_3_DAYS",
              },
            ],
            default: "PENDING_ARRIVAL",
          },
        },
        railOutStatus: {
          $switch: {
            branches: [
              {
                case: {
                  $and: [
                    { $ne: ["$railOutDate", null] },
                    { $lt: ["$daysUntilRailOut", 0] },
                  ],
                },
                then: "COMPLETED",
              },
              {
                case: {
                  $and: [
                    { $ne: ["$railOutDate", null] },
                    { $gte: ["$daysUntilRailOut", 0] },
                  ],
                },
                then: "SCHEDULED",
              },
              {
                case: { $eq: ["$arrivalStatus", "ARRIVED"] },
                then: "OVERDUE",
              },
            ],
            default: "NOT_SET",
          },
        },
        doValidityStatus: {
          $switch: {
            branches: [
              {
                case: {
                  $and: [
                    { $ne: ["$daysUntilDoExpiry", null] },
                    { $lt: ["$daysUntilDoExpiry", 0] },
                  ],
                },
                then: "EXPIRED",
              },
              {
                case: {
                  $and: [
                    { $ne: ["$daysUntilDoExpiry", null] },
                    { $lt: ["$daysUntilDoExpiry", 1] },
                  ],
                },
                then: "EXPIRES_TODAY",
              },
              {
                case: {
                  $and: [
                    { $ne: ["$daysUntilDoExpiry", null] },
                    { $lt: ["$daysUntilDoExpiry", 4] },
                  ],
                },
                then: "EXPIRES_SOON_3_DAYS",
              },
            ],
            default: "VALID",
          },
        },
        detentionStatus: {
          $switch: {
            branches: [
              {
                case: {
                  $and: [
                    { $ne: ["$daysUntilDetention", null] },
                    { $lt: ["$daysUntilDetention", 0] },
                  ],
                },
                then: "ON_DETENTION",
              },
              {
                case: {
                  $and: [
                    { $ne: ["$daysUntilDetention", null] },
                    { $lt: ["$daysUntilDetention", 1] },
                  ],
                },
                then: "STARTS_TODAY",
              },
              {
                case: {
                  $and: [
                    { $ne: ["$daysUntilDetention", null] },
                    { $lt: ["$daysUntilDetention", 4] },
                  ],
                },
                then: "STARTS_SOON_3_DAYS",
              },
            ],
            default: "SAFE",
          },
        },
      },
    },
  ];
};

// Optimized pipeline builder
const buildDateValidityPipeline = (year, today, additionalMatch = {}) => {
  const todayStr = today.toISOString().split("T")[0];

  return [
    {
      $match: {
        year,
        status: { $ne: "Completed" },
        ...additionalMatch,
      },
    },
    { $unwind: "$container_nos" },
    ...calculateOperationalStatuses(today),
    {
      $project: {
        job_no: 1,
        importer: 1,
        container_number: "$container_nos.container_number",
        arrivalStatus: 1,
        railOutStatus: 1,
        doValidityStatus: 1,
        detentionStatus: 1,
        daysUntilArrival: 1,
        daysUntilRailOut: 1,
        daysUntilDoExpiry: 1,
        daysUntilDetention: 1,
        railOutDate: 1,
        isRailOutToday: {
          $cond: {
            if: { $ne: ["$railOutDate", null] },
            then: {
              $eq: [
                { $dateToString: { format: "%Y-%m-%d", date: "$railOutDate" } },
                todayStr,
              ],
            },
            else: false,
          },
        },
      },
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalActiveContainers: { $sum: 1 },
              totalActiveJobs: { $addToSet: "$job_no" },
              arrivalsToday: {
                $sum: {
                  $cond: [{ $eq: ["$arrivalStatus", "ARRIVING_TODAY"] }, 1, 0],
                },
              },
              railOutOverdue: {
                $sum: { $cond: [{ $eq: ["$railOutStatus", "OVERDUE"] }, 1, 0] },
              },
              railOutCompletedToday: {
                $sum: { $cond: ["$isRailOutToday", 1, 0] },
              },
              doExpired: {
                $sum: {
                  $cond: [{ $eq: ["$doValidityStatus", "EXPIRED"] }, 1, 0],
                },
              },
              doExpiresToday: {
                $sum: {
                  $cond: [
                    { $eq: ["$doValidityStatus", "EXPIRES_TODAY"] },
                    1,
                    0,
                  ],
                },
              },
              doExpiresSoon3Days: {
                $sum: {
                  $cond: [
                    { $eq: ["$doValidityStatus", "EXPIRES_SOON_3_DAYS"] },
                    1,
                    0,
                  ],
                },
              },
              onDetention: {
                $sum: {
                  $cond: [{ $eq: ["$detentionStatus", "ON_DETENTION"] }, 1, 0],
                },
              },
              detentionStartsToday: {
                $sum: {
                  $cond: [{ $eq: ["$detentionStatus", "STARTS_TODAY"] }, 1, 0],
                },
              },
              detentionStartsSoon3Days: {
                $sum: {
                  $cond: [
                    { $eq: ["$detentionStatus", "STARTS_SOON_3_DAYS"] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        details: [
          {
            $project: {
              job_no: 1,
              importer: 1,
              container_number: 1,
              arrival: {
                status: "$arrivalStatus",
                days: { $round: ["$daysUntilArrival", 1] },
              },
              rail_out: {
                status: "$railOutStatus",
                days: { $round: ["$daysUntilRailOut", 1] },
              },
              do_validity: {
                status: "$doValidityStatus",
                days: { $round: ["$daysUntilDoExpiry", 1] },
              },
              detention: {
                status: "$detentionStatus",
                days: { $round: ["$daysUntilDetention", 1] },
              },
            },
          },
        ],
      },
    },
    {
      $project: {
        summary: {
          $let: {
            vars: {
              summaryData: { $arrayElemAt: ["$summary", 0] },
            },
            in: {
              totalActiveJobs: { $size: "$$summaryData.totalActiveJobs" },
              totalActiveContainers: "$$summaryData.totalActiveContainers",
            },
          },
        },
        actionRequired: {
          $let: {
            vars: {
              summaryData: { $arrayElemAt: ["$summary", 0] },
            },
            in: {
              detention: {
                onDetention: "$$summaryData.onDetention",
                startsToday: "$$summaryData.detentionStartsToday",
                startsSoon3Days: "$$summaryData.detentionStartsSoon3Days",
              },
              do_validity: {
                expired: "$$summaryData.doExpired",
                expiresToday: "$$summaryData.doExpiresToday",
                expiresSoon3Days: "$$summaryData.doExpiresSoon3Days",
              },
              arrivals: {
                arrivingToday: "$$summaryData.arrivalsToday",
              },
              rail_out: {
                overdue: "$$summaryData.railOutOverdue",
                completedToday: "$$summaryData.railOutCompletedToday",
              },
            },
          },
        },
        details: 1,
      },
    },
  ];
};

// Optimized Date Validity Analytics - Only personalized data
export const getDateValidityAnalytics = async (req, res) => {
  const { year } = req.params;
  const { date, importer } = req.query;

  // Validate that we have either importer or user context
  if (!importer || importer === "All Importers") {
    return res.status(400).json({
      message: "Importer parameter is required for personalized analytics",
    });
  }

  const today = date ? new Date(date) : new Date();
  today.setHours(0, 0, 0, 0);

  // Create cache key
  const cacheKey = `analytics:${year}:${importer}:${today.toISOString()}`;

  // Clear expired cache entries
  clearExpiredCache();

  // Check cache
  const cached = analyticsCache.get(cacheKey);
  if (cached) {
    return res.status(200).json(cached.data);
  }

  try {
    const additionalMatch = { importer: decodeURIComponent(importer) };
    const pipeline = buildDateValidityPipeline(year, today, additionalMatch);

    const result = await JobModel.aggregate(pipeline).allowDiskUse(true); // For large datasets

    const analyticsData =
      result.length > 0
        ? result[0]
        : {
            summary: { totalActiveJobs: 0, totalActiveContainers: 0 },
            actionRequired: {
              detention: { onDetention: 0, startsToday: 0, startsSoon3Days: 0 },
              do_validity: { expired: 0, expiresToday: 0, expiresSoon3Days: 0 },
              arrivals: { arrivingToday: 0 },
              rail_out: { overdue: 0, completedToday: 0 },
            },
            details: [],
          };

    // Cache the result
    analyticsCache.set(cacheKey, {
      data: analyticsData,
      timestamp: Date.now(),
    });

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error("❌ Error in date validity analytics route:", error);
    res.status(500).json({
      message: "Failed to generate personalized analytics data.",
    });
  }
};

// ----------------------------------------------------------------------
// ENDPOINTS
// ----------------------------------------------------------------------

// --- HISTORICAL ANALYTICS ENDPOINTS ---

export const getImportClearanceAll = async (req, res) => {
  const { year, month } = req.params;
  const monthInt = parseInt(month);
  try {
    const pipeline = buildAnalyticsPipeline(year, monthInt);
    const result = await JobModel.aggregate(pipeline);

    // The new pipeline structure returns the final object directly
    // But $facet returns an array, so we take the first element.
    const analyticsData =
      result.length > 0
        ? result[0]
        : {
            summary: {
              totalJobs: 0,
              totalContainers: 0,
              totalTEUs: 0,
              total20ft: 0,
              total40ft: 0,
              containerRatio: "N/A",
            },
            charts: { daily: [], weekly: [], commodities: [], locations: [] },
            jobDetails: [],
          };

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error("❌ Error in import clearance route:", error);
    res
      .status(500)
      .json({ message: "Failed to generate import clearance report." });
  }
};

export const getImportClearanceByImporter = async (req, res) => {
  const { year, month, importer } = req.params;
  const monthInt = parseInt(month);
  try {
    const additionalMatch = { importer: decodeURIComponent(importer) };
    const pipeline = buildAnalyticsPipeline(year, monthInt, additionalMatch);
    const result = await JobModel.aggregate(pipeline);

    const analyticsData =
      result.length > 0
        ? result[0]
        : {
            summary: {
              totalJobs: 0,
              totalContainers: 0,
              totalTEUs: 0,
              total20ft: 0,
              total40ft: 0,
              containerRatio: "N/A",
            },
            charts: { daily: [], weekly: [], commodities: [], locations: [] },
            jobDetails: [],
          };

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error("❌ Error in single importer import clearance route:", error);
    res.status(500).json({
      message: "Failed to generate import clearance report for the importer.",
    });
  }
};

export const getImportClearanceByIECode = async (req, res) => {
  const { year, month, ieCode } = req.params;
  const monthInt = parseInt(month);
  try {
    const additionalMatch = { ie_code_no: ieCode };
    const pipeline = buildAnalyticsPipeline(year, monthInt, additionalMatch);
    const result = await JobModel.aggregate(pipeline);

    const analyticsData =
      result.length > 0
        ? result[0]
        : {
            summary: {
              totalJobs: 0,
              totalContainers: 0,
              totalTEUs: 0,
              total20ft: 0,
              total40ft: 0,
              containerRatio: "N/A",
            },
            charts: { daily: [], weekly: [], commodities: [], locations: [] },
            jobDetails: [],
          };

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error("❌ Error in IE code import clearance route:", error);
    res.status(500).json({
      message: "Failed to generate import clearance report for the IE code.",
    });
  }
};

// --- OPERATIONAL ANALYTICS ENDPOINT ---
// export const getDateValidityAnalytics = async (req, res) => {
//   const { year } = req.params;
//   const { date, importer } = req.query;

//   const today = date ? new Date(date) : new Date();
//   today.setHours(0, 0, 0, 0); // Normalize

//   let additionalMatch = {};
//   if (importer && importer !== "All Importers") {
//     additionalMatch = { importer: decodeURIComponent(importer) };
//   }

//   try {
//     const pipeline = buildDateValidityPipeline(year, today, additionalMatch);
//     const result = await JobModel.aggregate(pipeline);

//     const analyticsData =
//       result.length > 0
//         ? result[0]
//         : {
//             summary: { totalActiveJobs: 0, totalActiveContainers: 0 },
//             actionRequired: {
//               detention: { onDetention: 0, startsToday: 0, startsSoon3Days: 0 },
//               do_validity: { expired: 0, expiresToday: 0, expiresSoon3Days: 0 },
//               arrivals: { arrivingToday: 0 },
//               rail_out: { overdue: 0, completedToday: 0 },
//             },
//             details: [],
//           };

//     res.status(200).json(analyticsData);
//   } catch (error) {
//     console.error("❌ Error in date validity analytics route:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to generate date validity analytics." });
//   }
// };
