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
        const orgCollection = db.collection("organisations");

        const allOrgs = await orgCollection.find({}, { projection: { name: 1, ieCodeNo: 1, gstin: 1 } }).toArray();
        console.log(`Found ${allOrgs.length} organisations:`);
        console.log(JSON.stringify(allOrgs, null, 2));

        const targetOrg = await orgCollection.findOne({ ieCodeNo: "AAHCB5082B" });
        console.log("\nQuery for ieCodeNo 'AAHCB5082B':", targetOrg);

    } catch (err) {
        console.error("Error during run:", err);
    } finally {
        await mongoose.connection.close();
    }
}

run();
