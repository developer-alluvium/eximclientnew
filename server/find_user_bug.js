import connectDB from "./config/db.js";
import EximclientUser from "./models/eximclientUserModel.js";

async function main() {
  await connectDB();
  const users = await EximclientUser.find({
    "ie_code_assignments.assigned_by_model": "SuperADmin"
  });
  console.log("Found users count:", users.length);
  for (const u of users) {
    console.log("User:", u.username, u.email);
    console.log("Assignments:", u.ie_code_assignments);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
