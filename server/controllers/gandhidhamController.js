import mongoose from "mongoose";
import JobModel from "../models/jobModel.js";

// Connect to Gandhidham DB using a separate mongoose connection
const gandhidhamConnection = mongoose.createConnection(process.env.Gandhidham_URI, {
  useUnifiedTopology: true,
});

console.log(gandhidhamConnection);  
const GandhidhamJobModel = gandhidhamConnection.model("Job", JobModel.schema);

export async function getJobsByStatusAndImporterGandhidham(req, res) {
  try {
    const { year, status, detailedStatus, importer } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const search = req.query.search || "";
    const exporter = req.query.exporter || "";

    // Build query
    const query = {
      year,
      status,
      detailed_status: detailedStatus !== "all" ? detailedStatus : { $exists: true },
      importer: importer !== "all" ? importer : { $exists: true },
    };
    if (search) {
      query.$or = [
        { job_no: { $regex: search, $options: "i" } },
        { awb_bl_no: { $regex: search, $options: "i" } },
        { importer: { $regex: search, $options: "i" } },
      ];
    }
    if (exporter && exporter !== "all") {
      query.exporter = exporter;
    }

    const jobs = await GandhidhamJobModel.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await GandhidhamJobModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({ data: jobs, total, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error fetching Gandhidham jobs:", error);
    res.status(500).json({ error: "Error fetching Gandhidham jobs" });
  }
}
