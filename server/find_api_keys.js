import "./fix-dns.js";
import connectDB from "./config/db.js";
import mongoose from "mongoose";

async function main() {
  await connectDB();
  
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));

  const apiKeysCol = db.collection("apikeys");
  const keys = await apiKeysCol.find({}).toArray();
  console.log("\n--- API Keys in Database ---");
  for (const k of keys) {
    console.log(`Name: ${k.name}, Key: ${k.key}, isActive: ${k.isActive}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
