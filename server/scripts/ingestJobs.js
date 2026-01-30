import "../fix-dns.js";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import JobModel from "../models/jobModel.js";
import client from "../config/weaviateClient.js";

dotenv.config();

const formatJobToText = (job) => {
    const basicInfo = `Job Number ${job.job_no} (Year: ${job.year}) is a status '${job.status}' shipment for Importer ${job.importer}.`;

    let logistics = `It involves ${job.no_of_pkgs || '0'} packages with gross weight ${job.gross_weight || '0'} ${job.unit || ''}. `;
    if (job.vessel_flight) logistics += `Vessel: ${job.vessel_flight}. `;
    if (job.loading_port && job.port_of_reporting) logistics += `Route: ${job.loading_port} to ${job.port_of_reporting}. `;
    if (job.origin_country) logistics += `Origin: ${job.origin_country}. `;

    let containerInfo = "";
    if (job.container_nos && job.container_nos.length > 0) {
        containerInfo = `Containers: ${job.container_nos.map(c => c.container_number).join(", ")}. `;
    }

    let financials = "";
    if (job.total_duty) financials += `Total Duty: ${job.total_duty}. `;

    return `${basicInfo} ${logistics} ${containerInfo} ${financials}`.replace(/\s+/g, " ").trim();
};

const createSchema = async () => {
    console.log("[Ingest] Checking schema...");

    try {
        // Check if class exists
        const schema = await client.schema.getter().do();
        const exists = schema.classes?.some(c => c.class === "JobContext");

        if (exists) {
            console.log("[Ingest] Deleting existing class...");
            await client.schema.classDeleter().withClassName("JobContext").do();
        }
    } catch (e) {
        console.log("[Ingest] No existing schema found");
    }

    console.log("[Ingest] Creating JobContext class...");
    await client.schema.classCreator().withClass({
        class: "JobContext",
        vectorizer: "none", // No vectorizer - we'll use BM25 search
        properties: [
            { name: "text", dataType: ["text"] },
            { name: "job_no", dataType: ["text"] },
            { name: "year", dataType: ["text"] },
            { name: "importer", dataType: ["text"] },
            { name: "status", dataType: ["text"] },
        ]
    }).do();

    console.log("[Ingest] Schema created!");
};

const ingestData = async () => {
    try {
        console.log("=== Starting Job Ingestion (BM25 Mode) ===");
        await connectDB();
        console.log("[Ingest] MongoDB connected");

        await createSchema();

        const jobs = await JobModel.find({}).lean();
        console.log(`[Ingest] Found ${jobs.length} jobs`);

        // Batch insert
        let batcher = client.batch.objectsBatcher();
        let count = 0;

        for (const job of jobs) {
            const obj = {
                class: "JobContext",
                properties: {
                    text: formatJobToText(job),
                    job_no: String(job.job_no || ""),
                    year: String(job.year || ""),
                    importer: String(job.importer || ""),
                    status: String(job.status || ""),
                }
            };

            batcher = batcher.withObject(obj);
            count++;

            // Flush every 100 objects
            if (count % 100 === 0) {
                await batcher.do();
                batcher = client.batch.objectsBatcher();
                console.log(`[Ingest] Inserted ${count} jobs...`);
            }
        }

        // Flush remaining
        if (count % 100 !== 0) {
            await batcher.do();
        }

        console.log(`\n✅ Successfully ingested ${count} jobs into Weaviate!`);

    } catch (error) {
        console.error("[Ingest] Error:", error.message);
    } finally {
        process.exit();
    }
};

ingestData();
