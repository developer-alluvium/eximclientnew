import client from "../config/weaviateClient.js";

// Helper to format job into semantic text
export const formatJobToText = (job) => {
    const basicInfo = `Job Number ${job.job_no} (Year: ${job.year}) is a status '${job.status}' shipment for Importer ${job.importer}.`;

    let logistics = `It involves ${job.no_of_pkgs || '0'} packages with gross weight ${job.gross_weight || '0'} ${job.unit || ''}. `;
    if (job.vessel_flight) logistics += `Vessel: ${job.vessel_flight}. `;
    if (job.loading_port && job.port_of_reporting) logistics += `Route: ${job.loading_port} to ${job.port_of_reporting}. `;
    if (job.origin_country) logistics += `Origin: ${job.origin_country}. `;

    let containerInfo = "";
    if (job.container_nos && job.container_nos.length > 0) {
        // Handle both object array and string array if applicable, though schema says objects usually
        const containers = job.container_nos.map(c => c.container_number || c).join(", ");
        containerInfo = `Containers: ${containers}. `;
    }

    let financials = "";
    if (job.total_duty) financials += `Total Duty: ${job.total_duty}. `;

    return `${basicInfo} ${logistics} ${containerInfo} ${financials}`.replace(/\s+/g, " ").trim();
};

// Sync a single job to Weaviate (Upsert)
export const syncJobToWeaviate = async (job) => {
    try {
        console.log(`[AI Sync] Syncing Job ${job.job_no}...`);

        // Weaviate doesn't have a direct "update by field" in batch API easily without ID.
        // But we can delete and recreate, or use the object API if we have the UUID.
        // Since we didn't store Weaviate UUIDs in Mongo, we'll try to delete by job_no first to avoid duplicates.
        // OR better: Just use batch with consistent deterministic ID could work, but let's stick to delete-insert for safety without UUIDs.

        // 1. Delete existing (clean up old version)
        await client.batch
            .objectsBatchDeleter()
            .withClassName("JobContext")
            .withWhere({
                path: ["job_no"],
                operator: "Equal",
                valueText: String(job.job_no)
            })
            .do();

        // 2. Insert new
        const properties = {
            text: formatJobToText(job),
            job_no: String(job.job_no || ""),
            year: String(job.year || ""),
            importer: String(job.importer || ""),
            status: String(job.status || ""),
        };

        await client.data
            .creator()
            .withClassName("JobContext")
            .withProperties(properties)
            .do();

        console.log(`[AI Sync] Successfully synced Job ${job.job_no}`);
    } catch (error) {
        console.error(`[AI Sync] Error syncing job ${job.job_no}:`, error.message);
        // Don't block the main thread/response if AI sync fails
    }
};
