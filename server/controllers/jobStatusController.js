import JobModel from "../models/jobModel.js";

// Status Rank Configuration
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

// Helper to safely parse dates
const parseDate = (dateStr) => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Field selection logic
const defaultFields = `
  job_no year importer custom_house awb_bl_no container_nos vessel_berthing transporter job_net_weight net_weight origin_country weight_shortage checklist is_checklist_aprroved_date is_checklist_clicked invoice_number invoice_date inv_currency total_inv_value
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

// Generate search query
const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escaping special regex characters
};

const buildSearchQuery = (search) => ({
  $or: [
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

export async function updateJob(req, res) {
  try {
    const jobId = req.params.id;
    const updateData = req.body;
    
    const job = await JobModel.findById(jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Update the job with the new data
    const updatedJob = await JobModel.findByIdAndUpdate(
      jobId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedJob);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

// API endpoint for updating container transporter
export async function updateContainerTransporter(req, res) {
  try {
    const { id } = req.params;
    const { containerIndex, transporter } = req.body;
    
    // Validate inputs
    if (containerIndex === undefined) {
      return res.status(400).json({ message: "Container index is required" });
    }
    
    // Find the job first
    const job = await JobModel.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    // Check if the container exists
    if (!job.containerNos || !job.containerNos[containerIndex]) {
      return res.status(404).json({ message: "Container not found" });
    }
    
    // Update the specific container's transporter
    job.containerNos[containerIndex].transporter = transporter;
    
    // Save the updated job
    await job.save();
    
    res.status(200).json(job);
  } catch (error) {
    console.error("Error updating container:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
// Controller function to get jobs by multiple IE codes
export async function getJobsByMultipleIECodes(req, res) {
  try {
    const { year, status, detailedStatus } = req.params;
    const { page = 1, limit = 100, search = "", exporter = "", ieCodes = "", importers = "" } = req.query;
    const skip = (page - 1) * limit;

    if (!ieCodes) {
      return res.status(400).json({ message: "IE Codes are required" });
    }

    // Split the IE codes string into an array
    const ieCodeArray = ieCodes.split(',').map(code => code.trim());
    
    // Split importers string into array if provided
    const importerArray = importers ? importers.split(';').map(imp => imp.trim()) : [];
    
    console.log('Received IE codes:', ieCodeArray);

    // Base query with year filter and IE codes
    const query = {
      year,
      ie_code_no: { $in: ieCodeArray }
    };

    // Add importer filter if provided
    if (importerArray.length > 0) {
          query.importer = { $in: importerArray.map(imp => new RegExp(`^${escapeRegex(imp)}$`, 'i')) };

    }
    
    // Log the query for debugging
    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('Importers:', importerArray);

    // Add status conditions similar to getJobsByStatusAndImporter
    const statusLower = status.toLowerCase();
    
    if (statusLower === "all") {
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
    }

    // Handle detailed status and search similar to original function
    if (detailedStatus !== "all") {
      query.detailed_status = statusMapping[detailedStatus] || detailedStatus;
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push(buildSearchQuery(search));
    }

    if (exporter && exporter !== "all") {
      query.supplier_exporter = {
        $regex: `^${escapeRegex(exporter)}$`,
        $options: "i",
      };
    }

    const jobs = await JobModel.find(query).select(
      getSelectedFields(detailedStatus === "all" ? "all" : detailedStatus)
    );

    // Apply the same ranking and sorting logic as the original function
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
      message: "Jobs fetched successfully",
      data: paginatedJobs,
      total: allJobs.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(allJobs.length / limit),
    });

  } catch (error) {
    console.error("Error fetching jobs by IE codes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Controller function to get jobs by status, detailed status and importer
export async function getJobsByStatusAndImporter(req, res) {
  try {
    const { year, status, detailedStatus, importer } = req.params;
    const { page = 1, limit = 100, search = "", exporter = "" } = req.query;
    const skip = (page - 1) * limit;

   
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

    // Fetch jobs from the database
    const jobs = await JobModel.find(query).select(
      getSelectedFields(detailedStatus === "all" ? "all" : detailedStatus)
    );

    // console.log('Query executed:', JSON.stringify(query, null, 2));
    // console.log('Raw jobs found:', jobs.length);
    // console.log('Sample job (first 2):');
    // jobs.slice(0, 2).forEach((job, index) => {
    //   console.log(`  Job ${index + 1}:`, {
    //     job_no: job.job_no,
    //     importer: job.importer,
    //     supplier_exporter: job.supplier_exporter,
    //     ie_code_no: job.ie_code_no,
    //     year: job.year,
    //     status: job.status,
    //     detailed_status: job.detailed_status
    //   });
    // });

    // Group jobs into ranked and unranked
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

    // Paginate results
    const paginatedJobs = allJobs.slice(skip, skip + parseInt(limit));

    // console.log('Final results:');
    // console.log('  - Total jobs after processing:', allJobs.length);
    // console.log('  - Paginated jobs:', paginatedJobs.length);
    // console.log('  - Current page:', parseInt(page));
    // console.log('========================================');

    res.json({
      message: "Jobs fetched successfully",
      data: paginatedJobs,
      total: allJobs.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(allJobs.length / limit),
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}





