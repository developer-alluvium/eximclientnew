import "./fix-dns.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import EximclientUser from "./models/eximclientUserModel.js";

async function main() {
  await connectDB();

  const emails = ["punit@alluvium.in", "manu@surajforwarders.com"];
  const backups = [];

  for (const email of emails) {
    const rawUser = await EximclientUser.findOne({ email }).lean();
    if (!rawUser) {
      console.error(`ERROR: User ${email} not found in database! Recreate aborted.`);
      process.exit(1);
    }
    backups.push(rawUser);
  }

  // Ensure scratch directory exists
  const scratchDir = "./scratch";
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  // Save backups to JSON file
  const backupPath = path.join(scratchDir, "users_backup.json");
  fs.writeFileSync(backupPath, JSON.stringify(backups, null, 2));
  console.log(`✅ Backed up original documents to: ${backupPath}`);

  // Process and clean each user
  const cleanedDocs = backups.map(user => {
    console.log(`Processing user: ${user.email}`);

    // Helper to convert string IDs/dates to BSON
    const toObjectId = (val) => {
      if (!val) return null;
      if (typeof val === "object" && val.$oid) return new mongoose.Types.ObjectId(val.$oid);
      return new mongoose.Types.ObjectId(val);
    };

    const toDate = (val) => {
      if (!val) return null;
      if (typeof val === "object" && val.$date) return new Date(val.$date);
      return new Date(val);
    };

    const cleanAssignment = (assignment) => {
      const cleaned = { ...assignment };
      
      // Fix IDs and Dates
      if (cleaned.assigned_by) cleaned.assigned_by = toObjectId(cleaned.assigned_by);
      if (cleaned.assigned_at) cleaned.assigned_at = toDate(cleaned.assigned_at);

      // Fix invalid "SuperADmin" typo
      if (cleaned.assigned_by_model === "SuperADmin") {
        console.log(`  -> Fixing assignment model typo "SuperADmin" to "SuperAdmin" for IE: ${cleaned.ie_code_no}`);
        cleaned.assigned_by_model = "SuperAdmin";
      }

      return cleaned;
    };

    const cleanedUser = {
      ...user,
      _id: toObjectId(user._id),
      adminId: user.adminId ? toObjectId(user.adminId) : undefined,
      verifiedBy: user.verifiedBy ? toObjectId(user.verifiedBy) : undefined,
      lastLogin: user.lastLogin ? toDate(user.lastLogin) : null,
      lastLogout: user.lastLogout ? toDate(user.lastLogout) : null,
      lockUntil: user.lockUntil ? toDate(user.lockUntil) : null,
      verificationDate: user.verificationDate ? toDate(user.verificationDate) : null,
      emailVerificationTokenExpires: user.emailVerificationTokenExpires ? toDate(user.emailVerificationTokenExpires) : null,
      passwordResetExpires: user.passwordResetExpires ? toDate(user.passwordResetExpires) : null,
      createdAt: toDate(user.createdAt),
      updatedAt: toDate(user.updatedAt)
    };

    if (Array.isArray(cleanedUser.ie_code_assignments)) {
      cleanedUser.ie_code_assignments = cleanedUser.ie_code_assignments.map(cleanAssignment);
    }
    if (Array.isArray(cleanedUser.exporter_ie_code_assignments)) {
      cleanedUser.exporter_ie_code_assignments = cleanedUser.exporter_ie_code_assignments.map(cleanAssignment);
    }

    if (Array.isArray(cleanedUser.documents)) {
      cleanedUser.documents = cleanedUser.documents.map(doc => ({
        ...doc,
        uploadDate: toDate(doc.uploadDate),
        expirationDate: doc.expirationDate ? toDate(doc.expirationDate) : null
      }));
    }

    return cleanedUser;
  });

  // Perform Delete and Insert
  for (const doc of cleanedDocs) {
    const email = doc.email;
    const id = doc._id;

    console.log(`Deleting user from DB: ${email} (${id})`);
    const deleteResult = await EximclientUser.deleteOne({ _id: id });
    console.log(`Deleted count: ${deleteResult.deletedCount}`);

    console.log(`Re-inserting user directly into DB: ${email}`);
    // Using collection.insertOne to bypass all Mongoose schema validation/pre-hooks (retaining original hashed password)
    const insertResult = await EximclientUser.collection.insertOne(doc);
    console.log(`Insert successful! Inserted ID: ${insertResult.insertedId}`);
  }

  console.log("✅ All user recreate operations completed successfully!");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
