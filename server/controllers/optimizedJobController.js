import JobModel from "../models/jobModel.js";

// Optimized field selection for job list - only essential fields
const essentialFields = `
  job_no year ie_code_no importer custom_house awb_bl_no origin_country supplier_exporter
  vessel_berthing gateway_igm_date discharge_date be_no be_date loading_port
  port_of_reporting type_of_b_e consignment_type shipping_line_airline 
  job_net_weight gross_weight per_kg_cost description status detailed_status
  net_weight_calculator.duty net_weight_calculator.shipping net_weight_calculator.custom_clearance_charges
  net_weight_calculator.detention net_weight_calculator.cfs net_weight_calculator.transport
  net_weight_calculator.Labour net_weight_calculator.total_cost
  container_nos.container_no payment_method
`;

// Helper function to build MongoDB query
const buildOptimizedQuery = (year, status, ieCode) => {
  const query = { year, ie_code_no: ieCode };
  
  const statusLower = status?.toLowerCase();
  
  if (statusLower === 'pending') {
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
  } else if (statusLower === 'completed') {
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
  } else if (statusLower === 'cancelled') {
    query.$and = [
      {
        $or: [
          { status: { $regex: "^cancelled$", $options: "i" } },
          { be_no: { $regex: "^cancelled$", $options: "i" } },
        ],
      },
    ];
  }
  
  return query;
};

