import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

console.log("==================================================");
console.log("🚀 STARTING CHECKLIST NET WEIGHT FIX...");
console.log("==================================================\n");

// --- 1. PATCH ExportChecklistGenerator.js ---
const clientChecklistPath = "C:\\Users\\india\\Desktop\\projects\\Exim-Export\\client\\src\\components\\Export\\Export-Dsr\\StandardDocuments\\ExportChecklistGenerator.js";

if (fs.existsSync(clientChecklistPath)) {
  let content = fs.readFileSync(clientChecklistPath, "utf8");

  // Add formatWeightValue helper if not present
  if (!content.includes("const formatWeightValue =")) {
    const helperCode = `
const formatWeightValue = (value, unit = "KGS") => {
  if (value === null || value === undefined || value === "") return "";
  const rawStr = String(value).trim();
  if (!rawStr) return "";

  const match = rawStr.match(/^([0-9.,]+)\\s*([A-Za-z]+)?$/);
  if (!match) return rawStr;

  let num = parseFloat(match[1].replace(/,/g, ""));
  if (isNaN(num)) return rawStr;

  const targetUnit = (match[2] || unit || "KGS").toUpperCase().trim();

  // If unit is MT / MTS / TON / TONS:
  if (["MT", "MTS", "TON", "TONS", "T"].includes(targetUnit)) {
    // If num > 500, it was stored in KG (e.g. 25849.998 or 25850), convert to MT by dividing by 1000
    if (num > 500) {
      num = num / 1000;
    }
    const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
    return \`\${rounded.toFixed(3)} \${targetUnit}\`;
  }

  // If unit is KGS / KG / KILOGRAMS:
  if (["KGS", "KG", "KILOGRAMS", "KGS."].includes(targetUnit)) {
    const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
    return \`\${rounded.toFixed(3)} \${targetUnit}\`;
  }

  const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
  return \`\${rounded.toFixed(3)} \${targetUnit}\`;
};
`;
    // Insert after getCustomHouseCode definition
    content = content.replace("const getCustomHouseCode = (ch) => {", `${helperCode}\nconst getCustomHouseCode = (ch) => {`);
    console.log("   ✅ Added formatWeightValue helper to ExportChecklistGenerator.js");
  }

  // Update grossWeight and netWeight mapping
  const oldWeightMapping = `grossWeight: exportJob.gross_weight_kg
          ? \`\${exportJob.gross_weight_kg} \${exportJob.gross_weight_unit || "KGS"
          }\`
          : exportJob.containers
            ?.reduce((sum, c) => sum + (parseFloat(c.grossWeight) || 0), 0)
            .toFixed(3) + " KGS" || "0.000 KGS",
        netWeight: exportJob.net_weight_kg
          ? \`\${exportJob.net_weight_kg} \${exportJob.net_weight_unit || "KGS"}\`
          : allProducts
            ?.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0)
            .toFixed(3) + " KGS" || "0.000 KGS",`;

  const newWeightMapping = `grossWeight: formatWeightValue(
          exportJob.gross_weight_kg || exportJob.grossweightkg,
          exportJob.gross_weight_unit || "KGS"
        ) || (exportJob.containers?.length
          ? formatWeightValue(exportJob.containers.reduce((sum, c) => sum + (parseFloat(c.grossWeight) || 0), 0), "KGS")
          : "0.000 KGS"),
        netWeight: formatWeightValue(
          exportJob.net_weight_kg || exportJob.netweightkg,
          exportJob.net_weight_unit || "KGS"
        ) || (allProducts?.length
          ? formatWeightValue(allProducts.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0), "KGS")
          : "0.000 KGS"),`;

  if (content.includes(oldWeightMapping)) {
    content = content.replace(oldWeightMapping, newWeightMapping);
    fs.writeFileSync(clientChecklistPath, content, "utf8");
    console.log("   ✅ Updated grossWeight and netWeight calculation in ExportChecklistGenerator.js");
  } else {
    // Regex or partial replace if formatting differed
    const regexPattern = /grossWeight:\s*exportJob\.gross_weight_kg[\s\S]*?netWeight:\s*exportJob\.net_weight_kg[\s\S]*?\.toFixed\(3\)\s*\+\s*" KGS"\s*\|\|\s*"0\.000 KGS",/;
    if (regexPattern.test(content)) {
      content = content.replace(regexPattern, newWeightMapping);
      fs.writeFileSync(clientChecklistPath, content, "utf8");
      console.log("   ✅ Updated grossWeight and netWeight calculation via regex in ExportChecklistGenerator.js");
    } else {
      console.log("   ℹ️ ExportChecklistGenerator.js weight mapping already updated or structure differs.");
    }
  }
} else {
  console.log("   ⚠️ Client checklist path not found:", clientChecklistPath);
}

