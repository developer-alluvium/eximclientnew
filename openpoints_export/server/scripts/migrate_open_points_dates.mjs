import mongoose from "mongoose";
import dotenv from "dotenv";
import OpenPoint from "../model/openPoints/openPointModel.mjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function migrate() {
    try {
        console.log(`Connecting to: ${MONGODB_URI}`);
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB for migration...");

        // Find all Green points where completion_date is missing or null
        const greenPoints = await OpenPoint.find({ 
            status: "Green", 
            $or: [
                { completion_date: { $exists: false } },
                { completion_date: null }
            ]
        });

        console.log(`Found ${greenPoints.length} Green points without completion_date.`);

        let count = 0;
        for (const point of greenPoints) {
            // Use target_date as completion_date, or current date if target_date is null
            point.completion_date = point.target_date || new Date();
            await point.save();
            count++;
            if (count % 10 === 0) console.log(`Migrated ${count} points...`);
        }

        console.log(`Migration complete. Updated ${count} points.`);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
