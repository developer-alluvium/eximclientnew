import JobModel from "../models/jobModel.js";
import CthModel from "../models/CthUtil.mjs";
// Utility function to format importer name
function formatImporter(importer) {
  return importer
    .toLowerCase()
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[\.\-\/,\(\)\[\]]/g, "") // Remove unwanted symbols
    .replace(/_+/g, "_"); // Remove multiple underscores
}

//* ADD DELIVERY ADDRESS

//* GET JOB COUNTS
export async function getImporterJobCounts(req, res) {
  try {
    const { year, importerURL } = req.params;
    const formattedImporter = formatImporter(importerURL);

    // Aggregation to count jobs efficiently
    const jobCounts = await JobModel.aggregate([
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
    console.error("Error fetching job counts by importer:", error);
    res.status(500).json({ error: "Error fetching job counts by importer" });
  }
}

//* GET ALL JOBS BY NO.
export async function getJobByNumber(req, res) {
  try {
    const { jobNo, year } = req.params;

    const job = await JobModel.findOne({
      year,
      job_no: jobNo,
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
}

//* Get distinct years from jobs in descending order
export const getYears = async (req, res) => {
  try {
    const pipeline = [
      // Group by year to get distinct years
      {
        $group: {
          _id: "$year",
        },
      },

      // Sort the years in descending order
      {
        $sort: {
          _id: -1,
        },
      },

      // Project to shape the output
      {
        $project: {
          year: "$_id",
          _id: 0,
        },
      },
    ];

    const result = await JobModel.aggregate(pipeline);

    // Extract the sorted years from the result
    const yearsList = result.map((item) => item.year);
    res.status(200).json(yearsList);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching years list.");
  }
};

//* Get distinct exporters for a specific importer
export const getExporters = async (req, res) => {
  try {
    const { importer, year, status } = req.query;
    
    if (!importer) {
      return res.status(400).json({ 
        success: false, 
        message: "Importer parameter is required" 
      });
    }

    // Build match query similar to getContainerDetails approach
    const matchQuery = {
      importer: { $regex: `^${importer}$`, $options: "i" },
      supplier_exporter: { $exists: true, $ne: null, $ne: "" }
    };

    // Add year filter if provided
    if (year && year !== 'all') {
      matchQuery.year = year;
    }

    // Add status filter if provided
    if (status && status !== 'all') {
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

    console.log('Match Query:', JSON.stringify(matchQuery, null, 2));

    // Pipeline to get exporters that work exclusively with the specified importer
    const pipeline = [
      {
        $match: {
          supplier_exporter: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $group: {
          _id: { $trim: { input: "$supplier_exporter" } },
          uniqueImporters: {
            $addToSet: "$importer"
          },
          jobCount: { $sum: 1 },
          latestJobDate: { $max: "$job_date" }
        }
      },
      // This is the correct code
{
  $match: {
    _id: { 
      $exists: true, 
      $ne: null, 
      $ne: "", 
      $not: { $regex: "^\\s*$" } 
    },
    // Apply the regex directly to the array field
    uniqueImporters: { $regex: `^${importer}$`, $options: "i" }
  }
},
      {
        $project: {
          _id: 0,
          exporter: "$_id",
          jobCount: 1,
          latestJobDate: 1,
          uniqueImporters: 1,
          isExclusive: {
            $eq: [{ $size: "$uniqueImporters" }, 1]
          }
        }
      },
      {
        $sort: {
          exporter: 1
        }
      }
    ];

    // Apply additional filters to the pipeline if needed
    if (year && year !== 'all') {
      pipeline.unshift({
        $match: { year: year }
      });
    }

    if (status && status !== 'all') {
      const statusFilter = {};
      const statusLower = status.toLowerCase();
      
      if (statusLower === "pending") {
        statusFilter.$and = [
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
        statusFilter.$and = [
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
        statusFilter.$and = [
          {
            $or: [
              { status: { $regex: "^cancelled$", $options: "i" } },
              { be_no: { $regex: "^cancelled$", $options: "i" } },
            ],
          },
        ];
      }
      
      if (Object.keys(statusFilter).length > 0) {
        pipeline.unshift({
          $match: statusFilter
        });
      }
    }

    const result = await JobModel.aggregate(pipeline);
    
    console.log(`Found ${result.length} exporters for importer: ${importer}`);
    console.log('Sample result:', result.slice(0, 3)); // Log first 3 results for debugging
    
    // Extract just the exporter names for the dropdown
    const exporters = result.map(item => item.exporter);

    res.status(200).json(exporters);
  } catch (error) {
    console.error('Error fetching exporters:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch exporters',
      error: error.message 
    });
  }
};

//* Get exporters that work exclusively with only one importer (for DSR filtering)
export const getExclusiveExporters = async (req, res) => {
  try {
    const { importer, year, status, exclusive = 'true' } = req.query;
    
    if (!importer) {
      return res.status(400).json({ 
        success: false, 
        message: "Importer parameter is required" 
      });
    }

    // Base pipeline to find exporters
    const pipeline = [
      {
        $match: {
          supplier_exporter: { $exists: true, $ne: null, $ne: "" }
        }
      }
    ];

    // Add year filter if provided
    if (year && year !== 'all') {
      pipeline[0].$match.year = year;
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      const statusLower = status.toLowerCase();
      if (statusLower === "pending") {
        pipeline[0].$match.$and = [
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
        pipeline[0].$match.$and = [
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
        pipeline[0].$match.$and = [
          {
            $or: [
              { status: { $regex: "^cancelled$", $options: "i" } },
              { be_no: { $regex: "^cancelled$", $options: "i" } },
            ],
          },
        ];
      }
    }

    // Add the core pipeline stages
    pipeline.push(
      {
        $group: {
          _id: { $trim: { input: "$supplier_exporter" } },
          uniqueImporters: {
            $addToSet: "$importer"
          },
          jobCount: { $sum: 1 },
          latestJobDate: { $max: "$job_date" }
        }
      }
    );

    // Different filtering based on exclusive parameter
    if (exclusive === 'true') {
      // Truly exclusive exporters (work with only one importer)
      pipeline.push({
        $match: {
          _id: { 
            $exists: true, 
            $ne: null, 
            $ne: "", 
            $not: { $regex: "^\\s*$" } 
          },
          uniqueImporters: { $size: 1 }, // Exactly one importer
          $expr: {
            $anyElementTrue: {
              $map: {
                input: "$uniqueImporters",
                as: "imp",
                in: { $regexMatch: { input: "$$imp", regex: `^${importer}$`, options: "i" } }
              }
            }
          }
        }
      });
    } else {
      // All exporters that work with the specified importer (may also work with others)
      pipeline.push({
        $match: {
          _id: { 
            $exists: true, 
            $ne: null, 
            $ne: "", 
            $not: { $regex: "^\\s*$" } 
          },
          $expr: {
            $anyElementTrue: {
              $map: {
                input: "$uniqueImporters",
                as: "imp",
                in: { $regexMatch: { input: "$$imp", regex: `^${importer}$`, options: "i" } }
              }
            }
          }
        }
      });
    }

    pipeline.push(
      {
        $project: {
          _id: 0,
          supplier_exporter: "$_id",
          jobCount: 1,
          latestJobDate: 1,
          uniqueImporters: 1,
          importerCount: { $size: "$uniqueImporters" },
          isExclusive: { $eq: [{ $size: "$uniqueImporters" }, 1] }
        }
      },
      {
        $sort: {
          supplier_exporter: 1
        }
      }
    );

    const result = await JobModel.aggregate(pipeline);
    
    console.log(`Found ${result.length} ${exclusive === 'true' ? 'exclusive' : 'all'} exporters for importer: ${importer}`);
    console.log('Sample results:', result.slice(0, 3));
    
    // Extract just the exporter names for the dropdown
    const exporters = result.map(item => item.supplier_exporter);

    res.status(200).json({
      success: true,
      data: exporters,
      total_count: exporters.length,
      filter_type: exclusive === 'true' ? 'exclusive' : 'all',
      message: `Found ${exporters.length} ${exclusive === 'true' ? 'exclusive' : ''} exporter(s) for ${importer}`,
      debug_info: result.slice(0, 5) // Include detailed info for first 5 results
    });
  } catch (error) {
    console.error('Error fetching exclusive exporters:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch exclusive exporters',
      error: error.message 
    });
  }
};

//* Get distinct HS codes for a specific importer
export const getHsCodes = async (req, res) => {
  try {
    const { importer, year, status } = req.query;
    
    if (!importer) {
      return res.status(400).json({ 
        success: false, 
        message: "Importer parameter is required" 
      });
    }

    // Build match query
    const matchQuery = {
      importer: { $regex: `^${importer}$`, $options: "i" }
    };

    // Add year filter if provided
    if (year && year !== 'all') {
      matchQuery.year = year;
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      const statusLower = status.toLowerCase();
      if (statusLower === "pending") {
        matchQuery.$and = [
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
          {
            $and: [
              { bill_date: { $in: [null, ""] } },
              { status: { $not: { $regex: "^completed$", $options: "i" } } },
            ],
          },
        ];
      } else if (statusLower === "completed") {
        matchQuery.$and = [
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

    // Get distinct HS codes using aggregation
    const hsCodes = await JobModel.distinct('cth_no', matchQuery);
    
    // Filter out null/empty values and remove duplicates
    const filteredHsCodes = hsCodes.filter(hsCode => 
      hsCode && hsCode.trim() !== ''
    );

    res.status(200).json(filteredHsCodes);
  } catch (error) {
    console.error('Error fetching HS codes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch HS codes',
      error: error.message 
    });
  }
};

//* Get distinct suppliers for a specific importer  
export const getSuppliers = async (req, res) => {
  try {
    const { importer, year, status } = req.query;
    
    if (!importer) {
      return res.status(400).json({ 
        success: false, 
        message: "Importer parameter is required" 
      });
    }

    // Build match query
    const matchQuery = {
      importer: { $regex: `^${importer}$`, $options: "i" }
    };

    // Add year filter if provided
    if (year && year !== 'all') {
      matchQuery.year = year;
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      const statusLower = status.toLowerCase();
      if (statusLower === "pending") {
        matchQuery.$and = [
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
          {
            $and: [
              { bill_date: { $in: [null, ""] } },
              { status: { $not: { $regex: "^completed$", $options: "i" } } },
            ],
          },
        ];
      } else if (statusLower === "completed") {
        matchQuery.$and = [
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

    // Get distinct suppliers using aggregation
    const suppliers = await JobModel.distinct('supplier_exporter', matchQuery);
    
    // Filter out null/empty values and remove duplicates
    const filteredSuppliers = suppliers.filter(supplier => 
      supplier && supplier.trim() !== ''
    );

    res.status(200).json(filteredSuppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch suppliers',
      error: error.message 
    });
  }
};

//*get the job duty

export const getduty = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get job number from params using job_no as parameter name
    const jobNo = req.params.job_no;
    // console.log("Received job number:", jobNo); // Debug log

    if (!jobNo) {
      return res.status(400).json({ message: "Job number is required" });
    }

    // Find the job by job_no
    const job = await JobModel.findOne({
      job_no: jobNo,
    }).select("job_no total_duty job_net_weight net_weight net_weight_calculator");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: `Job not found with job number: ${jobNo}`,
      });
    }

    // Return the job data with total_duty
    return res.status(200).json({
      success: true,
      data: {
        job_no: job.job_no,
        total_duty: job.total_duty,
        job_net_weight: job.job_net_weight || 0,
        net_weight: job.net_weight || 0,
        per_kg_cost: job.net_weight_calculator?.per_kg_cost || "0.00",
      },
    });
  } catch (error) {
    console.error("Error fetching total duty:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch total duty",
      error: error.message,
    });
  }
};

export const lookup = async (req, res) => {
  try {
    const { hsCode, jobNo, year } = req.params;
    const userIeCodes = req.query.ie_code_nos; // Changed to support multiple IE codes

    console.log("Query parameters:", req.query);
    console.log("User IE Codes:", userIeCodes);

    // Parse comma-separated IE codes if provided
    let ieCodeArray = [];
    if (userIeCodes) {
      ieCodeArray = userIeCodes.split(',').map(code => code.trim()).filter(code => code);
    }

    if (ieCodeArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IE codes are required",
      });
    }

    // Find the job and check if its IE code is in the allowed list
    const job = await JobModel.findOne({
      job_no: jobNo,
      year: year,
      ie_code_no: { $in: ieCodeArray } // Use $in to match any of the provided IE codes
    }).select(
      "cth_no total_duty total_inv_value assbl_value assessable_ammount exrate clearanceValue unit_price awb_bl_date job_net_weight loading_port shipping_line_airline port_of_reporting net_weight_calculator ie_code_no hs_code"
    );

    console.log("Database IE Code:", job?.ie_code_no);
    console.log("Allowed IE Codes:", ieCodeArray);

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
export const updatePerKgCost = async (req, res) => {
  try {
    const { jobNo, perKgCost, ie_code_no } = req.body;
    const year = req.query.year; // Get year from query params
    const ieCode = ie_code_no || req.headers['x-ie-code'] || req.query.ie_code_no;

    if (!jobNo || !year) {
      return res.status(400).json({
        success: false,
        message: "Job number and year are required",
      });
    }

    // Build the query to include IE code and year filtering
    const query = { 
      job_no: jobNo,
      year: year  // Add year to query
    };
    if (ieCode) {
      query.ie_code_no = ieCode;
    }

    const updatedJob = await JobModel.findOneAndUpdate(
      query,
      {
        $set: {
          'net_weight_calculator.per_kg_cost': perKgCost,
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
        message: ieCode 
          ? "Job not found or you are not authorized to update this job" 
          : "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { per_kg_cost: updatedJob.net_weight_calculator?.per_kg_cost || "0.00" },
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
export const storeCalculatorData = async (req, res) => {
  try {
    const { jobNo } = req.params;
    const { year } = req.query;
    const ieCode = req.body.ie_code_no || req.query.ie_code_no;
    
    if (!jobNo || !year) {
      return res.status(400).json({
        success: false,
        message: "Job number and year are required",
      });
    }
    
    // Build the query to include IE code filtering
    const query = { 
      job_no: jobNo,
      year: year
    };
    
    if (ieCode) {
      query.ie_code_no = ieCode;
    }
    
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
      shipping,
      custom_clearance_charges: customclearancecharges,
      customclearancecharges,
      detention,
      cfs,
      transport,
      Labour,
      miscellaneous,
      weight,
      total_cost: totalCost,
      per_kg_cost: req.body.perKgCost || "0.00"
    };
    
    // Add custom fields if they exist
    if (custom_fields && Array.isArray(custom_fields)) {
      calculatorData.custom_fields = custom_fields;
    }

    // Use findOneAndUpdate to update calculator data
    const updatedJob = await JobModel.findOneAndUpdate(
      query,
      {
        $set: {
          'net_weight_calculator': calculatorData
        }
      },
      {
        new: true,
        runValidators: true,
      }
    );
    
    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message: ieCode 
          ? "Job not found or you are not authorized to update this job"
          : "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Calculator data stored successfully",
      data: updatedJob.net_weight_calculator
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


export async function getJobNumbersByMultipleIECodes(req, res) {
  try {
    const { ieCodes, year, search } = req.query; // All from query parameters

    console.log('Multiple IE Codes Request:', { ieCodes, year, search }); // Debug log

    if (!ieCodes) {
      return res.status(400).json({
        success: false,
        message: "ieCodes parameter is required in query string",
      });
    }

    // Parse comma-separated IE codes
    const ieCodeArray = ieCodes.split(',').map(code => code.trim()).filter(code => code);
    
    console.log('Parsed IE Codes:', ieCodeArray); // Debug log
    
    if (ieCodeArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid IE codes are required",
      });
    }

    // Build query object
    const query = { 
      ie_code_no: { $in: ieCodeArray }
    };
    
    // Add year filter if provided
    if (year) {
      query.year = year;
    }

    // Add search filter for job number or exporter name if provided
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { job_no: searchRegex },
        { supplier_exporter: searchRegex }
      ];
    }

    console.log('MongoDB Query:', JSON.stringify(query, null, 2)); // Debug log

    // Find all jobs with the given ie_code_no array
    const jobs = await JobModel.find(
      query,
      { 
        job_no: 1, 
        year: 1, 
        job_date: 1, 
        supplier_exporter: 1, 
        ie_code_no: 1, 
        importer: 1, 
        _id: 0 
      }
    ).sort({ year: -1, job_no: 1 });

    console.log(`Found ${jobs.length} jobs`); // Debug log

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: search 
          ? `No jobs found for IE codes: ${ieCodeArray.join(', ')} matching search: ${search}`
          : `No jobs found for IE codes: ${ieCodeArray.join(', ')}`,
      });
    }

    // Format response
    const jobNumbers = jobs.map(job => ({
      job_no: job.job_no,
      year: job.year,
      job_date: job.job_date,
      supplier_exporter: job.supplier_exporter || "N/A",
      ie_code_no: job.ie_code_no,
      importer: job.importer || "N/A"
    }));

    res.status(200).json({
      success: true,
      message: `Found ${jobs.length} job(s) for IE codes: ${ieCodeArray.join(', ')}`,
      data: jobNumbers,
      total_count: jobs.length,
      ie_codes_searched: ieCodeArray
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


//* GET ALL JOB NUMBERS BY IE_CODE_NO
export async function getJobNumbersByIECode(req, res) {
  try {
    const { ie_code_no } = req.params;
    const { year, search } = req.query; // Get year and search from query parameters

    if (!ie_code_no) {
      return res.status(400).json({
        success: false,
        message: "IE code number is required",
      });
    }

    // Build query object
    const query = { ie_code_no: ie_code_no };
    
    // Add year filter if provided
    if (year) {
      query.year = year;
    }

    // Add search filter for job number or exporter name if provided
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { job_no: searchRegex },
        { supplier_exporter: searchRegex }
      ];
    }

    // Find all jobs with the given ie_code_no and select job_no, year, job_date, and supplier_exporter
    const jobs = await JobModel.find(
      query,
      { job_no: 1, year: 1, job_date: 1, supplier_exporter: 1, _id: 0 }
    ).sort({ year: -1, job_no: 1 }); // Sort by year desc, job_no asc

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: search 
          ? `No jobs found for IE code: ${ie_code_no} matching search: ${search}`
          : `No jobs found for IE code: ${ie_code_no}`,
      });
    }

    // Format response
    const jobNumbers = jobs.map(job => ({
      job_no: job.job_no,
      year: job.year,
      job_date: job.job_date,
      supplier_exporter: job.supplier_exporter || "N/A"
    }));

    res.status(200).json({
      success: true,
      message: `Found ${jobs.length} job(s) for IE code: ${ie_code_no}`,
      data: jobNumbers,
      total_count: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching job numbers by IE code:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching job numbers",
      error: error.message,
    });
  }
}

// API to update duty and weight data with auto-calculation of per kg cost
export const updateJobDutyAndWeight = async (req, res) => {
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
      year: year
    };
    
    if (ie_code_no) {
      query.ie_code_no = ie_code_no;
    }

    // Update the job with new duty and weight data
    // The pre-save middleware will automatically calculate per_kg_cost
    const updatedJob = await JobModel.findOneAndUpdate(
      query,
      {
        $set: {
          ...(total_duty !== undefined && { total_duty: total_duty.toString() }),
          ...(job_net_weight !== undefined && { job_net_weight: job_net_weight.toString() })
        }
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
      message: "Job updated successfully. Per kg cost calculated automatically.",
      data: {
        job_no: updatedJob.job_no,
        total_duty: updatedJob.total_duty,
        job_net_weight: updatedJob.job_net_weight,
        per_kg_cost: updatedJob.net_weight_calculator?.per_kg_cost || "0.00"
      }
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

// Shipping Container Data Analysis API
export const getContainerSummary = async (req, res) => {
  try {
    const { year, groupBy = 'status' } = req.query;
    const userIeCode = req.query.ie_code_no || req.headers['x-ie-code'];

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year parameter is required (25-26 or 24-25)",
      });
    }

    if (!userIeCode) {
      return res.status(400).json({
        success: false,
        message: "IE code is required for authorization",
      });
    }

    // Validate groupBy parameter
    const validGroupByOptions = ['status', 'size', 'month', 'port'];
    if (!validGroupByOptions.includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid groupBy parameter. Valid options: status, size, month, port",
      });
    }

    // Build match query - filter records with empty/undefined bill_no
    const matchQuery = {
      year: year,
      ie_code_no: userIeCode,
      $or: [
        { bill_no: { $exists: false } },
        { bill_no: null },
        { bill_no: "" }
      ]
    };

    // Base pipeline - enhanced to support different groupBy options
    const pipeline = [
      {
        $match: matchQuery
      },
      {
        $unwind: {
          path: "$container_nos",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          "container_nos.size": { $in: ["20", "40"] }
        }
      }
    ];

    // Add additional fields for grouping if needed
    if (groupBy === 'month' || groupBy === 'port') {
      pipeline.push({
        $addFields: {
          "container_nos.arrival_month": {
            $cond: [
              { $and: [
                { $ne: ["$container_nos.arrival_date", null] },
                { $ne: ["$container_nos.arrival_date", ""] }
              ]},
              { 
                $dateToString: { 
                  format: "%Y-%m", 
                  date: { 
                    $dateFromString: { 
                      dateString: "$container_nos.arrival_date",
                      onError: null 
                    } 
                  } 
                } 
              },
              "Not Arrived"
            ]
          }
        }
      });
    }

    // Group containers data - always maintain the status/size structure for frontend compatibility
    pipeline.push({
      $group: {
        _id: null,
        containers: {
          $push: {
            size: "$container_nos.size",
            arrival_date: "$container_nos.arrival_date",
            delivery_date: "$container_nos.delivery_date",
            emptyContainerOffLoadDate: "$container_nos.emptyContainerOffLoadDate",
            container_rail_out_date: "$container_nos.container_rail_out_date",
            delivery_planning: "$container_nos.delivery_planning",
            // Add additional fields for potential future grouping features
            port_of_reporting: "$port_of_reporting",
            arrival_month: "$container_nos.arrival_month"
          }
        }
      }
    });

    const result = await JobModel.aggregate(pipeline);
    
    // Initialize counters
    let count20Arrived = 0;
    let count40Arrived = 0;
    let count20Transit = 0;
    let count40Transit = 0;

    // Process container data if results exist
    if (result.length > 0 && result[0].containers) {
      result[0].containers.forEach((container, index) => {
        // Business Logic:
        // - Exclude containers that are fully completed (have emptyContainerOffLoadDate)
        // - "Arrived" = containers that have arrival_date but no emptyContainerOffLoadDate
        // - "Transit" = containers that have no arrival_date and no emptyContainerOffLoadDate
        
        const isFullyCompleted = container.emptyContainerOffLoadDate && 
          container.emptyContainerOffLoadDate.trim() !== "" && 
          container.emptyContainerOffLoadDate !== null;
          
        const hasArrivedAtPort = container.arrival_date && 
          container.arrival_date.trim() !== "" && 
          container.arrival_date !== null;

        // Skip fully completed containers
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

    // Prepare response
    const summary = {
      "20_arrived": count20Arrived,
      "40_arrived": count40Arrived,
      "20_transit": count20Transit,
      "40_transit": count40Transit,
      "total_arrived": totalArrived,
      "total_transit": totalTransit,
      "grand_total": grandTotal
    };

    return res.status(200).json({
      success: true,
      summary: summary,
      year_filter: year,
      group_by: groupBy,
      last_updated: new Date().toISOString(),
      message: `Container summary for year ${year} grouped by ${groupBy} generated successfully`
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

// Container Details API - Get detailed list of containers by status
export const getContainerDetails = async (req, res) => {
  try {
    const { year, status, size } = req.query;
    const userIeCode = req.query.ie_code_no || req.headers['x-ie-code'];

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year parameter is required (25-26 or 24-25)",
      });
    }

    if (!userIeCode) {
      return res.status(400).json({
        success: false,
        message: "IE code is required for authorization",
      });
    }

    if (!status || !['arrived', 'transit'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status parameter is required (arrived or transit)",
      });
    }

    if (size && !['20', '40'].includes(size)) {
      return res.status(400).json({
        success: false,
        message: "Size parameter must be either '20' or '40'",
      });
    }

    // Build match query - filter records with empty/undefined bill_no
    const matchQuery = {
      year: year,
      ie_code_no: userIeCode,
      $or: [
        { bill_no: { $exists: false } },
        { bill_no: null },
        { bill_no: "" }
      ]
    };

    // Use aggregation pipeline to get detailed container information
    const pipeline = [
      {
        $match: matchQuery
      },
      {
        $unwind: {
          path: "$container_nos",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          "container_nos.size": { $in: size ? [size] : ["20", "40"] }
        }
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
          container: {
            container_number: "$container_nos.container_number",
            size: "$container_nos.size",
            arrival_date: "$container_nos.arrival_date",
            delivery_date: "$container_nos.delivery_date",
            emptyContainerOffLoadDate: "$container_nos.emptyContainerOffLoadDate",
            container_rail_out_date: "$container_nos.container_rail_out_date",
            detention_from: "$container_nos.detention_from",
            transporter: "$container_nos.transporter",
            vehicle_no: "$container_nos.vehicle_no",
            delivery_address: "$container_nos.delivery_address",
            delivery_planning: "$container_nos.delivery_planning",
            net_weight_as_per_PL_document: "$container_nos.net_weight_as_per_PL_document"
          }
        }
      }
    ];

    const result = await JobModel.aggregate(pipeline);
    
    // Filter containers based on status and business logic
    const filteredContainers = result.filter(item => {
      const container = item.container;
      
      // Check if container is fully completed
      const isFullyCompleted = container.emptyContainerOffLoadDate && 
        container.emptyContainerOffLoadDate.trim() !== "" && 
        container.emptyContainerOffLoadDate !== null;
        
      // Skip fully completed containers
      if (isFullyCompleted) {
        return false;
      }
      
      const hasArrivedAtPort = container.arrival_date && 
        container.arrival_date.trim() !== "" && 
        container.arrival_date !== null;

      // Filter based on requested status
      if (status === 'arrived') {
        return hasArrivedAtPort;
      } else if (status === 'transit') {
        return !hasArrivedAtPort;
      }
      
      return false;
    });

    // Format the response with additional computed fields
    const formattedContainers = filteredContainers.map(item => ({
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
      net_weight_as_per_PL_document: item.container.net_weight_as_per_PL_document,
      // Add computed status for clarity
      container_status: status,
      // Calculate days since arrival (for arrived containers)
      days_since_arrival: item.container.arrival_date ? 
        Math.floor((new Date() - new Date(item.container.arrival_date)) / (1000 * 60 * 60 * 24)) : null
    }));

    // Sort containers: by arrival date for arrived, by job_no for transit
    if (status === 'arrived') {
      formattedContainers.sort((a, b) => new Date(b.arrival_date) - new Date(a.arrival_date));
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
        size: size || 'all',
        ie_code: userIeCode
      },
      last_updated: new Date().toISOString(),
      message: `Found ${formattedContainers.length} container(s) with status '${status}' for year ${year}`
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