// --- 2. PATCH generateExportChecklist.mjs ---
const serverChecklistPath = "C:\\Users\\india\\Desktop\\projects\\Exim-Export\\server\\routes\\export-dsr\\generateExportChecklist.mjs";

if (fs.existsSync(serverChecklistPath)) {
  let serverContent = fs.readFileSync(serverChecklistPath, "utf8");

  if (!serverContent.includes("const formatWeight =")) {
    const serverHelper = `
const formatWeight = (value, unit = "KGS") => {
  if (value === null || value === undefined || value === "") return "";
  const rawStr = String(value).trim();
  if (!rawStr) return "";

  const match = rawStr.match(/^([0-9.,]+)\\s*([A-Za-z]+)?$/);
  if (!match) return rawStr;

  let num = parseFloat(match[1].replace(/,/g, ""));
  if (isNaN(num)) return rawStr;

  const targetUnit = (match[2] || unit || "KGS").toUpperCase().trim();

  if (["MT", "MTS", "TON", "TONS", "T"].includes(targetUnit)) {
    if (num > 500) {
      num = num / 1000;
    }
    const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
    return \`\${rounded.toFixed(3)} \${targetUnit}\`;
  }

  if (["KGS", "KG", "KILOGRAMS", "KGS."].includes(targetUnit)) {
    const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
    return \`\${rounded.toFixed(3)} \${targetUnit}\`;
  }

  const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
  return \`\${rounded.toFixed(3)} \${targetUnit}\`;
};
`;
    serverContent = serverContent.replace("const extractPrimaryJobNo = (input) => {", `${serverHelper}\nconst extractPrimaryJobNo = (input) => {`);
    console.log("   ✅ Added formatWeight helper to generateExportChecklist.mjs");
  }

  // Replace bad field references in Page 1 header/fields
  serverContent = serverContent
    .replace('`${exportJob.shippingbillnumber} dt ${exportJob.shippingbilldate}`', '`${exportJob.sb_no || exportJob.shippingbillnumber || ""} dt ${exportJob.sb_date || exportJob.shippingbilldate || ""}`')
    .replace('exportJob.consigneename', 'exportJob.consignees?.[0]?.consignee_name || exportJob.consigneename || ""')
    .replace('exportJob.portofdischarge', 'exportJob.port_of_discharge || exportJob.portofdischarge || ""')
    .replace('`${exportJob.grossweightkg || 0}.000 KGS`', 'formatWeight(exportJob.gross_weight_kg || exportJob.grossweightkg, exportJob.gross_weight_unit || "KGS")')
    .replace('exportJob.countryoffinaldestination', 'exportJob.destination_country || exportJob.countryoffinaldestination || ""')
    .replace('exportJob.consigneeaddress', 'exportJob.consignees?.[0]?.consignee_address || exportJob.consigneeaddress || ""')
    .replace('exportJob.portofloading', 'exportJob.port_of_loading || exportJob.portofloading || ""')
    .replace('exportJob.loosepkgs', 'exportJob.loose_pkgs || exportJob.loosepkgs || ""')
    .replace('`${exportJob.netweightkg || 0}.000 KGS`', 'formatWeight(exportJob.net_weight_kg || exportJob.netweightkg, exportJob.net_weight_unit || "KGS")')
    .replace('exportJob.noofcontainers', 'exportJob.no_of_containers || exportJob.noofcontainers || ""')
    .replace('exportJob.iecNo', 'exportJob.ieCode || exportJob.iecNo || ""')
    .replace('exportJob.exporterName', 'exportJob.exporter || exportJob.exporterName || ""')
    .replace('exportJob.branchcode', 'exportJob.branch_code || exportJob.branchcode || ""')
    .replace('exportJob.exporterAddress', 'exportJob.exporter_address || exportJob.exporterAddress || ""');

  fs.writeFileSync(serverChecklistPath, serverContent, "utf8");
  console.log("   ✅ Updated field mappings and weight formatting in generateExportChecklist.mjs");
} else {
  console.log("   ⚠️ Server checklist path not found:", serverChecklistPath);
}

