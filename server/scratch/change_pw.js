import dns from 'dns';
import mongoose from "mongoose";
import dotenv from "dotenv";
import EximclientUser from "../models/eximclientUserModel.js";

try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log('DNS servers set to Google DNS (8.8.8.8)');
} catch (error) {
    console.error('Failed to force DNS servers:', error.message);
}

dotenv.config({ path: "../.env" });

const run = async () => {
  const mongoURI = "mongodb+srv://react_db_user:m5o1X7QnWdAKeuu5@cluster0.tcmfe6d.mongodb.net/exim";
  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected successfully.");

    const email = "punit@alluvium.in";
    const user = await EximclientUser.findOne({ email: email });
    if (!user) {
      console.error(`User ${email} not found!`);
      process.exit(1);
    }

    // Set the password directly as the original bcrypt hash
    // (since it starts with $2b$, mongoose's save pre-save hook won't double hash it if it's already a hash,
    // or let's verify if the model hashes it in pre-save by checking the model code first, OR let's just do updateOne directly
    // to bypass mongoose pre-save hooks and prevent double hashing of the bcrypt string!)
    await EximclientUser.updateOne(
      { _id: user._id },
      { $set: { password: "$2b$12$om/bU2QYFjzxO0vaPoSmc.HAPfx4bPheevatycCI2tAaz74kwFqUK" } }
    );
    
    console.log(`✅ Password for ${email} restored successfully!`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.connection.close();
    console.log("Connection closed.");
  }
};

run();
