import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";
const Schema = mongoose.Schema;

const projectSchema = new Schema({
    name: { type: String, required: true },
    initials: { type: String, uppercase: true, trim: true, index: true },
    description: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Active', 'Archived'], default: 'Active' },
    team_members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['L1', 'L2', 'L3', 'L4'] },
        department: { type: String }
    }],
    created_at: { type: Date, default: Date.now },
});

projectSchema.plugin(auditPlugin, { documentType: "OpenPointProject" });

const OpenPointProjectModel = mongoose.model("OpenPointProject", projectSchema);
export default OpenPointProjectModel;