// --- 3. PATCH ShipmentMaintab.js ---
const shipmentTabPath = "C:\\Users\\india\\Desktop\\projects\\Exim-Export\\client\\src\\components\\Export\\Export-Dsr\\Shipment\\ShipmentMaintab.js";

if (fs.existsSync(shipmentTabPath)) {
  let tabContent = fs.readFileSync(shipmentTabPath, "utf8");
  tabContent = tabContent.replace(
    'handleFieldChange("net_weight_kg", val.toFixed(3));',
    'const rounded = Math.round((val + Number.EPSILON) * 1000) / 1000;\n                        handleFieldChange("net_weight_kg", rounded.toFixed(3));'
  ).replace(
    'handleFieldChange("gross_weight_kg", val.toFixed(3));',
    'const rounded = Math.round((val + Number.EPSILON) * 1000) / 1000;\n                        handleFieldChange("gross_weight_kg", rounded.toFixed(3));'
  );
  fs.writeFileSync(shipmentTabPath, tabContent, "utf8");
  console.log("   ✅ Updated onBlur float rounding in ShipmentMaintab.js");
}

// --- 4. CLEANUP EXISTING DB RECORDS WITH FLOAT INACCURACIES ---
async function fixDbWeightArtifacts() {
  const mainDbUri = process.env.PROD_MONGODB_URI || process.env.MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/exim";
  const exportDbUri = process.env.EXPORT_MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export";

  console.log("\nChecking database records for float weight artifacts...");
  try {
    const exportConn = await mongoose.createConnection(exportDbUri).asPromise();
    const exportJobsColl = exportConn.collection("exportjobs");

    // Find jobs where net_weight_kg or gross_weight_kg has > 3 decimal digits or floating noise like .998, .999, .000000
    const cursor = exportJobsColl.find({
      $or: [
        { net_weight_kg: { $regex: /\.\d{4,}/ } },
        { gross_weight_kg: { $regex: /\.\d{4,}/ } },
        { net_weight_kg: { $regex: /99[89]$/ } },
        { gross_weight_kg: { $regex: /99[89]$/ } }
      ]
    });

    const jobsToFix = await cursor.toArray();
    console.log(`   Found ${jobsToFix.length} export job(s) in database with float weight precision artifacts.`);

    let fixedCount = 0;
    for (const job of jobsToFix) {
      const updates = {};

      if (job.net_weight_kg) {
        const num = parseFloat(String(job.net_weight_kg).replace(/,/g, ""));
        if (!isNaN(num)) {
          const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
          updates.net_weight_kg = rounded.toFixed(3);
        }
      }

      if (job.gross_weight_kg) {
        const num = parseFloat(String(job.gross_weight_kg).replace(/,/g, ""));
        if (!isNaN(num)) {
          const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
          updates.gross_weight_kg = rounded.toFixed(3);
        }
      }

      if (Object.keys(updates).length > 0) {
        await exportJobsColl.updateOne({ _id: job._id }, { $set: updates });
        fixedCount++;
      }
    }

    console.log(`   ✅ Cleaned up ${fixedCount} database record(s).`);
    await exportConn.close();
  } catch (err) {
    console.error("   ❌ Error cleaning database weight records:", err.message);
  }
}

fixDbWeightArtifacts().then(() => {
  console.log("\n==================================================");
  console.log("🎉 CHECKLIST WEIGHT FIX COMPLETED!");
  console.log("==================================================\n");
}).catch(err => {
  console.error("Error running fix:", err);
  process.exit(1);
});
