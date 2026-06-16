import mongoose from "mongoose";
import dotenv from "dotenv";
import OpenPointProject from "../model/openPoints/openPointProjectModel.mjs";
import OpenPoint from "../model/openPoints/openPointModel.mjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/eximNew";

// Helper to generate initials from a name
function generateInitials(name) {
    if (!name) return "OP";
    const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, ""); // Keep alphanumeric and spaces
    const words = cleanName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
        return words[0].substring(0, 3).toUpperCase();
    }
    // Take first letter of each word
    let initials = words.map(w => w[0]).join("").toUpperCase();
    if (initials.length < 2) {
        initials = words[0].substring(0, 3).toUpperCase();
    }
    return initials;
}

// Helper to get a unique initials string across all projects
async function getUniqueInitials(projectName, projectId = null) {
    let baseInitials = generateInitials(projectName);
    let initials = baseInitials;
    let counter = 1;
    while (true) {
        const query = { initials };
        if (projectId) {
            query._id = { $ne: projectId };
        }
        const existing = await OpenPointProject.findOne(query);
        if (!existing) {
            return initials;
        }
        counter++;
        initials = `${baseInitials}${counter}`;
    }
}

async function migrate() {
    try {
        console.log(`Connecting to: ${MONGODB_URI}`);
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB for migration...");

        // 1. Fetch all projects
        const projects = await OpenPointProject.find({});
        console.log(`Found ${projects.length} projects to check/migrate.`);

        let projectCount = 0;
        let pointCount = 0;

        for (const project of projects) {
            let initialsChanged = false;
            if (!project.initials) {
                const uniqueInit = await getUniqueInitials(project.name, project._id);
                project.initials = uniqueInit;
                await project.save();
                initialsChanged = true;
                projectCount++;
                console.log(`Assigned initials "${uniqueInit}" to project "${project.name}"`);
            } else {
                console.log(`Project "${project.name}" already has initials "${project.initials}"`);
            }

            // 2. Fetch all points for this project, sorted by _id (oldest first)
            const points = await OpenPoint.find({ project_id: project._id }).sort({ _id: 1 });
            console.log(`  Project has ${points.length} open points.`);

            let seq = 1;
            for (const point of points) {
                // We update all points to ensure they have correct sequential values
                point.seq_id = seq;
                point.unique_id = `${project.initials}-${seq}`;
                await point.save();
                seq++;
                pointCount++;
            }
            console.log(`  Successfully migrated/verified sequential IDs for project "${project.name}" (Initials: "${project.initials}")`);
        }

        console.log(`\nMigration Completed Successfully!`);
        console.log(`Total projects assigned new initials: ${projectCount}`);
        console.log(`Total open points migrated: ${pointCount}`);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
