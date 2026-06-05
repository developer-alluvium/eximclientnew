import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import EximclientUser from "./models/eximclientUserModel.js";

// Load environment variables
dotenv.config();

const run = async () => {
  const mongoURI = process.env.PROD_MONGODB_URI;
  if (!mongoURI) {
    console.error("PROD_MONGODB_URI is not defined in .env!");
    process.exit(1);
  }

  console.log("Connecting to production MongoDB...");
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected successfully to production database.");

    const usersToRegister = [
      { name: "Trade Ops", email: "tradeops@astonprocessors.com" },
      { name: "Priyanka Gupta", email: "priyanka.gupta@astonprocessors.com" },
      { name: "Dipesh Gaikar", email: "dipesh.gaikar@astonprocessors.com" },
      { name: "Haresh Arde", email: "haresh.arde@astonprocessors.com" },
      { name: "Anshu Jain", email: "anshu.jain@astonprocessors.com" }
    ];

    const passwordPlain = "12345678";

    for (const u of usersToRegister) {
      console.log(`\nProcessing user: ${u.name} <${u.email}>`);
      let user = await EximclientUser.findOne({ email: u.email.toLowerCase() });

      const ieCodeAssignment = {
        ie_code_no: "AASCA3099E",
        importer_name: "ZECO GREEN LIMITED",
        assigned_at: new Date("2026-02-20T13:10:26.323Z"),
        assigned_by: new mongoose.Types.ObjectId("68512c69881317b9c8da1165"),
        assigned_by_model: "SuperAdmin"
      };

      if (user) {
        console.log(`User already exists (ID: ${user._id}). Updating...`);
        user.name = u.name;
        user.password = passwordPlain; // triggers bcrypt hash on save
        user.emailVerified = true;
        user.verifiedEmail = true;
        user.isActive = true;
        user.status = "active";
        user.assignedModules = ["/importdsr", "/elock"];
        user.ie_code_assignments = [ieCodeAssignment];
        
        await user.save();
        console.log(`✅ User ${u.email} updated successfully!`);
      } else {
        console.log("Creating new user...");
        user = new EximclientUser({
          name: u.name,
          email: u.email.toLowerCase(),
          password: passwordPlain, // triggers bcrypt hash on save
          emailVerified: true,
          verifiedEmail: true,
          isActive: true,
          status: "active",
          role: "user",
          assignedModules: ["/importdsr", "/elock"],
          ie_code_assignments: [ieCodeAssignment]
        });

        await user.save();
        console.log(`✅ User ${u.email} created successfully!`);
      }
    }
  } catch (err) {
    console.error("Error running registration script:", err);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
};

run();