// Optimized controller to get jobs by IE code with proper filtering
export const getJobsByIECode = async (req, res) => {
  try {
    const { year, ieCode, status: statusParam } = req.params;
    const { 
      page = 1, 
      limit = 50,
      search = ''
    } = req.query;
    
    // Use status from route params, fallback to 'all'
    const status = statusParam || 'all';

    console.log('getJobsByIECode called with:', { year, ieCode, status, page, search });

    if (!ieCode || !year) {
      return res.status(400).json({
        success: false,
        message: 'IE code and year are required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let aggregationPipeline = [];

    // Build base match query with simplified status logic
    const baseQuery = { year };
    
    // Handle multiple IE codes
    if (ieCode.includes(',')) {
      baseQuery.ie_code_no = { $in: ieCode.split(',') };
    } else {
      baseQuery.ie_code_no = ieCode;
    }
    
    if (status === 'all') {
      // For 'all' status, exclude only explicitly cancelled jobs
      baseQuery.$and = [
        {
          $and: [
            { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
            { status: { $not: { $regex: "^cancelled$", $options: "i" } } }
          ]
        }
      ];
    } else {
      // Apply specific status filtering logic - simplified approach
      const statusLower = status.toLowerCase();
      
      if (statusLower === 'pending') {
        baseQuery.status = { $regex: "^pending$", $options: "i" };
        baseQuery.be_no = { $not: { $regex: "^cancelled$", $options: "i" } };
      } else if (statusLower === 'completed') {
        baseQuery.status = { $regex: "^completed$", $options: "i" };
        baseQuery.be_no = { $not: { $regex: "^cancelled$", $options: "i" } };
      } else if (statusLower === 'cancelled') {
        baseQuery.$or = [
          { status: { $regex: "^cancelled$", $options: "i" } },
          { be_no: { $regex: "^cancelled$", $options: "i" } }
        ];
      }
    }

    aggregationPipeline.push({ $match: baseQuery });

    // Add search functionality if provided
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      aggregationPipeline.push({
        $match: {
          $or: [
            { job_no: searchRegex },
            { supplier_exporter: searchRegex },
            { importer: searchRegex },
            { custom_house: searchRegex },
            { awb_bl_no: searchRegex },
            { origin_country: searchRegex },
            { description: searchRegex }
          ]
        }
      });
    }

    // Project only essential fields
    aggregationPipeline.push({
      $project: {
        job_no: 1,
        year: 1,
        ie_code_no: 1,
        importer: 1,
        custom_house: 1,
        awb_bl_no: 1,
        origin_country: 1,
        supplier_exporter: 1,
        vessel_berthing: 1,
        gateway_igm_date: 1,
        discharge_date: 1,
        be_no: 1,
        be_date: 1,
        loading_port: 1,
        port_of_reporting: 1,
        type_of_b_e: 1,
        consignment_type: 1,
        shipping_line_airline: 1,
        job_net_weight: 1,
        gross_weight: 1,
        per_kg_cost: 1,
        description: 1,
        status: 1,
        detailed_status: 1,
        payment_method: 1,
        'net_weight_calculator.duty': 1,
        'net_weight_calculator.shipping': 1,
        'net_weight_calculator.custom_clearance_charges': 1,
        'net_weight_calculator.detention': 1,
        'net_weight_calculator.cfs': 1,
        'net_weight_calculator.transport': 1,
        'net_weight_calculator.Labour': 1,
        'net_weight_calculator.total_cost': 1,
        // Only get container numbers, not full container objects
        'container_nos.container_no': 1
      }
    });

    // Get total count for pagination
    const countPipeline = [...aggregationPipeline, { $count: 'total' }];
    
    // Add pagination
    aggregationPipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    // Execute both queries in parallel
    const [jobsResult, countResult] = await Promise.all([
      JobModel.aggregate(aggregationPipeline),
      JobModel.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: jobsResult,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching jobs by IE code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job data',
      error: error.message
    });
  }
};

// Optimized multi-status fetch (for 'all' status)
export const getJobsMultiStatus = async (req, res) => {
  try {
    const { year, ieCode } = req.params;
    const { 
      page = 1, 
      limit = 50,
      search = ''
    } = req.query;

    if (!ieCode || !year) {
      return res.status(400).json({
        success: false,
        message: 'IE code and year are required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Single aggregation pipeline for all statuses
    let aggregationPipeline = [
      {
        $match: {
          year,
          ie_code_no: ieCode,
          // Exclude cancelled jobs
          be_no: { $not: { $regex: "^cancelled$", $options: "i" } },
          status: { $not: { $regex: "^cancelled$", $options: "i" } }
        }
      }
    ];

    // Add search functionality if provided
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      aggregationPipeline.push({
        $match: {
          $or: [
            { job_no: searchRegex },
            { supplier_exporter: searchRegex },
            { importer: searchRegex },
            { custom_house: searchRegex },
            { awb_bl_no: searchRegex },
            { origin_country: searchRegex },
            { description: searchRegex }
          ]
        }
      });
    }

    // Project only essential fields
    aggregationPipeline.push({
      $project: {
        job_no: 1,
        year: 1,
        ie_code_no: 1,
        importer: 1,
        custom_house: 1,
        awb_bl_no: 1,
        origin_country: 1,
        supplier_exporter: 1,
        vessel_berthing: 1,
        gateway_igm_date: 1,
        discharge_date: 1,
        be_no: 1,
        be_date: 1,
        loading_port: 1,
        port_of_reporting: 1,
        type_of_b_e: 1,
        consignment_type: 1,
        shipping_line_airline: 1,
        job_net_weight: 1,
        gross_weight: 1,
        per_kg_cost: 1,
        description: 1,
        status: 1,
        detailed_status: 1,
        payment_method: 1,
        'net_weight_calculator.duty': 1,
        'net_weight_calculator.shipping': 1,
        'net_weight_calculator.custom_clearance_charges': 1,
        'net_weight_calculator.detention': 1,
        'net_weight_calculator.cfs': 1,
        'net_weight_calculator.transport': 1,
        'net_weight_calculator.Labour': 1,
        'net_weight_calculator.total_cost': 1,
        'container_nos.container_no': 1
      }
    });

    // Get total count for pagination
    const countPipeline = [...aggregationPipeline, { $count: 'total' }];
    
    // Add pagination
    aggregationPipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    // Execute both queries in parallel
    const [jobsResult, countResult] = await Promise.all([
      JobModel.aggregate(aggregationPipeline),
      JobModel.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: jobsResult,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching multi-status jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job data',
      error: error.message
    });
  }
};
