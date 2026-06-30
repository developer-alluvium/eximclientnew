import dns from 'dns';
import mongoose from "mongoose";

// Apply DNS Fix
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log('DNS servers set to Google DNS (8.8.8.8)');
} catch (error) {
    console.error('Failed to force DNS servers:', error.message);
}

const mongoUri = "mongodb+srv://react_db_user:m5o1X7QnWdAKeuu5@cluster0.tcmfe6d.mongodb.net/exim";

async function run() {
    try {
        console.log("Connecting to:", mongoUri);
        await mongoose.connect(mongoUri);
        console.log("Connected successfully!");

        const db = mongoose.connection.db;
        const userCollection = db.collection("eximclientusers");

        const allUsers = await userCollection.find({}).toArray();
        console.log(`Found ${allUsers.length} users:`);
        for (const u of allUsers) {
            console.log(`User: ${u.email}`);
            console.log(`ie_code_no: ${u.ie_code_no}`);
            console.log(`ie_code_assignments:`, JSON.stringify(u.ie_code_assignments, null, 2));
        }

    } catch (err) {
        console.error("Error during run:", err);
    } finally {
        await mongoose.connection.close();
    }
}

run();
