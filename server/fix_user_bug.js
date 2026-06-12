import connectDB from "./config/db.js";
import EximclientUser from "./models/eximclientUserModel.js";

async function main() {
  await connectDB();
  
  // Find all users who have "SuperADmin" in their assignments
  const users = await EximclientUser.find({
    "ie_code_assignments.assigned_by_model": "SuperADmin"
  });

  console.log("Users to fix:", users.length);

  for (const user of users) {
    let changed = false;
    for (const assignment of user.ie_code_assignments) {
      if (assignment.assigned_by_model === "SuperADmin") {
        assignment.assigned_by_model = "SuperAdmin";
        changed = true;
      }
    }
    
    if (changed) {
      // Temporarily disable validation checks for this migration save
      // or we can just use save() since we corrected the invalid value
      await user.save();
      console.log(`Successfully fixed user: ${user.email}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
