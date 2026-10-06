import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const fakeIeCode = "DEMO100001";
const demoCompanyNameRegex = /NOVUSHA DEMO/i;

async function moveDemoJobs() {
  const mainDbUri = process.env.PROD_MONGODB_URI || process.env.MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/exim";
  const exportDbUri = process.env.EXPORT_MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export";
  const gandhidhamDbUri = process.env.Gandhidham_URI;

  console.log("==================================================");
  console.log("🚀 STARTING MIGRATION OF DEMO CLIENT JOBS...");
  console.log("   Demo IE Code:", fakeIeCode);
  console.log("==================================================\n");

  // --- 1. MAIN DB (exim) ---
  console.log("1. Connecting to Main DB:", mainDbUri.replace(/:([^@]+)@/, ":****@"));
  const mainConn = await mongoose.createConnection(mainDbUri).asPromise();
  console.log("   Connected to Main DB successfully.");

  const importJobsColl = mainConn.collection("jobs");
  const demoImportJobsColl = mainConn.collection("demo_jobs");
  const exJobsColl = mainConn.collection("ex_jobs");
  const demoExJobsColl = mainConn.collection("demo_ex_jobs");

  // 1a. Move Import Jobs
  const importQuery = {
    $or: [
      { ie_code_no: fakeIeCode },
      { importer: demoCompanyNameRegex },
      { job_no: /^DEMO-IMP-/i },
      { job_number: /^DEMO-IMP-/i }
    ]
  };

  const demoImportDocs = await importJobsColl.find(importQuery).toArray();
  console.log(`   Found ${demoImportDocs.length} demo import job(s) in 'jobs' collection.`);

  if (demoImportDocs.length > 0) {
    // Insert into demo_jobs
    await demoImportJobsColl.deleteMany(importQuery);
    await demoImportJobsColl.insertMany(demoImportDocs);
    console.log(`   ✅ Copied ${demoImportDocs.length} import job(s) into 'demo_jobs' collection.`);

    // Remove from jobs
    const deleteImportRes = await importJobsColl.deleteMany(importQuery);
    console.log(`   ✅ Removed ${deleteImportRes.deletedCount} demo import job(s) from 'jobs' collection.`);
  } else {
    console.log("   ℹ️ No demo import jobs found in 'jobs' collection.");
  }

  // 1b. Move Export Jobs (ex_jobs)
  const exJobsQuery = {
    $or: [
      { ieCode: fakeIeCode },
      { iec_no: fakeIeCode },
      { exporter_ie_code: fakeIeCode },
      { exporter: demoCompanyNameRegex },
      { exporter_name: demoCompanyNameRegex },
      { job_no: /^AMD\/EXP\/SEA\/001/i },
      { job_number: /^AMD\/EXP\/SEA\/001/i }
    ]
  };

  const demoExDocs = await exJobsColl.find(exJobsQuery).toArray();
  console.log(`\n   Found ${demoExDocs.length} demo export job(s) in 'ex_jobs' collection.`);

  if (demoExDocs.length > 0) {
    await demoExJobsColl.deleteMany(exJobsQuery);
    await demoExJobsColl.insertMany(demoExDocs);
    console.log(`   ✅ Copied ${demoExDocs.length} export job(s) into 'demo_ex_jobs' collection.`);

    const deleteExRes = await exJobsColl.deleteMany(exJobsQuery);
    console.log(`   ✅ Removed ${deleteExRes.deletedCount} demo export job(s) from 'ex_jobs' collection.`);
  } else {
    console.log("   ℹ️ No demo export jobs found in 'ex_jobs' collection.");
  }

  // --- 2. EXPORT DB (export) ---
  console.log("\n2. Connecting to Export DB:", exportDbUri.replace(/:([^@]+)@/, ":****@"));
  let exportConn;
  try {
    exportConn = await mongoose.createConnection(exportDbUri).asPromise();
    console.log("   Connected to Export DB successfully.");

    const exportJobsColl = exportConn.collection("exportjobs");
    const demoExportJobsColl = exportConn.collection("demo_exportjobs");

    const exportDbQuery = {
      $or: [
        { ieCode: fakeIeCode },
        { iec_no: fakeIeCode },
        { exporter_ie_code: fakeIeCode },
        { exporter: demoCompanyNameRegex },
        { exporter_name: demoCompanyNameRegex },
        { job_no: /^AMD\/EXP\/SEA\/001/i },
        { job_number: /^AMD\/EXP\/SEA\/001/i }
      ]
    };

    const demoExportDocs = await exportJobsColl.find(exportDbQuery).toArray();
    console.log(`   Found ${demoExportDocs.length} demo export job(s) in 'exportjobs' collection.`);

    if (demoExportDocs.length > 0) {
      await demoExportJobsColl.deleteMany(exportDbQuery);
      await demoExportJobsColl.insertMany(demoExportDocs);
      console.log(`   ✅ Copied ${demoExportDocs.length} export job(s) into 'demo_exportjobs' collection.`);

      const deleteExportRes = await exportJobsColl.deleteMany(exportDbQuery);
      console.log(`   ✅ Removed ${deleteExportRes.deletedCount} demo export job(s) from 'exportjobs' collection.`);
    } else {
      console.log("   ℹ️ No demo export jobs found in 'exportjobs' collection.");
    }
  } catch (err) {
    console.error("   ❌ Error processing Export DB:", err.message);
  }

  // --- 3. GANDHIDHAM DB (if exists) ---
  if (gandhidhamDbUri && gandhidhamDbUri !== mainDbUri) {
    console.log("\n3. Connecting to Gandhidham DB:", gandhidhamDbUri.replace(/:([^@]+)@/, ":****@"));
    try {
      const gadhConn = await mongoose.createConnection(gandhidhamDbUri).asPromise();
      const gadhJobs = gadhConn.collection("jobs");
      const gadhDemoJobs = gadhConn.collection("demo_jobs");
      const gadhExJobs = gadhConn.collection("ex_jobs");
      const gadhDemoExJobs = gadhConn.collection("demo_ex_jobs");

      const gadhImportDocs = await gadhJobs.find(importQuery).toArray();
      if (gadhImportDocs.length > 0) {
        await gadhDemoJobs.deleteMany(importQuery);
        await gadhDemoJobs.insertMany(gadhImportDocs);
        await gadhJobs.deleteMany(importQuery);
        console.log(`   ✅ Moved ${gadhImportDocs.length} import job(s) in Gandhidham DB to 'demo_jobs'.`);
      }

      const gadhExDocs = await gadhExJobs.find(exJobsQuery).toArray();
      if (gadhExDocs.length > 0) {
        await gadhDemoExJobs.deleteMany(exJobsQuery);
        await gadhDemoExJobs.insertMany(gadhExDocs);
        await gadhExJobs.deleteMany(exJobsQuery);
        console.log(`   ✅ Moved ${gadhExDocs.length} export job(s) in Gandhidham DB to 'demo_ex_jobs'.`);
      }
      await gadhConn.close();
    } catch (err) {
      console.error("   ❌ Error checking Gandhidham DB:", err.message);
    }
  }

  // Close connections
  if (mainConn) await mainConn.close();
  if (exportConn) await exportConn.close();

  console.log("\n==================================================");
  console.log("🎉 MIGRATION COMPLETED SUCCESSFULLY!");
  console.log("==================================================\n");
}

moveDemoJobs().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
