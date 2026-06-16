import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const pointSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'OpenPointProject', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    seq_id: { type: Number },
    unique_id: { type: String, index: true },

    // New Excel Fields
    responsibility: { type: String }, // Text name from Excel
    level: { type: String, enum: ['L1', 'L2', 'L3', 'L4', 'L5'], default: 'L2' },
    gap_action: String,
    review_date: String, // Keep as string for flexibility or Date
    remarks: String, // Current remarks

    // Legacy/Optional now
    department: { type: String, default: 'General' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Emergency', 'P1', 'P2', 'P3', 'P4'], default: 'Low' },
    status: { type: String, enum: ['Green', 'Yellow', 'Red', 'Orange'], default: 'Red' },
    target_date: { type: Date }, // Can be optional if not always known
    completion_date: { type: Date }, // Automatically set when status is Green

    responsible_person: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Opsional link to system user
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User who created the task

    evidence: [{
        file_url: String,
        uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploaded_at: { type: Date, default: Date.now }
    }],
    history: [{
        action: String,
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        remarks: String
    }]
});

pointSchema.plugin(auditPlugin, { documentType: "OpenPoint" });

const OpenPointModel = mongoose.model("OpenPoint", pointSchema);
export default OpenPointModel;
