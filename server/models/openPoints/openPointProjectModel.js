import mongoose from "mongoose";
const Schema = mongoose.Schema;

const projectSchema = new Schema({
    name: { type: String, required: true },
    initials: { type: String, uppercase: true, trim: true, index: true },
    description: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'EximclientUser', required: true },
    status: { type: String, enum: ['Active', 'Archived'], default: 'Active' },
    team_members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'EximclientUser' },
        role: { type: String, enum: ['L1', 'L2', 'L3', 'L4'] },
        department: { type: String }
    }],
    created_at: { type: Date, default: Date.now },
});

const OpenPointProjectModel = mongoose.model("OpenPointProject", projectSchema);
export default OpenPointProjectModel;
